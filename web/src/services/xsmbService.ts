/**
 * XSMB (Vietnamese northern lottery) analysis service.
 *
 * Fetches 2-digit result data from the public GitHub repository
 * https://github.com/khiemdoan/vietnam-lottery-xsmb-analysis
 * and provides frequency analysis utilities for the Lucky Numbers feature.
 *
 * Only used by managers Shark Lâm (4403856) and Đại (1860254).
 */

import type { H2HScheduleRow, LiveGwData } from '../types';
import { currentRoundH2H } from './liveStandings';

const XSMB_CSV_URL =
  'https://raw.githubusercontent.com/khiemdoan/vietnam-lottery-xsmb-analysis/refs/heads/main/data/xsmb-2-digits.csv';

/** Eligible manager IDs for the Lucky Numbers feature. */
export const LUCKY_MANAGER_IDS = [4403856, 1860254] as const;

export function isLuckyEligible(managerId: number): boolean {
  return (LUCKY_MANAGER_IDS as readonly number[]).includes(managerId);
}

/**
 * A manager's most recent H2H match that has a real score. The schedule marks a gameweek
 * as played from its deadline, when it still reads 0–0, so a match nobody has scored in yet
 * is skipped and the previous gameweek stays the latest result.
 */
export function latestScoredMatch(
  schedule: H2HScheduleRow[],
  managerId: number,
): { gw: number; mine: number; opp: number; oppId: number } | null {
  const latest = schedule
    .filter(
      (m) =>
        m.played &&
        (m.homePts > 0 || m.awayPts > 0) &&
        (m.homeId === managerId || m.awayId === managerId),
    )
    .sort((a, b) => b.gw - a.gw)[0];
  if (!latest) return null;
  const isHome = latest.homeId === managerId;
  return {
    gw: latest.gw,
    mine: isHome ? latest.homePts : latest.awayPts,
    opp: isHome ? latest.awayPts : latest.homePts,
    oppId: isHome ? latest.awayId : latest.homeId,
  };
}

/**
 * The H2H result the lucky numbers are taken from. The round the H2H tab is showing comes from the same
 * live payload as that tab: FPL's league endpoint (the schedule) lags a running round by hours, so using it
 * there showed a different score from the tab. The schedule only supplies earlier rounds, or everything when
 * the live payload is unavailable (which is also what the H2H tab falls back to).
 */
export function latestH2HResult(
  managerId: number,
  live: LiveGwData | null,
  schedule: H2HScheduleRow[] | null,
): { gw: number; mine: number; opp: number; oppId: number; provisional: boolean } | null {
  const round = currentRoundH2H(managerId, live);
  if (round && (round.mine > 0 || round.opp > 0)) {
    return { gw: round.gw, mine: round.mine, opp: round.opp, oppId: round.oppId, provisional: round.isLive };
  }
  const rows = (schedule ?? []).filter((m) => !round || m.gw < round.gw);
  const earlier = latestScoredMatch(rows, managerId);
  return earlier && { ...earlier, provisional: false };
}

export interface XsmbDay {
  date: string; // YYYY-MM-DD
  digits: number[]; // 27 two-digit numbers (00–99) per draw
}

export interface FrequencyEntry {
  number: number;
  countYesterday: number; // appeared yesterday (0 or 1+)
  count1w: number; // appearances in last 7 days
  count2w: number; // last 14 days
  count3w: number; // last 21 days
  count1m: number; // last 30 days
}

export interface LuckyAnalysis {
  /** The two H2H score digits used as seeds. */
  seedPair: [number, number];
  /** Whether the seed pair appeared in recent draws. */
  seedHit1w: boolean;
  seedHit2w: boolean;
  seedHit1m: boolean;
  /** Frequency stats for seed numbers. */
  seedFrequency: FrequencyEntry[];
  /** AI-suggested related lucky numbers with frequency stats. */
  related: FrequencyEntry[];
  /** Date range of data used. */
  dataFrom: string;
  dataTo: string;
  /** Total draw days in the dataset window (last 30 days). */
  totalDays: number;
}

// ─── Data fetching ───────────────────────────────────────────────────────────

let csvCache: XsmbDay[] | null = null;
let csvFetchedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

async function fetchXsmbData(): Promise<XsmbDay[]> {
  const now = Date.now();
  if (csvCache && now - csvFetchedAt < CACHE_TTL_MS) return csvCache;

  const res = await fetch(XSMB_CSV_URL);
  if (!res.ok) throw new Error(`XSMB fetch failed: ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  // First line is header: date,special,prize1,...prize7_4
  const rows: XsmbDay[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].trim().split(',');
    if (cols.length < 28) continue;
    rows.push({
      date: cols[0],
      digits: cols.slice(1).map(Number),
    });
  }

  csvCache = rows;
  csvFetchedAt = now;
  return rows;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string, refDate: Date): number {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((refDate.getTime() - d.getTime()) / 86400000);
}

function countAppearances(
  digit: number,
  rows: XsmbDay[],
  maxDaysAgo: number,
  refDate: Date,
): number {
  let count = 0;
  for (const row of rows) {
    if (daysAgo(row.date, refDate) > maxDaysAgo) continue;
    if (daysAgo(row.date, refDate) < 0) continue;
    if (row.digits.includes(digit)) count++;
  }
  return count;
}

function buildFrequency(digit: number, rows: XsmbDay[], refDate: Date): FrequencyEntry {
  return {
    number: digit,
    countYesterday: countAppearances(digit, rows, 1, refDate),
    count1w: countAppearances(digit, rows, 7, refDate),
    count2w: countAppearances(digit, rows, 14, refDate),
    count3w: countAppearances(digit, rows, 21, refDate),
    count1m: countAppearances(digit, rows, 30, refDate),
  };
}

/**
 * Derive related numbers from an H2H score pair.
 *
 * Strategy:
 * 1. Reversed pair (e.g. 45 → 54)
 * 2. Sum mod 100 and difference
 * 3. Mirror numbers (e.g. 45 → 55, 44)
 * 4. Neighbors (±1 for each digit)
 * 5. Top-frequency numbers from the last 7 days that share a digit
 *    with either seed number
 *
 * Returns up to 8 unique related numbers (excluding the seeds themselves).
 */
function deriveRelated(
  seedA: number,
  seedB: number,
  rows: XsmbDay[],
  refDate: Date,
): number[] {
  const candidates = new Set<number>();

  // Reversed digits
  const revA = Number(String(seedA).padStart(2, '0').split('').reverse().join(''));
  const revB = Number(String(seedB).padStart(2, '0').split('').reverse().join(''));
  candidates.add(revA);
  candidates.add(revB);

  // Sum and difference
  candidates.add((seedA + seedB) % 100);
  candidates.add(Math.abs(seedA - seedB));

  // Mirror numbers (repeat each digit)
  const aStr = String(seedA).padStart(2, '0');
  const bStr = String(seedB).padStart(2, '0');
  candidates.add(Number(aStr[0] + aStr[0]));
  candidates.add(Number(aStr[1] + aStr[1]));
  candidates.add(Number(bStr[0] + bStr[0]));
  candidates.add(Number(bStr[1] + bStr[1]));

  // Neighbors ±1
  candidates.add((seedA + 1) % 100);
  candidates.add((seedA + 99) % 100); // -1 mod 100
  candidates.add((seedB + 1) % 100);
  candidates.add((seedB + 99) % 100);

  // Remove seeds themselves
  candidates.delete(seedA);
  candidates.delete(seedB);

  // Score by recent frequency and pick top 8
  const scored = [...candidates].map((n) => ({
    n,
    freq: countAppearances(n, rows, 7, refDate),
  }));
  scored.sort((a, b) => b.freq - a.freq);
  return scored.slice(0, 8).map((s) => s.n);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyze lucky numbers for a manager based on their current H2H score pair.
 *
 * @param homeScore — the manager's FPL points in the current/latest H2H match
 * @param awayScore — the opponent's FPL points in the same match
 * @returns Full analysis with seed frequency + related numbers + stats
 */
export async function analyzeLuckyNumbers(
  homeScore: number,
  awayScore: number,
): Promise<LuckyAnalysis> {
  const rows = await fetchXsmbData();
  const refDate = new Date();

  // Seed pair = last 2 digits of each score
  const seedA = homeScore % 100;
  const seedB = awayScore % 100;

  // Filter to last 30 days
  const recent = rows.filter(
    (r) => daysAgo(r.date, refDate) >= 0 && daysAgo(r.date, refDate) <= 30,
  );

  // Seed frequency
  const seedFrequency = [seedA, seedB].map((d) => buildFrequency(d, recent, refDate));

  // Seed hit checks
  const seedHit1w = seedFrequency.some((f) => f.count1w > 0);
  const seedHit2w = seedFrequency.some((f) => f.count2w > 0);
  const seedHit1m = seedFrequency.some((f) => f.count1m > 0);

  // Related numbers
  const relatedDigits = deriveRelated(seedA, seedB, recent, refDate);
  const related = relatedDigits.map((d) => buildFrequency(d, recent, refDate));

  const dates = recent.map((r) => r.date).sort();

  return {
    seedPair: [seedA, seedB],
    seedHit1w,
    seedHit2w,
    seedHit1m,
    seedFrequency,
    related,
    dataFrom: dates[0] || '',
    dataTo: dates[dates.length - 1] || '',
    totalDays: recent.length,
  };
}
