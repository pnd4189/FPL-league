import React from 'react';
import { Trophy, Swords, Zap, Calendar, ArrowUpRight } from 'lucide-react';
import {
  ClassicStanding,
  H2HStanding,
  WeeklyWinner,
  MonthlyAward,
  LeagueDashboardData,
} from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { MonthRange } from '../services/liveStandings';
import { MONTH_RANGES } from '../data/initialData';
import { Reveal } from './scroll-reveal';

interface DashboardViewProps {
  dashboard: LeagueDashboardData;
  classicStandings: ClassicStanding[];
  h2hStandings: H2HStanding[];
  weeklyWinners: WeeklyWinner[];
  monthlyAwards: MonthlyAward[];
  currentGW?: number;
  isLive?: boolean;
  months?: MonthRange[];
  onSelectTab: (tab: string) => void;
  onSelectPlayer: (id: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  classicStandings,
  h2hStandings,
  weeklyWinners,
  monthlyAwards,
  currentGW = 1,
  isLive = false,
  months = MONTH_RANGES,
  onSelectTab,
  onSelectPlayer,
}) => {
  const top3Classic = classicStandings.slice(0, 3);
  const top5Classic = classicStandings.slice(0, 5);
  const top5H2H = h2hStandings.slice(0, 5);

  const leaderTotal = top3Classic[0]?.total || 1;
  const maxClassic = Math.max(top5Classic[0]?.total || 1, 1);
  const maxH2H = Math.max(top5H2H[0]?.points || 1, 1);

  const latestWinner =
    [...weeklyWinners].reverse().find((w) => w.points > 0) || weeklyWinners[0];
  const monthInPlay = months.find((m) => m.gws.includes(currentGW));
  const currentMonth =
    (monthInPlay && monthlyAwards.find((a) => a.monthName === monthInPlay.name)) ||
    monthlyAwards[0];

  const podiumCards = [
    {
      standing: top3Classic[1],
      rank: 2 as const,
      watermark: '02',
      title: 'Á quân',
      prize: '500.000đ',
      surfaceClass: 'podium-2',
      orderClass: 'order-2 sm:order-1',
      elevateClass: '',
      avatarSize: 'lg' as const,
      accentColor: 'var(--accent-silver)',
      showCrown: false,
    },
    {
      standing: top3Classic[0],
      rank: 1 as const,
      watermark: '01',
      title: 'Dẫn đầu',
      prize: '800.000đ',
      surfaceClass: 'podium-1',
      orderClass: 'order-1 sm:order-2',
      elevateClass: 'sm:-translate-y-2.5',
      avatarSize: 'xl' as const,
      accentColor: 'var(--accent-gold)',
      showCrown: true,
    },
    {
      standing: top3Classic[2],
      rank: 3 as const,
      watermark: '03',
      title: 'Hạng ba',
      prize: '200.000đ',
      surfaceClass: 'podium-3',
      orderClass: 'order-3 sm:order-3',
      elevateClass: '',
      avatarSize: 'lg' as const,
      accentColor: 'var(--accent-bronze)',
      showCrown: false,
    },
  ];

  return (
    <div className="space-y-10 md:space-y-14">
      {/* ASYMMETRICAL BENTO ROW 1: 7-Col Sculpted Collector Podium + 5-Col Round & Month Honors */}
      <Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          {/* Sculpted Championship Collector Stage (7 cols) */}
          <div className="lg:col-span-7 bezel-shell flex">
            <div className="bezel-core w-full p-5 sm:p-7 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <span className="eyebrow-pill mb-2">
                    <Trophy className="w-3 h-3" strokeWidth={1.7} style={{ color: 'var(--accent-gold)' }} />
                    <span>Classic Championship</span>
                  </span>
                  <h2
                    className="text-xl sm:text-2xl font-display font-extrabold tracking-tight"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Bục vinh quang toàn mùa
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Xếp theo tổng điểm thực tế sau khi trừ phí chuyển nhượng
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTab('classic')}
                  className="btn-island-ghost group flex-shrink-0"
                >
                  <span className="hidden sm:inline">Toàn bộ BXH</span>
                  <span className="sm:hidden">BXH</span>
                  <span className="btn-island-icon">
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.7} />
                  </span>
                </button>
              </div>

              {/* 3 Sculpted Athlete Collector Podium Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-3.5 pt-1 sm:pt-3 items-end">
                {podiumCards.map((card) => {
                  const player = card.standing;
                  const total = player?.total || 0;
                  const diff = card.rank === 1 ? 0 : total - leaderTotal;

                  return (
                    <div
                      key={card.rank}
                      onClick={() => player && onSelectPlayer(player.id)}
                      className={`pressable ${card.orderClass} ${card.elevateClass} ${card.surfaceClass} relative overflow-hidden rounded-3xl p-4 ${
                        card.rank === 1 ? 'sm:px-3.5 sm:pt-7 sm:pb-5' : 'sm:px-3.5 sm:pt-5 sm:pb-5'
                      } cursor-pointer transition-transform duration-300 ease-out-strong sm:hover:-translate-y-1 flex sm:flex-col items-center sm:text-center justify-between gap-3.5 sm:gap-0`}
                    >
                      {/* Architectural Oversized Watermark Numeral */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none select-none absolute -top-2 right-2.5 text-5xl sm:text-6xl font-stats font-extrabold tracking-tighter opacity-[0.08]"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {card.watermark}
                      </span>

                      <div className="flex sm:flex-col items-center gap-3.5 sm:gap-0 min-w-0 z-10">
                        <PlayerAvatar
                          name={player?.manager || `HLV #${card.rank}`}
                          avatarUrl={player?.avatarUrl}
                          clubLogoUrl={player?.clubLogoUrl}
                          favoriteClub={player?.favoriteClub}
                          rank={card.rank}
                          size={card.avatarSize}
                          showCrown={card.showCrown}
                          showClubBadge
                          className="sm:mb-3.5"
                        />

                        <div className="min-w-0 sm:w-full">
                          <span
                            className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.14em]"
                            style={{ color: card.accentColor }}
                          >
                            {card.title}
                          </span>
                          <p
                            className="text-sm sm:text-base font-display font-extrabold truncate mt-0.5"
                            style={{ color: 'var(--text-main)' }}
                          >
                            {player?.manager || `Hạng ${card.rank}`}
                          </p>
                          <p
                            className="text-[11px] truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {player?.team || 'HTCV Team'}
                          </p>
                        </div>
                      </div>

                      <div
                        className="text-right sm:text-center sm:w-full sm:mt-4 sm:pt-3 sm:border-t z-10 flex-shrink-0"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex sm:justify-center items-baseline justify-end gap-1.5">
                          <span
                            className={`${
                              card.rank === 1 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                            } font-stats font-extrabold tabular-nums leading-none`}
                            style={{ color: 'var(--text-main)' }}
                          >
                            {total}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                            pts
                          </span>
                        </div>

                        <div className="flex items-center justify-end sm:justify-center gap-1.5 mt-1.5">
                          <span
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                card.rank === 1 ? 'var(--accent-gold-soft)' : 'var(--bg-card)',
                              color: card.rank === 1 ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              boxShadow: '0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            {card.prize}
                          </span>
                          {card.rank > 1 && total > 0 && (
                            <span
                              className="text-[10px] font-mono tabular-nums"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              {diff}đ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Stacked Honor Cards (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:gap-6">
            {/* Latest Weekly Winner */}
            <div className="bezel-shell bezel-interactive flex-1 flex">
              <div
                onClick={() => onSelectTab('weekly')}
                className="bezel-core w-full p-5 sm:p-6 flex flex-col justify-between cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow-pill">
                    <Zap className="w-3 h-3" strokeWidth={1.7} style={{ color: 'var(--accent-primary)' }} />
                    <span>Nhất vòng gần nhất</span>
                  </span>
                  <span
                    className="text-xs font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--accent-primary-soft)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    +50.000đ
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 my-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PlayerAvatar
                      name={latestWinner?.winner || 'Chờ GW1'}
                      size="lg"
                      rank={1}
                      showClubBadge
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        Gameweek {latestWinner?.gw || 1}
                      </p>
                      <h3
                        className="text-lg sm:text-xl font-display font-extrabold truncate mt-0.5"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {latestWinner?.winner || 'Chờ kết quả GW1'}
                      </h3>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Điểm cao nhất vòng đấu
                      </p>
                    </div>
                  </div>

                  {latestWinner?.points > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-3xl font-stats font-extrabold tabular-nums leading-none"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {latestWinner.points}
                      </p>
                      <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
                        điểm vòng
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className="pt-3 flex items-center justify-between text-xs font-medium"
                  style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  <span>Tra cứu lịch sử 38 giải tuần</span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.6}
                    style={{ color: 'var(--accent-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Active Monthly Race */}
            <div className="bezel-shell bezel-interactive flex-1 flex">
              <div
                onClick={() => onSelectTab('monthly')}
                className="bezel-core w-full p-5 sm:p-6 flex flex-col justify-between cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="eyebrow-pill">
                      <Calendar className="w-3 h-3" strokeWidth={1.7} style={{ color: 'var(--accent-secondary)' }} />
                      <span>{currentMonth?.monthName || 'Tháng hiện tại'}</span>
                    </span>
                    {isLive && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                        style={{
                          backgroundColor: 'var(--accent-tertiary-soft)',
                          color: 'var(--accent-tertiary)',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse-soft"
                          style={{ backgroundColor: 'var(--accent-tertiary)' }}
                        />
                        LIVE GW{currentGW}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--accent-secondary-soft)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    100K × 2
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                  <div className="surface-well p-3.5 flex items-center gap-3">
                    <PlayerAvatar
                      name={currentMonth?.classicWinner || 'Classic'}
                      size="sm"
                      showClubBadge
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[10px] uppercase font-mono font-semibold tracking-wider"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Classic tháng
                      </p>
                      <p
                        className="text-xs sm:text-sm font-display font-bold truncate mt-0.5"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {currentMonth?.classicWinner || 'Chưa chốt'}
                      </p>
                      <p
                        className="text-xs font-mono font-bold tabular-nums"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {currentMonth?.classicPoints ? `${currentMonth.classicPoints} pts` : '0 pts'}
                      </p>
                    </div>
                  </div>

                  <div className="surface-well p-3.5 flex items-center gap-3">
                    <PlayerAvatar
                      name={currentMonth?.h2hWinner || 'H2H'}
                      size="sm"
                      showClubBadge
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[10px] uppercase font-mono font-semibold tracking-wider"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        H2H tháng
                      </p>
                      <p
                        className="text-xs sm:text-sm font-display font-bold truncate mt-0.5"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {currentMonth?.h2hWinner || 'Chưa chốt'}
                      </p>
                      <p
                        className="text-xs font-mono font-bold tabular-nums"
                        style={{ color: 'var(--accent-secondary)' }}
                      >
                        {currentMonth?.h2hPoints ? `${currentMonth.h2hPoints} Pts` : '0 Pts'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="pt-3 flex items-center justify-between text-xs font-medium"
                  style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  <span>Chặng {currentMonth?.gwRange || monthInPlay?.range || 'GW1-GW2'}</span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.6}
                    style={{ color: 'var(--accent-secondary)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* DUAL TOP 5 STANDINGS WITH PROPORTIONAL TELEMETRY SCORE BARS */}
      <Reveal delayMs={60}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          {/* Top 5 Classic */}
          <div className="bezel-shell">
            <div className="bezel-core p-5 sm:p-6">
              <div
                className="flex items-center justify-between pb-4 mb-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--accent-primary-soft)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Trophy className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h3
                      className="text-sm sm:text-base font-display font-bold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      Top 5 Classic League
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Tổng điểm tích lũy toàn mùa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('classic')}
                  className="pressable text-xs font-semibold flex items-center gap-1"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <span>Xem đủ 14 đội</span>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {top5Classic.map((p, idx) => {
                  const pct = Math.max(12, Math.min(100, Math.round((p.total / maxClassic) * 100)));
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPlayer(p.id)}
                      className="pressable py-3 px-2 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-[var(--table-row-hover)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-5 text-center font-mono font-bold text-xs tabular-nums"
                            style={{
                              color:
                                idx === 0
                                  ? 'var(--accent-gold)'
                                  : idx === 1
                                  ? 'var(--text-main)'
                                  : idx === 2
                                  ? 'var(--accent-bronze)'
                                  : 'var(--text-faint)',
                            }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <PlayerAvatar
                            name={p.manager}
                            avatarUrl={p.avatarUrl}
                            clubLogoUrl={p.clubLogoUrl}
                            favoriteClub={p.favoriteClub}
                            size="sm"
                            showClubBadge
                          />
                          <div className="min-w-0">
                            <p
                              className="text-xs sm:text-sm font-bold truncate font-display"
                              style={{ color: 'var(--text-main)' }}
                            >
                              {p.manager}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                              {p.team}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className="text-sm sm:text-base font-stats font-extrabold tabular-nums"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {p.total}{' '}
                            <span className="text-[10px] font-mono font-normal" style={{ color: 'var(--text-muted)' }}>
                              pts
                            </span>
                          </p>
                          <p className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                            TB {p.average}
                          </p>
                        </div>
                      </div>

                      {/* Broadcast Telemetry Score Bar */}
                      <div
                        className="mt-2 ml-8 h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full transition-transform duration-500 ease-out-strong origin-left"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: idx === 0 ? 'var(--accent-gold)' : 'var(--accent-primary)',
                            opacity: idx === 0 ? 0.9 : 0.65,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top 5 H2H */}
          <div className="bezel-shell">
            <div className="bezel-core p-5 sm:p-6">
              <div
                className="flex items-center justify-between pb-4 mb-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--accent-secondary-soft)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    <Swords className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h3
                      className="text-sm sm:text-base font-display font-bold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      Top 5 Head-to-Head
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Thắng 3 điểm, hòa 1 điểm, thua 0 điểm
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('h2h')}
                  className="pressable text-xs font-semibold flex items-center gap-1"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  <span>Lịch đấu & BXH</span>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {top5H2H.map((p, idx) => {
                  const pct = Math.max(12, Math.min(100, Math.round((p.points / maxH2H) * 100)));
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPlayer(p.id)}
                      className="pressable py-3 px-2 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-[var(--table-row-hover)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-5 text-center font-mono font-bold text-xs tabular-nums"
                            style={{
                              color:
                                idx === 0
                                  ? 'var(--accent-gold)'
                                  : idx === 1
                                  ? 'var(--text-main)'
                                  : idx === 2
                                  ? 'var(--accent-bronze)'
                                  : 'var(--text-faint)',
                            }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <PlayerAvatar
                            name={p.manager}
                            avatarUrl={p.avatarUrl}
                            clubLogoUrl={p.clubLogoUrl}
                            favoriteClub={p.favoriteClub}
                            size="sm"
                            showClubBadge
                          />
                          <div className="min-w-0">
                            <p
                              className="text-xs sm:text-sm font-bold truncate font-display"
                              style={{ color: 'var(--text-main)' }}
                            >
                              {p.manager}
                            </p>
                            <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                              {p.played} trận · {p.won}T {p.drawn}H {p.lost}B
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className="text-sm sm:text-base font-stats font-extrabold tabular-nums"
                            style={{ color: 'var(--accent-secondary)' }}
                          >
                            {p.points}{' '}
                            <span className="text-[10px] font-mono font-normal" style={{ color: 'var(--text-muted)' }}>
                              Pts
                            </span>
                          </p>
                          <p className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                            Classic {p.classicTotal}
                          </p>
                        </div>
                      </div>

                      {/* Broadcast Telemetry Score Bar */}
                      <div
                        className="mt-2 ml-8 h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full transition-transform duration-500 ease-out-strong origin-left"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: idx === 0 ? 'var(--accent-gold)' : 'var(--accent-secondary)',
                            opacity: idx === 0 ? 0.9 : 0.65,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
};
