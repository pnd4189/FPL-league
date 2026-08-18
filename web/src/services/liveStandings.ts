import { ClassicStanding, H2HStanding, LiveGwData } from '../types';

export interface MonthRange {
  name: string;
  range: string;
  gws: number[];
}

/**
 * Fold provisional gameweek points into the Classic table.
 *
 * The merge replaces the gameweek cell rather than adding to the total, so it
 * stays correct whether or not the backend has already settled that gameweek.
 */
export function mergeLiveClassic(standings: ClassicStanding[], live: LiveGwData | null): ClassicStanding[] {
  if (!live || live.isPreSeason || !live.scores.length) return standings;

  const byId = new Map(live.scores.map(s => [s.id, s]));
  const index = live.gw - 1;
  if (index < 0 || index > 37) return standings;

  const merged = standings.map(row => {
    const score = byId.get(row.id);
    if (!score) return row;

    const previous = row.scores[index];
    if (previous === score.netPoints) return row;

    const scores = row.scores.slice();
    scores[index] = score.netPoints;

    const total = row.total - (previous ?? 0) + score.netPoints;
    const playedCount = scores.filter(s => s !== null).length;
    const best = scores.reduce(
      (acc, pts, i) => (pts !== null && pts > acc.pts ? { gw: i + 1, pts } : acc),
      { gw: 1, pts: 0 },
    );

    return {
      ...row,
      scores,
      total,
      average: playedCount > 0 ? Math.round((total / playedCount) * 10) / 10 : 0,
      bestGW: best,
    };
  });

  return rerank(merged);
}

/** Re-sort by total and hand out ranks, giving equal totals the same rank. */
function rerank(rows: ClassicStanding[]): ClassicStanding[] {
  const sorted = rows.slice().sort((a, b) => b.total - a.total);
  let rank = 0;
  let previousTotal: number | null = null;
  return sorted.map((row, i) => {
    if (previousTotal === null || row.total !== previousTotal) rank = i + 1;
    previousTotal = row.total;
    return { ...row, rank };
  });
}

/**
 * Fold provisional head-to-head results into the H2H table.
 *
 * Only applied while the gameweek is still running: once FPL finalises it the
 * backend's own standings already contain the result, and adding it again
 * would double-count.
 */
export function mergeLiveH2H(standings: H2HStanding[], live: LiveGwData | null): H2HStanding[] {
  if (!live || !live.isLive || !live.h2h.length) return standings;

  const delta = new Map<number, { pts: number; for: number; against: number; w: number; d: number; l: number }>();
  const record = (id: number, own: number, opponent: number, h2hPts: number) => {
    if (!id) return;
    delta.set(id, {
      pts: h2hPts,
      for: own,
      against: opponent,
      w: h2hPts === 3 ? 1 : 0,
      d: h2hPts === 1 ? 1 : 0,
      l: h2hPts === 0 ? 1 : 0,
    });
  };

  for (const fixture of live.h2h) {
    record(fixture.homeId, fixture.homePoints, fixture.awayPoints, fixture.homeH2HPoints);
    record(fixture.awayId, fixture.awayPoints, fixture.homePoints, fixture.awayH2HPoints);
  }

  const merged = standings.map(row => {
    const d = delta.get(row.id);
    if (!d) return row;
    const pointsFor = row.pointsFor + d.for;
    const pointsAgainst = row.pointsAgainst + d.against;
    return {
      ...row,
      played: row.played + 1,
      won: row.won + d.w,
      drawn: row.drawn + d.d,
      lost: row.lost + d.l,
      pointsFor,
      pointsAgainst,
      goalDifference: pointsFor - pointsAgainst,
      points: row.points + d.pts,
    };
  });

  // FPL ranks H2H on points, then points-for as the tiebreak.
  const sorted = merged.sort((a, b) => b.points - a.points || b.pointsFor - a.pointsFor);
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

/** The month bucket containing a gameweek, defaulting to the first month. */
export function monthOfGw(gw: number, months: MonthRange[]): MonthRange {
  return months.find(m => m.gws.includes(gw)) || months[0];
}

/**
 * How often to re-poll live scores. Matches move the table minute by minute;
 * outside a match window nothing changes, so back right off.
 */
export function livePollInterval(live: LiveGwData | null): number {
  if (!live || live.isPreSeason) return 15 * 60 * 1000;
  if (live.inPlay) return 60 * 1000;
  if (live.isLive) return 5 * 60 * 1000;
  return 15 * 60 * 1000;
}
