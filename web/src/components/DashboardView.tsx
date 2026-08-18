import React from 'react';
import { Trophy, Swords, Zap, Calendar, ArrowUpRight, Crown } from 'lucide-react';
import { ClassicStanding, H2HStanding, WeeklyWinner, MonthlyAward, LeagueDashboardData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { MonthRange } from '../services/liveStandings';
import { MONTH_RANGES } from '../data/initialData';

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

  const latestWinner = weeklyWinners.find(w => w.points > 0) || weeklyWinners[0];
  // Show the month actually in play, not whichever row happens to be first.
  const monthInPlay = months.find(m => m.gws.includes(currentGW));
  const currentMonth =
    (monthInPlay && monthlyAwards.find(a => a.monthName === monthInPlay.name)) || monthlyAwards[0];

  return (
    <div className="space-y-8">
      
      {/* 🏆 Top 3 Podium (Bục Vinh Quang) */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: 'var(--accent-gold)' }}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Bục Vinh Quang Classic (Top 3 Hiện Tại)
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cuộc đua ngôi vương mùa giải 2026-2027</p>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('classic')}
            className="interactive flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: 'var(--accent-secondary)' }}
          >
            <span>Xem BXH Đầy Đủ</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Podium Steps Layout (Mobile Responsive 3-Column Grid) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 max-w-2xl mx-auto pt-4 sm:pt-6 pb-2 items-end">
          
          {/* Rank 2 (Silver) */}
          <div
            onClick={() => top3Classic[1] && onSelectPlayer(top3Classic[1].id)}
            className="interactive flex flex-col items-center cursor-pointer group"
          >
            <PlayerAvatar
              name={top3Classic[1]?.manager || 'HLV #2'}
              avatarUrl={top3Classic[1]?.avatarUrl}
              clubLogoUrl={top3Classic[1]?.clubLogoUrl}
              favoriteClub={top3Classic[1]?.favoriteClub}
              rank={2}
              size="lg"
              className="mb-2 sm:mb-3 group-hover:scale-110 transition-transform"
            />
            <div className="w-full text-center">
              <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase font-mono mb-1"
                style={{ backgroundColor: 'rgba(226, 232, 240, 0.15)', color: '#cbd5e1' }}
              >
                <Crown className="w-2.5 h-2.5 fill-current" />
                Á Quân
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm font-extrabold truncate font-display" style={{ color: 'var(--text-main)' }}>
                {top3Classic[1]?.manager || 'Vị trí #2'}
              </p>
              <p className="text-[9px] sm:text-[10px] truncate my-0.5" style={{ color: 'var(--text-muted)' }}>{top3Classic[1]?.team}</p>
              <div className="podium-2 rounded-t-xl py-2 sm:py-3 px-1 sm:px-2 flex flex-col items-center border-t-2" style={{ borderColor: '#e2e8f0' }}>
                <span className="text-[10px] sm:text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>#2</span>
                <span className="text-xs sm:text-sm md:text-lg font-black font-mono" style={{ color: 'var(--text-main)' }}>
                  {top3Classic[1]?.total || 0} <span className="text-[9px] sm:text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>500.000đ</span>
              </div>
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div
            onClick={() => top3Classic[0] && onSelectPlayer(top3Classic[0].id)}
            className="interactive flex flex-col items-center cursor-pointer group -translate-y-1.5 sm:-translate-y-2"
          >
            <PlayerAvatar
              name={top3Classic[0]?.manager || 'HLV #1'}
              avatarUrl={top3Classic[0]?.avatarUrl}
              clubLogoUrl={top3Classic[0]?.clubLogoUrl}
              favoriteClub={top3Classic[0]?.favoriteClub}
              rank={1}
              size="xl"
              showCrown={true}
              className="mb-2 sm:mb-3 group-hover:scale-110 transition-transform"
            />
            <div className="w-full text-center">
              <div className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase font-mono mb-1 shadow-sm"
                style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)', color: 'var(--accent-gold)' }}
              >
                <Crown className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-current" />
                King of The League
              </div>
              <p className="text-xs sm:text-sm md:text-base font-black truncate font-display" style={{ color: 'var(--accent-gold)' }}>
                {top3Classic[0]?.manager || 'Vị trí #1'}
              </p>
              <p className="text-[9px] sm:text-[10px] truncate my-0.5" style={{ color: 'var(--text-muted)' }}>{top3Classic[0]?.team}</p>
              <div className="podium-1 rounded-t-xl py-3 sm:py-5 px-1 sm:px-2 flex flex-col items-center shadow-lg border-t-2"
                style={{ borderColor: 'var(--accent-gold)' }}
              >
                <span className="text-[10px] sm:text-xs font-mono font-extrabold" style={{ color: 'var(--accent-gold)' }}>#1 CHAMPION</span>
                <span className="text-sm sm:text-base md:text-2xl font-black font-mono" style={{ color: 'var(--text-main)' }}>
                  {top3Classic[0]?.total || 0} <span className="text-[10px] sm:text-xs font-normal" style={{ color: 'var(--accent-gold)' }}>pts</span>
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold mt-0.5 sm:mt-1" style={{ color: 'var(--accent-gold)' }}>800.000đ</span>
              </div>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div
            onClick={() => top3Classic[2] && onSelectPlayer(top3Classic[2].id)}
            className="interactive flex flex-col items-center cursor-pointer group"
          >
            <PlayerAvatar
              name={top3Classic[2]?.manager || 'HLV #3'}
              avatarUrl={top3Classic[2]?.avatarUrl}
              clubLogoUrl={top3Classic[2]?.clubLogoUrl}
              favoriteClub={top3Classic[2]?.favoriteClub}
              rank={3}
              size="lg"
              className="mb-2 sm:mb-3 group-hover:scale-110 transition-transform"
            />
            <div className="w-full text-center">
              <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase font-mono mb-1"
                style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}
              >
                <Crown className="w-2.5 h-2.5 fill-current" />
                Hạng 3
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm font-extrabold truncate font-display" style={{ color: '#f97316' }}>
                {top3Classic[2]?.manager || 'Vị trí #3'}
              </p>
              <p className="text-[9px] sm:text-[10px] truncate my-0.5" style={{ color: 'var(--text-muted)' }}>{top3Classic[2]?.team}</p>
              <div className="podium-3 rounded-t-xl py-1.5 sm:py-2 px-1 sm:px-2 flex flex-col items-center border-t-2" style={{ borderColor: '#f97316' }}>
                <span className="text-[10px] sm:text-xs font-mono font-bold" style={{ color: '#f97316' }}>#3</span>
                <span className="text-xs sm:text-sm md:text-lg font-black font-mono" style={{ color: 'var(--text-main)' }}>
                  {top3Classic[2]?.total || 0} <span className="text-[9px] sm:text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>200.000đ</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ⚔️ Dual Standings: Top 5 Classic vs Top 5 H2H */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Classic */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b mb-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Top 5 Classic League
              </h4>
            </div>
            <button
              onClick={() => onSelectTab('classic')}
              className="interactive text-xs font-semibold hover:underline flex items-center gap-1"
              style={{ color: 'var(--accent-primary)' }}
            >
              Toàn bộ BXH <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {top5Classic.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="interactive py-3 flex items-center justify-between hover:bg-white/5 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center font-mono font-bold text-xs"
                    style={{
                      color: idx === 0 ? 'var(--accent-gold)' : idx === 1 ? 'var(--text-main)' : idx === 2 ? '#f97316' : 'var(--text-faint)'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={p.manager}
                    avatarUrl={p.avatarUrl}
                    clubLogoUrl={p.clubLogoUrl}
                    favoriteClub={p.favoriteClub}
                    rank={idx + 1}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate font-display" style={{ color: 'var(--text-main)' }}>
                      {p.manager}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {p.team}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm sm:text-base font-black font-mono" style={{ color: 'var(--accent-primary)' }}>
                    {p.total} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    Avg: {p.average}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 H2H */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b mb-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
              <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Top 5 H2H League
              </h4>
            </div>
            <button
              onClick={() => onSelectTab('h2h')}
              className="interactive text-xs font-semibold hover:underline flex items-center gap-1"
              style={{ color: 'var(--accent-secondary)' }}
            >
              Toàn bộ BXH <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {top5H2H.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="interactive py-3 flex items-center justify-between hover:bg-white/5 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-center font-mono font-bold text-xs"
                    style={{
                      color: idx === 0 ? 'var(--accent-gold)' : idx === 1 ? 'var(--text-main)' : idx === 2 ? '#f97316' : 'var(--text-faint)'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <PlayerAvatar
                    name={p.manager}
                    avatarUrl={p.avatarUrl}
                    clubLogoUrl={p.clubLogoUrl}
                    favoriteClub={p.favoriteClub}
                    rank={idx + 1}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate font-display" style={{ color: 'var(--text-main)' }}>
                      {p.manager}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {p.played} Trận | {p.won}T {p.drawn}H {p.lost}B
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm sm:text-base font-black font-mono" style={{ color: 'var(--accent-secondary)' }}>
                    {p.points} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>Pts</span>
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    GD: {p.goalDifference > 0 ? `+${p.goalDifference}` : p.goalDifference}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🌟 Spotlight Honors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Weekly MVP Card */}
        <div className="glass-panel rounded-2xl p-5 border-l-4 relative overflow-hidden group"
          style={{ borderLeftColor: 'var(--accent-primary)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-xs"
              style={{ backgroundColor: 'rgba(0, 255, 135, 0.15)', color: 'var(--accent-primary)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Nhất Vòng Gần Nhất
            </span>
            <span className="text-xs font-mono font-extrabold" style={{ color: 'var(--accent-primary)' }}>
              +50.000đ
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <PlayerAvatar
              name={latestWinner.winner || 'Chờ GW1'}
              size="lg"
              rank={1}
            />
            <div>
              <h4 className="text-lg font-black font-display" style={{ color: 'var(--text-main)' }}>
                {latestWinner.winner || 'Chờ Gameweek 1'}
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Gameweek #{latestWinner.gw} • {latestWinner.points > 0 ? `${latestWinner.points} Điểm cao nhất tuần` : 'Mùa giải sắp khởi tranh'}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Champion Card */}
        <div className="glass-panel rounded-2xl p-5 border-l-4 relative overflow-hidden group"
          style={{ borderLeftColor: 'var(--accent-tertiary)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-xs"
              style={{ backgroundColor: 'rgba(233, 0, 82, 0.15)', color: 'var(--accent-tertiary)' }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Giải Tháng {currentMonth.monthName} ({currentMonth.gwRange || monthInPlay?.range})
              {isLive && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-black animate-pulse"
                  style={{ backgroundColor: '#ff2d55', color: '#ffffff' }}
                >
                  ● LIVE GW{currentGW}
                </span>
              )}
            </span>
            <span className="text-xs font-mono font-extrabold" style={{ color: 'var(--accent-tertiary)' }}>
              100.000đ × 2
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-xl p-2.5 border"
              style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-[10px] uppercase font-mono font-semibold" style={{ color: 'var(--text-faint)' }}>Nhất Classic</p>
              <p className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>{currentMonth.classicWinner}</p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--accent-tertiary)' }}>{currentMonth.classicPoints} pts</p>
            </div>

            <div className="rounded-xl p-2.5 border"
              style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-[10px] uppercase font-mono font-semibold" style={{ color: 'var(--text-faint)' }}>Nhất H2H</p>
              <p className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>{currentMonth.h2hWinner}</p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--accent-secondary)' }}>{currentMonth.h2hPoints} Pts</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
