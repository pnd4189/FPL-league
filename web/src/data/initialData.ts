import { Player, ClassicStanding, H2HStanding, H2HMatch, WeeklyWinner, MonthlyAward, CupMatch, FeePayment, LeagueDashboardData } from '../types';

export const INITIAL_PLAYERS: Player[] = [
  // 1. Shark Tú (Top 1 Demo)
  {
    id: 152158,
    team: 'Dream Team',
    manager: 'Shark Tú',
    avatarUrl: '/avatars/shark-tu.png',
    favoriteClub: 'Manchester City',
    fanClubNickname: 'Cityzen',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t43.png',
    clubColors: { primary: '#6CABDD', secondary: '#1C2C5B', text: '#1C2C5B' },
  },
  // 2. Shark Lâm (Top 2 Demo)
  {
    id: 4403856,
    team: "dam thanh's Team",
    manager: 'Shark Lâm',
    avatarUrl: '/avatars/shark-lam.png',
    favoriteClub: 'Arsenal',
    fanClubNickname: 'Gunner',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t3.png',
    clubColors: { primary: '#EF0107', secondary: '#063672', text: '#ffffff' },
  },
  // 3. Dũng (Nerazzurri - Top 3 Demo)
  {
    id: 57214,
    team: 'Nerazzurri',
    manager: 'Dũng',
    avatarUrl: '/avatars/dung.jpg',
    favoriteClub: 'Manchester United',
    fanClubNickname: 'Red Devil',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t1.png',
    clubColors: { primary: '#DA291C', secondary: '#FBE122', text: '#ffffff' },
  },
  // 4. Trọng Anh (Top 4 Demo)
  {
    id: 71922,
    team: 'Kiss The Rain',
    manager: 'Trọng Anh',
    avatarUrl: '/avatars/trong-anh.png',
    favoriteClub: 'Manchester United',
    fanClubNickname: 'Red Devil',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t1.png',
    clubColors: { primary: '#DA291C', secondary: '#FBE122', text: '#ffffff' },
  },
  // 5. Cường (Top 5 Demo)
  {
    id: 4334607,
    team: 'VMC',
    manager: 'Cường',
    avatarUrl: '/avatars/cuong.png',
    favoriteClub: 'Brighton & Hove Albion',
    fanClubNickname: 'The Seagulls',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t36.png',
    clubColors: { primary: '#0057B8', secondary: '#FFCD00', text: '#ffffff' },
  },
  // 6. Lập (Top 6 Demo)
  {
    id: 786718,
    team: 'StampingMachine20',
    manager: 'Lập',
    avatarUrl: '/avatars/lap.png',
    favoriteClub: 'Manchester United',
    fanClubNickname: 'Red Devil',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t1.png',
    clubColors: { primary: '#DA291C', secondary: '#FBE122', text: '#ffffff' },
  },
  // 7. Trường (Top 7 Demo)
  {
    id: 832249,
    team: 'DaddyCool',
    manager: 'Trường',
    avatarUrl: '/avatars/truong.png',
    favoriteClub: 'Liverpool',
    fanClubNickname: 'The Kop',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t14.png',
    clubColors: { primary: '#C8102E', secondary: '#00B2A9', text: '#ffffff' },
  },
  // 8. Thành
  {
    id: 695284,
    team: 'Bố của NHA 25/26',
    manager: 'Thành',
    avatarUrl: '/avatars/thanh.png',
    favoriteClub: 'Arsenal',
    fanClubNickname: 'Gunner',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t3.png',
    clubColors: { primary: '#EF0107', secondary: '#063672', text: '#ffffff' },
  },
  // 9. Tuấn
  {
    id: 701064,
    team: 'Tuanhm',
    manager: 'Tuấn',
    avatarUrl: '/avatars/tuan.png',
    favoriteClub: 'Arsenal',
    fanClubNickname: 'Gunner',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t3.png',
    clubColors: { primary: '#EF0107', secondary: '#063672', text: '#ffffff' },
  },
  // 10. Khánh
  {
    id: 186794,
    team: 'lumLua',
    manager: 'Khánh',
    avatarUrl: '/avatars/khanh.png',
    favoriteClub: 'Chelsea',
    fanClubNickname: 'The Blues',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t8.png',
    clubColors: { primary: '#034694', secondary: '#EE242C', text: '#ffffff' },
  },
  // 11. Đại
  {
    id: 1860254,
    team: 'ĐinhBộHúp',
    manager: 'Đại',
    avatarUrl: '/avatars/dai.png',
    favoriteClub: 'Tottenham Hotspur',
    fanClubNickname: 'Spurs',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t6.png',
    clubColors: { primary: '#132257', secondary: '#ffffff', text: '#ffffff' },
  },
  // 12. Hải
  {
    id: 3053458,
    team: 'vito_scaletta',
    manager: 'Hải',
    avatarUrl: '/avatars/hai.png',
    favoriteClub: 'Aston Villa',
    fanClubNickname: 'The Villans',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t7.png',
    clubColors: { primary: '#670E36', secondary: '#95BFE5', text: '#ffffff' },
  },
  // 13. Tùng
  {
    id: 1189156,
    team: 'Pak',
    manager: 'Tùng',
    avatarUrl: '/avatars/tung.png',
    favoriteClub: 'Newcastle United',
    fanClubNickname: 'The Magpies',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t4.png',
    clubColors: { primary: '#241F20', secondary: '#41B6E6', text: '#ffffff' },
  },
  // 14. Tân
  {
    id: 5934296,
    team: 'Tân Team',
    manager: 'Tân',
    avatarUrl: '/avatars/tan.png',
    favoriteClub: 'West Ham United',
    fanClubNickname: 'The Hammers',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t21.png',
    clubColors: { primary: '#7A263A', secondary: '#1BB1E7', text: '#ffffff' },
  },
];

export const INITIAL_DASHBOARD: LeagueDashboardData = {
  season: '2026-2027',
  currentGW: 'GW1 (Sắp diễn ra)',
  gwsCompleted: 0,
  numPlayers: 14,
  lastUpdated: new Date().toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
  totalPrizePool: 7000000,
  latestWeeklyWinner: {
    gw: 1,
    winner: 'Chờ GW1',
    score: 0
  },
  classicLeader: {
    manager: 'Shark Tú',
    team: 'Dream Team',
    total: 0
  },
  h2hLeader: {
    manager: 'Shark Tú',
    team: 'Dream Team',
    points: 0
  }
};

export const INITIAL_CLASSIC_STANDINGS: ClassicStanding[] = INITIAL_PLAYERS.map((p, idx) => ({
  rank: idx + 1,
  id: p.id,
  manager: p.manager,
  team: p.team,
  avatarUrl: p.avatarUrl,
  favoriteClub: p.favoriteClub,
  fanClubNickname: p.fanClubNickname,
  clubLogoUrl: p.clubLogoUrl,
  clubColors: p.clubColors,
  scores: Array(38).fill(null),
  total: 0,
  average: 0,
  bestGW: { gw: 1, pts: 0 },
  rankChange: 0
}));

export const INITIAL_H2H_STANDINGS: H2HStanding[] = INITIAL_PLAYERS.map((p, idx) => ({
  rank: idx + 1,
  id: p.id,
  manager: p.manager,
  team: p.team,
  avatarUrl: p.avatarUrl,
  favoriteClub: p.favoriteClub,
  fanClubNickname: p.fanClubNickname,
  clubLogoUrl: p.clubLogoUrl,
  clubColors: p.clubColors,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  goalDifference: 0,
  points: 0,
  classicTotal: 0
}));

export const INITIAL_WEEKLY_WINNERS: WeeklyWinner[] = Array.from({ length: 38 }, (_, i) => ({
  gw: i + 1,
  winner: i === 0 ? 'Chờ GW1 khởi tranh' : '',
  points: 0,
  runnerUp: '',
  runnerUpPoints: 0,
  prize: 50000,
  paid: false,
  date: ''
}));

/**
 * Fallback month buckets for 2026-2027, matching the real fixture deadlines in
 * Vietnam time. The backend derives the authoritative map from the FPL API and
 * serves it via `?action=season`; this list is only used until that arrives.
 */
export const MONTH_RANGES: { name: string; range: string; gws: number[] }[] = [
  { name: 'Tháng 8', range: 'GW1 - GW2', gws: [1, 2] },
  { name: 'Tháng 9', range: 'GW3 - GW5', gws: [3, 4, 5] },
  { name: 'Tháng 10', range: 'GW6 - GW9', gws: [6, 7, 8, 9] },
  { name: 'Tháng 11', range: 'GW10 - GW12', gws: [10, 11, 12] },
  { name: 'Tháng 12', range: 'GW13 - GW18', gws: [13, 14, 15, 16, 17, 18] },
  { name: 'Tháng 1', range: 'GW19 - GW23', gws: [19, 20, 21, 22, 23] },
  { name: 'Tháng 2', range: 'GW24 - GW27', gws: [24, 25, 26, 27] },
  { name: 'Tháng 3', range: 'GW28 - GW30', gws: [28, 29, 30] },
  { name: 'Tháng 4', range: 'GW31 - GW33', gws: [31, 32, 33] },
  { name: 'Tháng 5', range: 'GW34 - GW38', gws: [34, 35, 36, 37, 38] },
];

/**
 * Visual defaults for a standings row that does not match any known manager.
 * Borrowing another player's avatar and crest would misattribute the row.
 */
export const NEUTRAL_CLUB_VISUALS = {
  avatarUrl: undefined as string | undefined,
  favoriteClub: '',
  fanClubNickname: '',
  clubLogoUrl: '',
  clubColors: { primary: '#37003C', secondary: '#00ff87', text: '#ffffff' },
};

export const INITIAL_MONTHLY_AWARDS: MonthlyAward[] = MONTH_RANGES.map(m => ({
  monthName: m.name,
  gwRange: m.range,
  classicWinner: 'Chưa có',
  classicPoints: 0,
  h2hWinner: 'Chưa có',
  h2hPoints: 0,
  classicPrize: 100000,
  h2hPrize: 100000,
  paidClassic: false,
  paidH2H: false
}));

export const INITIAL_CUP_BRACKET: CupMatch[] = [
  { id: 'qf1', round: 'QF', matchNumber: 1, player1: { name: 'Hạt giống #1 (Shark Tú)', clubLogoUrl: INITIAL_PLAYERS[0].clubLogoUrl }, player2: { name: 'Hạt giống #8 (Thành)', clubLogoUrl: INITIAL_PLAYERS[7].clubLogoUrl } },
  { id: 'qf2', round: 'QF', matchNumber: 2, player1: { name: 'Hạt giống #4 (Trọng Anh)', clubLogoUrl: INITIAL_PLAYERS[3].clubLogoUrl }, player2: { name: 'Hạt giống #5 (Cường)', clubLogoUrl: INITIAL_PLAYERS[4].clubLogoUrl } },
  { id: 'qf3', round: 'QF', matchNumber: 3, player1: { name: 'Hạt giống #3 (Dũng)', clubLogoUrl: INITIAL_PLAYERS[2].clubLogoUrl }, player2: { name: 'Hạt giống #6 (Lập)', clubLogoUrl: INITIAL_PLAYERS[5].clubLogoUrl } },
  { id: 'qf4', round: 'QF', matchNumber: 4, player1: { name: 'Hạt giống #2 (Shark Lâm)', clubLogoUrl: INITIAL_PLAYERS[1].clubLogoUrl }, player2: { name: 'Hạt giống #7 (Trường)', clubLogoUrl: INITIAL_PLAYERS[6].clubLogoUrl } },
  { id: 'sf1', round: 'SF', matchNumber: 1, player1: { name: 'Thắng Tứ kết 1' }, player2: { name: 'Thắng Tứ kết 2' } },
  { id: 'sf2', round: 'SF', matchNumber: 2, player1: { name: 'Thắng Tứ kết 3' }, player2: { name: 'Thắng Tứ kết 4' } },
  { id: 'final', round: 'Final', matchNumber: 1, player1: { name: 'Thắng Bán kết 1' }, player2: { name: 'Thắng Bán kết 2' } }
];

export const INITIAL_FEE_PAYMENTS: FeePayment[] = INITIAL_PLAYERS.map(p => ({
  id: p.id,
  manager: p.manager,
  team: p.team,
  favoriteClub: p.favoriteClub,
  fee: 500000,
  paid: true,
  paidDate: '15/08/2026'
}));

export const PRIZE_STRUCTURE = {
  totalPool: 7000000,
  entryFee: 500000,
  numPlayers: 14,
  prizes: [
    { title: 'Nhất vòng (Weekly MVP)', amount: 50000, count: 38, total: 1900000, desc: '50k / vòng cho HLV điểm cao nhất tuần (38 Gameweek)' },
    { title: 'Nhất tháng Classic', amount: 100000, count: 10, total: 1000000, desc: '100k / tháng cho HLV tổng điểm cao nhất tháng' },
    { title: 'Nhất tháng H2H', amount: 100000, count: 10, total: 1000000, desc: '100k / tháng cho HLV nhiều điểm H2H nhất tháng' },
    { title: 'Vô địch Cả Mùa Classic (Hạng 1)', amount: 800000, count: 1, total: 800000, desc: 'Cúp vàng & Thưởng chung cuộc giải Classic' },
    { title: 'Á quân Cả Mùa Classic (Hạng 2)', amount: 500000, count: 1, total: 500000, desc: 'Huy chương bạc chung cuộc giải Classic' },
    { title: 'Hạng Ba Cả Mùa Classic (Hạng 3)', amount: 200000, count: 1, total: 200000, desc: 'Huy chương đồng chung cuộc giải Classic' },
    { title: 'Vô địch Cả Mùa H2H (Hạng 1)', amount: 800000, count: 1, total: 800000, desc: 'Cúp vàng & Thưởng chung cuộc giải H2H League' },
    { title: 'Á quân Cả Mùa H2H (Hạng 2)', amount: 500000, count: 1, total: 500000, desc: 'Huy chương bạc chung cuộc giải H2H League' },
    { title: 'Hạng Ba Cả Mùa H2H (Hạng 3)', amount: 200000, count: 1, total: 200000, desc: 'Huy chương đồng chung cuộc giải H2H League' },
    { title: 'Vô địch Fantasy Cup (Top 8)', amount: 100000, count: 1, total: 100000, desc: 'Vô địch giải đấu loại trực tiếp sau vòng 35' },
  ]
};

export function getH2HMatchupsForGW(gw: number, players = INITIAL_PLAYERS) {
  const n = players.length; // 14
  const round = (gw - 1) % (n - 1); // 0 to 12
  const matches: { home: typeof INITIAL_PLAYERS[0]; away: typeof INITIAL_PLAYERS[0] }[] = [];
  
  for (let i = 0; i < n / 2; i++) {
    let homeIdx = (round + i) % (n - 1);
    let awayIdx = (n - 1 - i + round) % (n - 1);
    if (i === 0) {
      awayIdx = n - 1;
    }
    const homePlayer = gw % 2 === 0 ? players[homeIdx] : players[awayIdx];
    const awayPlayer = gw % 2 === 0 ? players[awayIdx] : players[homeIdx];
    matches.push({ home: homePlayer, away: awayPlayer });
  }
  return matches;
}
