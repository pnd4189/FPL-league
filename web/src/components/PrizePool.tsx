import React from 'react';
import { Trophy, Coins, Wallet, Crown } from 'lucide-react';
import { PRIZE_STRUCTURE, INITIAL_PLAYERS } from '../data/initialData';
import { WeeklyWinner, MonthlyAward, ClassicStanding, H2HStanding } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { isWinner, prizeShare } from '../services/prizes';
import { Reveal } from './scroll-reveal';
import { DetailGrid, RankCard, RankCardList } from './RankCards';

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** 350000 -> "350k", 1350000 -> "1,35tr": the way the league writes amounts, short enough for a phone card. */
const compactVnd = (n: number): string =>
  n >= 1000000
    ? `${String(Math.round(n / 10000) / 100).replace('.', ',')}tr`
    : n > 0
    ? `${Math.round(n / 1000)}k`
    : '0';

interface PrizePoolProps {
  weeklyWinners?: WeeklyWinner[];
  monthlyAwards?: MonthlyAward[];
  classicStandings?: ClassicStanding[];
  h2hStandings?: H2HStanding[];
  onSelectPlayer?: (id: number) => void;
}

export const PrizePool: React.FC<PrizePoolProps> = ({
  weeklyWinners = [],
  monthlyAwards = [],
  classicStandings = [],
  h2hStandings = [],
  onSelectPlayer,
}) => {
  const totalExpenses = PRIZE_STRUCTURE.prizes.reduce((sum, p) => sum + p.total, 0);

  // Calculate earnings for each of the 14 managers based on live loaded data
  const managerEarnings = INITIAL_PLAYERS.map(p => {
    // 1. Weekly Wins (50k pot, split evenly on a tie)
    const weeklyWins = weeklyWinners.filter(w => w.points > 0 && isWinner(w.winner, p.manager));
    const weeklyEarnings = weeklyWins.reduce(
      (sum, w) => sum + prizeShare(w.winner, p.manager, w.prize || 50000),
      0,
    );

    // 2. Monthly Classic Wins (100k pot, split evenly on a tie)
    const monthlyClassicWins = monthlyAwards.filter(m => m.classicPoints > 0 && isWinner(m.classicWinner, p.manager));
    const monthlyClassicEarnings = monthlyClassicWins.reduce(
      (sum, m) => sum + prizeShare(m.classicWinner, p.manager, m.classicPrize || 100000),
      0,
    );

    // 3. Monthly H2H Wins (100k pot, split evenly on a tie)
    const monthlyH2HWins = monthlyAwards.filter(m => m.h2hPoints > 0 && isWinner(m.h2hWinner, p.manager));
    const monthlyH2HEarnings = monthlyH2HWins.reduce(
      (sum, m) => sum + prizeShare(m.h2hWinner, p.manager, m.h2hPrize || 100000),
      0,
    );

    // 4. Cup & Season bonuses (if applicable)
    const cupEarnings = 0;
    const seasonClassicEarnings = 0;
    const seasonH2HEarnings = 0;

    const totalWon =
      weeklyEarnings +
      monthlyClassicEarnings +
      monthlyH2HEarnings +
      cupEarnings +
      seasonClassicEarnings +
      seasonH2HEarnings;

    const classicRecord = classicStandings.find(c => c.id === p.id);
    const h2hRecord = h2hStandings.find(h => h.id === p.id);

    return {
      id: p.id,
      manager: p.manager,
      team: p.team,
      avatarUrl: p.avatarUrl,
      clubLogoUrl: p.clubLogoUrl,
      favoriteClub: p.favoriteClub,
      fanClubNickname: p.fanClubNickname,
      clubColors: p.clubColors,
      weeklyCount: weeklyWins.length,
      weeklyEarnings,
      monthlyClassicCount: monthlyClassicWins.length,
      monthlyClassicEarnings,
      monthlyH2HCount: monthlyH2HWins.length,
      monthlyH2HEarnings,
      cupEarnings,
      seasonClassicEarnings,
      seasonH2HEarnings,
      totalWon,
      classicRank: classicRecord?.rank || 14,
      h2hRank: h2hRecord?.rank || 14,
      paidFee: true,
    };
  }).sort((a, b) => {
    if (b.totalWon !== a.totalWon) {
      return b.totalWon - a.totalWon;
    }
    // If tie in prize money, sort by classic rank
    return a.classicRank - b.classicRank;
  });

  const totalPrizeDistributed = managerEarnings.reduce((sum, m) => sum + m.totalWon, 0);
  const topEarner = managerEarnings[0];

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header Summary */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="eyebrow-pill">
                <Wallet className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />
                <span>14 HLV × 500.000 VNĐ · Mùa giải 2026-2027</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Quỹ thưởng và phân bổ giải
              </h3>
              <p className="text-xs sm:text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Bảng thống kê tiền thưởng tích lũy của 14 HLV theo kết quả Nhất tuần, Nhất tháng Classic và Nhất tháng H2H đã chốt.
              </p>
            </div>

            <div className="surface-well px-4 py-3 text-right flex-shrink-0">
              <p className="text-[13px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-faint)' }}>
                Tổng quỹ giải đấu
              </p>
              <p className="text-base sm:text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                7.000.000 VNĐ
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Prize Earnings Leaderboard */}
      <Reveal delayMs={60}>
        <div className="bezel-shell-lg">
          <div className="bezel-core-lg p-5 sm:p-7 md:p-8">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b mb-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-gold-soft)',
                    color: 'var(--accent-gold)',
                    boxShadow: 'inset 0 0 0 1px rgba(228, 191, 106, 0.28)',
                  }}
                >
                  <Trophy className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                    Xếp hạng tiền thưởng thực nhận
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Tự động chia đều giá trị giải thưởng khi có nhiều HLV đồng hạng nhất
                  </p>
                </div>
              </div>

              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold tabular-nums"
                style={{
                  backgroundColor: 'var(--accent-gold-soft)',
                  color: 'var(--accent-gold)',
                  boxShadow: 'inset 0 0 0 1px rgba(228, 191, 106, 0.28)',
                }}
              >
                <Coins className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Đã giải ngân: {totalPrizeDistributed.toLocaleString('vi-VN')} đ / 7.000.000 đ</span>
              </div>
            </div>

            {/* Top Earner Highlight Podium Card */}
            <div
              onClick={() => topEarner?.id && onSelectPlayer && onSelectPlayer(topEarner.id)}
              className="podium-1 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4 min-w-0">
                <PlayerAvatar
                  name={topEarner?.manager || 'HLV Top 1'}
                  avatarUrl={topEarner?.avatarUrl}
                  clubLogoUrl={topEarner?.clubLogoUrl}
                  favoriteClub={topEarner?.favoriteClub}
                  rank={1}
                  size="lg"
                  showCrown={true}
                />
                <div className="min-w-0">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-semibold uppercase tracking-wider font-mono"
                    style={{ backgroundColor: 'var(--accent-gold-soft)', color: 'var(--accent-gold)' }}
                  >
                    <Crown className="w-3 h-3" strokeWidth={1.6} />
                    <span>Dẫn đầu tiền thưởng</span>
                  </span>
                  <h5 className="text-lg sm:text-xl font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                    {topEarner?.manager}
                  </h5>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {topEarner?.team}
                  </p>
                </div>
              </div>

              <div className="surface-well px-4 py-3 text-right w-full sm:w-auto">
                <p className="text-[13px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                  Tổng thưởng tích lũy
                </p>
                <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                  {topEarner?.totalWon.toLocaleString('vi-VN')}{' '}
                  <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>VNĐ</span>
                </p>
              </div>
            </div>

            {/* 14 Managers Full Prize Table */}
            <RankCardList padded={false} caption="Bảng tiền thưởng 14 HLV · chạm vào thẻ để xem chi tiết">
              {managerEarnings.map((p, idx) => {
                const rankNum = idx + 1;
                const isRank1 = rankNum === 1 && p.totalWon > 0;
                const seasonAndCup = p.cupEarnings + p.seasonClassicEarnings + p.seasonH2HEarnings;
                return (
                  <RankCard
                    key={p.id}
                    rank={rankNum}
                    highlight={isRank1 ? 'gold' : undefined}
                    avatar={
                      <PlayerAvatar
                        name={p.manager}
                        avatarUrl={p.avatarUrl}
                        clubLogoUrl={p.clubLogoUrl}
                        favoriteClub={p.favoriteClub}
                        rank={rankNum}
                        size="sm"
                      />
                    }
                    name={p.manager}
                    team={p.team}
                    primary={compactVnd(p.totalWon)}
                    primaryUnit="VNĐ"
                    primaryTone="gold"
                    stats={[
                      ...(p.weeklyCount > 0 ? [{ label: 'Tuần', value: `${p.weeklyCount} lần`, tone: 'primary' as const }] : []),
                      ...(p.monthlyClassicCount > 0
                        ? [{ label: 'Classic tháng', value: `${p.monthlyClassicCount} lần`, tone: 'primary' as const }]
                        : []),
                      ...(p.monthlyH2HCount > 0
                        ? [{ label: 'H2H tháng', value: `${p.monthlyH2HCount} lần`, tone: 'secondary' as const }]
                        : []),
                      ...(seasonAndCup > 0 ? [{ label: 'Cúp / Mùa', value: vnd(seasonAndCup), tone: 'gold' as const }] : []),
                    ]}
                    detail={
                      <div className="space-y-2">
                        <p className="text-[14px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          Tổng thưởng tích lũy{' '}
                          <b className="font-bold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                            {vnd(p.totalWon)}
                          </b>
                        </p>
                        <DetailGrid
                          columns={2}
                          items={[
                            { label: 'Nhất tuần', value: vnd(p.weeklyEarnings) },
                            { label: 'Classic tháng', value: vnd(p.monthlyClassicEarnings) },
                            { label: 'H2H tháng', value: vnd(p.monthlyH2HEarnings) },
                            { label: 'Cúp / Mùa', value: vnd(seasonAndCup) },
                          ]}
                        />
                      </div>
                    }
                    onOpen={() => onSelectPlayer && onSelectPlayer(p.id)}
                  />
                );
              })}
            </RankCardList>

            <div
              className="hidden md:block overflow-x-auto rounded-2xl border touch-scroll max-h-[580px]"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}
            >
              <table className="w-full border-collapse text-left text-xs tabular-nums">
                <thead
                  className="font-mono text-[13px] sticky top-0 z-20 uppercase tracking-wider border-b"
                  style={{
                    backgroundColor: 'var(--table-head-bg)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <tr>
                    <th
                      className="py-3 px-2 sm:px-3 w-10 sm:w-12 text-center sticky left-0 z-30 border-r"
                      style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                    >
                      #
                    </th>
                    <th
                      className="py-3 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[180px] sticky left-10 sm:left-12 z-30 border-r"
                      style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                    >
                      HLV & Đội bóng
                    </th>
                    <th className="py-3 px-2.5 sm:px-3 text-center min-w-[95px]">Nhất tuần (50k)</th>
                    <th className="py-3 px-2.5 sm:px-3 text-center min-w-[105px]">Classic tháng (100k)</th>
                    <th className="py-3 px-2.5 sm:px-3 text-center min-w-[95px]">H2H tháng (100k)</th>
                    <th className="py-3 px-2.5 sm:px-3 text-center min-w-[85px]">Cúp / Mùa</th>
                    <th
                      className="py-3 px-3 sm:px-4 text-right min-w-[125px] font-bold"
                      style={{ color: 'var(--accent-gold)', backgroundColor: 'var(--accent-gold-soft)' }}
                    >
                      Tổng tiền thưởng
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {managerEarnings.map((p, idx) => {
                    const rankNum = idx + 1;
                    const isRank1 = rankNum === 1 && p.totalWon > 0;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                        className="transition-colors duration-150 cursor-pointer"
                        style={{
                          backgroundColor: isRank1 ? 'var(--accent-gold-soft)' : undefined,
                        }}
                      >
                        <td
                          className="py-3 px-2 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 border-r"
                          style={{
                            backgroundColor: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-subtle)',
                            color:
                              rankNum === 1
                                ? 'var(--accent-gold)'
                                : rankNum === 2
                                ? 'var(--accent-silver)'
                                : rankNum === 3
                                ? 'var(--accent-bronze)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {rankNum}
                        </td>

                        <td
                          className="py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[140px] sm:min-w-[180px]"
                          style={{
                            backgroundColor: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar
                              name={p.manager}
                              avatarUrl={p.avatarUrl}
                              clubLogoUrl={p.clubLogoUrl}
                              favoriteClub={p.favoriteClub}
                              rank={rankNum}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p
                                className="font-semibold truncate text-xs sm:text-sm font-display flex items-center gap-1.5"
                                style={{ color: 'var(--text-main)' }}
                              >
                                <span className="truncate">{p.manager}</span>
                                {rankNum <= 3 && (
                                  <Crown
                                    className="w-3 h-3 flex-shrink-0"
                                    strokeWidth={1.6}
                                    style={{
                                      color:
                                        rankNum === 1
                                          ? 'var(--accent-gold)'
                                          : rankNum === 2
                                          ? 'var(--accent-silver)'
                                          : 'var(--accent-bronze)',
                                    }}
                                  />
                                )}
                              </p>
                              <p className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {p.team}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Weekly Wins */}
                        <td className="py-3 px-3 text-center font-mono">
                          {p.weeklyCount > 0 ? (
                            <span
                              className="inline-block font-semibold px-2.5 py-0.5 rounded-full text-[14px]"
                              style={{
                                backgroundColor: 'var(--accent-primary-soft)',
                                color: 'var(--accent-primary)',
                              }}
                            >
                              {p.weeklyCount} lần ({p.weeklyEarnings.toLocaleString('vi-VN')}đ)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>0</span>
                          )}
                        </td>

                        {/* Monthly Classic Wins */}
                        <td className="py-3 px-3 text-center font-mono">
                          {p.monthlyClassicCount > 0 ? (
                            <span
                              className="inline-block font-semibold px-2.5 py-0.5 rounded-full text-[14px]"
                              style={{
                                backgroundColor: 'var(--accent-tertiary-soft)',
                                color: 'var(--accent-tertiary)',
                              }}
                            >
                              {p.monthlyClassicCount} lần ({p.monthlyClassicEarnings.toLocaleString('vi-VN')}đ)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>0</span>
                          )}
                        </td>

                        {/* Monthly H2H Wins */}
                        <td className="py-3 px-3 text-center font-mono">
                          {p.monthlyH2HCount > 0 ? (
                            <span
                              className="inline-block font-semibold px-2.5 py-0.5 rounded-full text-[14px]"
                              style={{
                                backgroundColor: 'var(--accent-secondary-soft)',
                                color: 'var(--accent-secondary)',
                              }}
                            >
                              {p.monthlyH2HCount} lần ({p.monthlyH2HEarnings.toLocaleString('vi-VN')}đ)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>0</span>
                          )}
                        </td>

                        {/* Cup / Season */}
                        <td className="py-3 px-3 text-center font-mono">
                          {p.cupEarnings + p.seasonClassicEarnings + p.seasonH2HEarnings > 0 ? (
                            <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
                              {(p.cupEarnings + p.seasonClassicEarnings + p.seasonH2HEarnings).toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>-</span>
                          )}
                        </td>

                        {/* TOTAL PRIZE WON */}
                        <td
                          className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-sm"
                          style={{ color: 'var(--accent-gold)', backgroundColor: 'var(--accent-gold-soft)' }}
                        >
                          {p.totalWon.toLocaleString('vi-VN')}{' '}
                          <span className="text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}>
                            VNĐ
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Breakdown Structure Table */}
      <Reveal delayMs={110}>
        <div className="bezel-shell">
          <div className="bezel-core overflow-hidden">
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
            >
              <h4 className="text-sm sm:text-base font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Cơ cấu phân bổ toàn bộ quỹ thưởng
              </h4>
              <span className="text-[14px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                10 hạng mục
              </span>
            </div>

            <ul className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {PRIZE_STRUCTURE.prizes.map((p, idx) => (
                <li key={idx} className="px-5 py-3.5 space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display font-bold text-[16px] leading-snug" style={{ color: 'var(--text-main)' }}>
                      {p.title}
                    </p>
                    <p className="flex-shrink-0 font-mono font-bold text-[16px] tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                      {p.total.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <p className="text-[14px] font-mono tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
                    {p.amount.toLocaleString('vi-VN')}đ × {p.count}
                  </p>
                  <p className="text-[14px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {p.desc}
                  </p>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto touch-scroll">
              <table className="w-full border-collapse text-left text-xs tabular-nums">
                <thead
                  className="font-mono text-[13px] uppercase tracking-wider border-b"
                  style={{
                    backgroundColor: 'var(--table-head-bg)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <tr>
                    <th className="py-3 px-5">Hạng mục giải thưởng</th>
                    <th className="py-3 px-3 text-right">Định mức</th>
                    <th className="py-3 px-3 text-center">Số lượng</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                    <th className="py-3 px-5">Ghi chú quy chế</th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {PRIZE_STRUCTURE.prizes.map((p, idx) => (
                    <tr key={idx} className="transition-colors duration-150">
                      <td className="py-3.5 px-5 font-semibold font-display" style={{ color: 'var(--text-main)' }}>
                        {p.title}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                        {p.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                        {p.count}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {p.total.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {p.desc}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Row */}
                  <tr
                    className="font-bold border-t"
                    style={{
                      backgroundColor: 'var(--bg-card-solid)',
                      borderColor: 'var(--border-highlight)',
                    }}
                  >
                    <td className="py-4 px-5 uppercase tracking-wider font-display text-xs" colSpan={3} style={{ color: 'var(--text-main)' }}>
                      Tổng cộng ngân sách giải thưởng
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-base" style={{ color: 'var(--accent-gold)' }}>
                      {totalExpenses.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 px-5 text-xs font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      100% cân đối quỹ thu
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
};
