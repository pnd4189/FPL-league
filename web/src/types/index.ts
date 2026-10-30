export interface Player {
  id: number;
  team: string;
  manager: string;
  avatarUrl?: string;
  favoriteClub: string;
  fanClubNickname: string;
  clubLogoUrl: string;
  clubColors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

export interface ClassicStanding {
  rank: number;
  id: number;
  manager: string;
  team: string;
  avatarUrl?: string;
  favoriteClub: string;
  fanClubNickname: string;
  clubLogoUrl: string;
  clubColors: {
    primary: string;
    secondary: string;
    text: string;
  };
  scores: (number | null)[]; // GW1 to GW38
  total: number;
  average: number;
  bestGW: { gw: number; pts: number };
  rankChange?: number;
}

export interface H2HStanding {
  rank: number;
  id: number;
  manager: string;
  team: string;
  avatarUrl?: string;
  favoriteClub: string;
  fanClubNickname: string;
  clubLogoUrl: string;
  clubColors: {
    primary: string;
    secondary: string;
    text: string;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  goalDifference: number;
  points: number;
  classicTotal: number;
}

export interface H2HMatch {
  gw: number;
  id: number;
  homePlayer: string;
  homeTeam: string;
  homePts: number;
  homeH2HPts: number;
  homeId: number;
  awayPlayer: string;
  awayTeam: string;
  awayPts: number;
  awayH2HPts: number;
  awayId: number;
  result: 'Home Win' | 'Away Win' | 'Draw' | 'Upcoming';
  diff: number;
  /** False for gameweeks not played yet — points render as '-'. */
  played?: boolean;
}

/** One real league fixture from the official FPL head-to-head schedule. */
export interface H2HScheduleRow {
  gw: number;
  homeId: number;
  awayId: number;
  homePts: number;
  awayPts: number;
  played: boolean;
}

export interface WeeklyWinner {
  gw: number;
  winner: string;
  points: number;
  runnerUp: string;
  runnerUpPoints: number;
  prize: number;
  paid: boolean;
  date?: string;
}

export interface MonthlyAward {
  monthName: string;
  gwRange: string;
  classicWinner: string;
  classicPoints: number;
  h2hWinner: string;
  h2hPoints: number;
  classicPrize: number;
  h2hPrize: number;
  paidClassic: boolean;
  paidH2H: boolean;
}

export interface CupMatch {
  id: string;
  round: 'QF' | 'SF' | 'Final';
  matchNumber: number;
  player1: { name: string; pts?: number; winner?: boolean; avatarUrl?: string; clubLogoUrl?: string };
  player2: { name: string; pts?: number; winner?: boolean; avatarUrl?: string; clubLogoUrl?: string };
}

export interface FeePayment {
  id: number;
  manager: string;
  team: string;
  favoriteClub: string;
  fee: number;
  paid: boolean;
  paidDate?: string;
}

export interface LeagueDashboardData {
  season: string;
  currentGW: number | string;
  gwsCompleted: number;
  /** True while the current gameweek is still being played. */
  isLive?: boolean;
  numPlayers: number;
  lastUpdated: string;
  totalPrizePool: number;
  latestWeeklyWinner?: {
    gw: number;
    winner: string;
    score: number;
  };
  classicLeader?: {
    manager: string;
    team: string;
    total: number;
  };
  h2hLeader?: {
    manager: string;
    team: string;
    points: number;
  };
}

/** One player (footballer) inside a manager's live squad. */
export interface SquadPlayer {
  id: number;
  name: string;
  team: string;
  pos: number;   // 1 GK, 2 DEF, 3 MID, 4 FWD
  slot: number;  // 1-11 starters, 12-15 bench
  mult: number;  // 0 bench, 1 starter, 2 captain, 3 triple captain
  pts: number;
  mins: number;
  vice: boolean;
  /** Came on ("in") or was taken off ("out") by an automatic substitution. */
  sub?: 'in' | 'out';
}

/** The captain pick of a manager's live squad. */
export interface LiveCaptain {
  id: number;
  name: string;
  team: string;
  pts: number;   // raw live points, before the captain multiplier
  mult: number;  // 2 or 3
}

/** One manager's provisional points for the gameweek currently in progress. */
export interface LiveScore {
  id: number;
  manager: string;
  team: string;
  livePoints: number;
  netPoints: number;
  transferCost: number;
  playersPlayed: number;
  playersRemaining: number;
  chip: string;
  /** Automatic substitutions applied for this manager (by FPL, or provisionally). */
  subs?: number;
  captain?: LiveCaptain | null;
  squad?: SquadPlayer[];
}

/** One provisional head-to-head fixture of the gameweek in progress. */
export interface LiveH2HFixture {
  homeId: number;
  homeManager: string;
  homePoints: number;
  homeH2HPoints: number;
  awayId: number;
  awayManager: string;
  awayPoints: number;
  awayH2HPoints: number;
  diff: number;
}

/**
 * Live payload from the Apps Script backend. `autoSubsApplied` is false while
 * matches are still in play; once every match has finished the backend
 * substitutes locally (`autoSubsProvisional`) until FPL publishes its own.
 */
export interface LiveGwData {
  gw: number;
  isLive: boolean;
  isPreSeason: boolean;
  finishedGws: number;
  inPlay: boolean;
  autoSubsApplied: boolean;
  /** Substitutions computed by the backend while FPL has not published its own. */
  autoSubsProvisional?: boolean;
  /** A gameweek finished but the settled tables have not been rebuilt yet. */
  settlementPending?: boolean;
  updatedAt: string;
  scores: LiveScore[];
  h2h: LiveH2HFixture[];
}

/** One fixture of a club, with FPL's 1 (easy) - 5 (hard) difficulty. */
export interface AdvisorFixture {
  gw: number;
  opp: string;
  home: boolean;
  fdr: number;
}

/** A footballer as the round assistant describes them. */
export interface AdvisorPlayer {
  id: number;
  name: string;
  team: string;
  pos: number;       // 1 GK, 2 DEF, 3 MID, 4 FWD
  cost: number;      // millions
  ep: number;        // the assistant's expected points for the coming gameweek
  ep5?: number;      // ... summed over the next five gameweeks
  form: number;
  ppg: number;       // season points per game
  xgi: number;       // expected goals + assists per 90 minutes
  reasons?: string[]; // why a captain pick made the list
  chance: number;    // chance of playing, percent
  news: string;
  sel: number;       // ownership, percent
  fixtures: AdvisorFixture[];
  difficulty?: number; // average difficulty of the next five gameweeks
}

export interface AdvisorTransferIdea {
  out: AdvisorPlayer;
  outDifficulty: number;
  ins: AdvisorPlayer[];
}

export interface AdvisorData {
  gw: number;
  deadline: string | null;
  manager: string;
  basedOnGw: number;
  savedTransfers: number;
  bank: number;
  captains: AdvisorPlayer[];
  health: { name: string; team: string; starter: boolean; why: string; news: string }[];
  opponent: {
    id: number;
    manager: string;
    edge: AdvisorPlayer[];
    threat: AdvisorPlayer[];
    myProjected: number;
    theirProjected: number;
  } | null;
  transfers: AdvisorTransferIdea[];
  /** AI-written comment for the coming gameweek, once the backend has produced it. */
  aiReview?: { text: string; at: string } | null;
  updatedAt: string;
}

export interface ChatReply {
  ok: boolean;
  answer: string;
  source: 'ai' | 'facts' | '';  // 'facts' = the AI strayed, raw figures shown instead
  message: string;
  code: string;      // backend error code, empty on success
  remaining: number | null;
  limit: number | null;
}
