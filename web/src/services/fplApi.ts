import {
  ClassicStanding,
  H2HStanding,
  WeeklyWinner,
  MonthlyAward,
  LeagueDashboardData,
  LiveGwData,
} from '../types';
import {
  INITIAL_CLASSIC_STANDINGS,
  INITIAL_H2H_STANDINGS,
  INITIAL_WEEKLY_WINNERS,
  INITIAL_MONTHLY_AWARDS,
  INITIAL_DASHBOARD,
  NEUTRAL_CLUB_VISUALS,
} from '../data/initialData';

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwGzMZQ3uNzF41GbcSbxQe5dtoq7lDIHa7jq86JAfTNX9-ph9dnmOR4g-X3aaRKRAwm4w/exec';

// The Apps Script web app is public by design, so this key only guards against
// accidental refreshes — it is not a secret. Override per environment if needed.
const REFRESH_API_KEY = import.meta.env.VITE_REFRESH_API_KEY || 'htcv-fpl-2027';

const READ_TIMEOUT_MS = 20000;
const SYNC_TIMEOUT_MS = 240000;

/**
 * Result envelope so callers can tell live data apart from the bundled
 * fallback. Silently serving placeholder standings as if they were real was
 * the reason a broken backend looked healthy.
 */
export interface ApiResult<T> {
  data: T;
  ok: boolean;
}

/** fetch() never times out on its own; a hung Apps Script would hang the UI. */
async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function endpoint(action: string): string {
  return `${WEB_APP_URL}?action=${action}&_t=${Date.now()}`;
}

export async function fetchDashboardData(): Promise<ApiResult<LeagueDashboardData>> {
  try {
    const json = await fetchJson(endpoint('dashboard'), READ_TIMEOUT_MS);
    if (json.status === 'success' && json.data) {
      return {
        ok: true,
        data: {
          season: json.data.season || '2026-2027',
          currentGW: json.data.currentGW || 'GW1',
          gwsCompleted: json.data.gwsCompleted || 0,
          isLive: !!json.data.isLive,
          numPlayers: json.data.numPlayers || 14,
          lastUpdated: json.data.lastUpdated
            ? new Date(json.data.lastUpdated).toLocaleString('vi-VN')
            : new Date().toLocaleString('vi-VN'),
          totalPrizePool: 7000000,
          latestWeeklyWinner: json.data.latestWeeklyWinner,
        },
      };
    }
    return { data: INITIAL_DASHBOARD, ok: false };
  } catch (err) {
    console.warn('Using local fallback for dashboard:', err);
    return { data: INITIAL_DASHBOARD, ok: false };
  }
}

/**
 * Match a sheet row to its bundled profile (avatar, club crest, colours).
 *
 * Returns undefined when nothing matches. Falling back to the row's position
 * used to attach another manager's face and club to the row.
 */
function resolveInitialPlayer<T extends { id: number; manager: string }>(row: any, list: T[]): T | undefined {
  const rowId = Number(row['ID']);
  const rowName = String(row['HLV'] || '').trim().toLowerCase();

  return (
    list.find(p => p.id === rowId) ||
    list.find(p => {
      const pName = p.manager.toLowerCase();
      if (pName === rowName) return true;
      // The sheet historically stored short forms of a few nicknames.
      if (rowName === 'tú' && pName.includes('tú')) return true;
      if (rowName === 'lâm' && pName.includes('lâm')) return true;
      if (rowName === 'vito' && pName === 'hải') return true;
      if ((rowName === 'tbd' || rowName.includes('hlv 14') || rowName.includes('tân binh')) && pName === 'tân') return true;
      return false;
    })
  );
}

/** Identity fields for a row, preferring the sheet's own values when unmatched. */
function identityOf(row: any, profile: { id: number; manager: string; team: string } | undefined, fallbackId: number) {
  return {
    id: Number(row['ID']) || profile?.id || fallbackId,
    manager: profile?.manager || String(row['HLV'] || '—'),
    team: profile?.team || String(row['Team'] || ''),
  };
}

function visualsOf(profile: any) {
  if (!profile) return NEUTRAL_CLUB_VISUALS;
  return {
    avatarUrl: profile.avatarUrl,
    favoriteClub: profile.favoriteClub,
    fanClubNickname: profile.fanClubNickname,
    clubLogoUrl: profile.clubLogoUrl,
    clubColors: profile.clubColors,
  };
}

export async function fetchClassicStandings(): Promise<ApiResult<ClassicStanding[]>> {
  try {
    const json = await fetchJson(endpoint('classic'), READ_TIMEOUT_MS);
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const data = json.data.map((row: any, idx: number) => {
        const scores: (number | null)[] = [];
        let best = { gw: 1, pts: 0 };
        for (let gw = 1; gw <= 38; gw++) {
          const val = row[`GW${gw}`];
          const num = typeof val === 'number' ? val : (val !== '' && !isNaN(Number(val)) ? Number(val) : null);
          scores.push(num);
          if (num !== null && num > best.pts) best = { gw, pts: num };
        }
        const profile = resolveInitialPlayer(row, INITIAL_CLASSIC_STANDINGS);
        return {
          rank: row['#'] || idx + 1,
          ...identityOf(row, profile, idx + 1),
          ...visualsOf(profile),
          scores,
          total: Number(row['TOTAL']) || 0,
          average: Number(row['AVG']) || 0,
          bestGW: best,
        } as ClassicStanding;
      });
      return { data, ok: true };
    }
    return { data: INITIAL_CLASSIC_STANDINGS, ok: false };
  } catch (err) {
    console.warn('Using local fallback for classic standings:', err);
    return { data: INITIAL_CLASSIC_STANDINGS, ok: false };
  }
}

export async function fetchH2HStandings(): Promise<ApiResult<H2HStanding[]>> {
  try {
    const json = await fetchJson(endpoint('h2h'), READ_TIMEOUT_MS);
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const data = json.data.map((row: any, idx: number) => {
        const profile = resolveInitialPlayer(row, INITIAL_H2H_STANDINGS);
        return {
          rank: row['#'] || idx + 1,
          ...identityOf(row, profile, idx + 1),
          ...visualsOf(profile),
          played: Number(row['P']) || 0,
          won: Number(row['W']) || 0,
          drawn: Number(row['D']) || 0,
          lost: Number(row['L']) || 0,
          pointsFor: Number(row['GF']) || 0,
          pointsAgainst: Number(row['GA']) || 0,
          goalDifference: Number(row['GD']) || 0,
          points: Number(row['Pts']) || 0,
          classicTotal: Number(row['Classic Total']) || 0,
        } as H2HStanding;
      });
      return { data, ok: true };
    }
    return { data: INITIAL_H2H_STANDINGS, ok: false };
  } catch (err) {
    console.warn('Using local fallback for H2H standings:', err);
    return { data: INITIAL_H2H_STANDINGS, ok: false };
  }
}

export async function fetchWeeklyWinners(): Promise<ApiResult<WeeklyWinner[]>> {
  try {
    const json = await fetchJson(endpoint('weekly'), READ_TIMEOUT_MS);
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const data = json.data.map((row: any) => ({
        gw: Number(row['GW']) || 1,
        winner: row['Nhất vòng'] || '',
        points: Number(row['Điểm']) || 0,
        runnerUp: row['Nhì'] || '',
        runnerUpPoints: Number(row['Điểm nhì']) || 0,
        prize: Number(row['Giải thưởng']) || 50000,
        paid: row['Đã trả?'] === 'TRUE' || row['Đã trả?'] === true,
        date: row['Ngày'] || '',
      }));
      return { data, ok: true };
    }
    return { data: INITIAL_WEEKLY_WINNERS, ok: false };
  } catch (err) {
    console.warn('Using local fallback for weekly winners:', err);
    return { data: INITIAL_WEEKLY_WINNERS, ok: false };
  }
}

export async function fetchMonthlyAwards(): Promise<ApiResult<MonthlyAward[]>> {
  try {
    const json = await fetchJson(endpoint('monthly'), READ_TIMEOUT_MS);
    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      const data = json.data.map((row: any) => ({
        monthName: row['Tháng'] || '',
        gwRange: row['GW Range'] || '',
        classicWinner: row['Classic Winner'] || 'Chưa có',
        classicPoints: Number(row['Điểm Classic']) || 0,
        h2hWinner: row['H2H Winner'] || 'Chưa có',
        h2hPoints: Number(row['Điểm H2H']) || 0,
        classicPrize: Number(row['Giải Classic']) || 100000,
        h2hPrize: Number(row['Giải H2H']) || 100000,
        paidClassic: row['Đã trả Classic?'] === 'TRUE' || row['Đã trả Classic?'] === true,
        paidH2H: row['Đã trả H2H?'] === 'TRUE' || row['Đã trả H2H?'] === true,
      }));
      return { data, ok: true };
    }
    return { data: INITIAL_MONTHLY_AWARDS, ok: false };
  } catch (err) {
    console.warn('Using local fallback for monthly awards:', err);
    return { data: INITIAL_MONTHLY_AWARDS, ok: false };
  }
}

/**
 * Provisional scores for the gameweek in progress. Cheap enough (one cached
 * call shared by every visitor) to poll while people are watching.
 */
export async function fetchLiveData(): Promise<LiveGwData | null> {
  try {
    const json = await fetchJson(endpoint('live'), READ_TIMEOUT_MS);
    if (json.status === 'success' && json.data) return json.data as LiveGwData;
    return null;
  } catch (err) {
    console.warn('Live data unavailable:', err);
    return null;
  }
}

export async function triggerLiveSync(): Promise<{ success: boolean; message: string; elapsed?: number }> {
  try {
    const json = await fetchJson(
      `${WEB_APP_URL}?action=refresh&key=${REFRESH_API_KEY}&_t=${Date.now()}`,
      SYNC_TIMEOUT_MS,
    );
    if (json.status === 'success' || json.status === 'partial') {
      return { success: true, message: json.message || 'Đồng bộ FPL thành công!', elapsed: json.elapsed };
    }
    // "cooldown" is a normal answer, not a failure: the data is already fresh.
    if (json.status === 'cooldown') {
      return { success: true, message: json.message };
    }
    return { success: false, message: json.message || 'Không thể đồng bộ vào lúc này.' };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối API: ${err.message || 'Không xác định'}` };
  }
}

export interface SeasonInfo {
  displayGw: number;
  currentGw: number;
  isLive: boolean;
  isPreSeason: boolean;
  finishedGws: number;
  months: { name: string; range: string; gws: number[] }[];
}

/**
 * Season calendar from the backend, which derives it from real FPL deadlines.
 * Keeps the month → gameweek mapping in one place instead of two hardcoded
 * copies that could drift from the fixture list.
 */
export async function fetchSeasonInfo(): Promise<SeasonInfo | null> {
  try {
    const json = await fetchJson(endpoint('season'), READ_TIMEOUT_MS);
    if (json.status !== 'success' || !json.data) return null;
    return {
      displayGw: json.data.displayGw,
      currentGw: json.data.currentGw,
      isLive: !!json.data.isLive,
      isPreSeason: !!json.data.isPreSeason,
      finishedGws: json.data.finishedGws || 0,
      months: (json.data.months || [])
        .filter((m: any) => m.gws && m.gws.length)
        .map((m: any) => ({
          name: m.name,
          range: `GW${m.gws[0]} - GW${m.gws[m.gws.length - 1]}`,
          gws: m.gws,
        })),
    };
  } catch (err) {
    console.warn('Season info unavailable:', err);
    return null;
  }
}
