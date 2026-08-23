import React, { useState, useEffect } from 'react';
import { Trophy, Search, Award, Crown } from 'lucide-react';
import { ClassicStanding, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { MonthRange } from '../services/liveStandings';
import { SquadPopupWrap } from './SquadTooltip';
import { MONTH_RANGES } from '../data/initialData';

interface ClassicTableProps {
  standings: ClassicStanding[];
  currentGW?: number;
  currentMonthName?: string;
  isLive?: boolean;
  live?: LiveGwData | null;
  months?: MonthRange[];
  onSelectPlayer: (id: number) => void;
}

export const ClassicTable: React.FC<ClassicTableProps> = ({
  standings,
  currentGW = 1,
  currentMonthName,
  isLive = false,
  live = null,
  months = MONTH_RANGES,
  onSelectPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Land on the month being played instead of making people hunt for it.
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName || 'all');
  const [monthTouched, setMonthTouched] = useState(false);

  // Follow the season forward until the visitor picks a month themselves.
  useEffect(() => {
    if (!monthTouched && currentMonthName) setSelectedMonth(currentMonthName);
  }, [currentMonthName, monthTouched]);

  const chooseMonth = (name: string) => {
    setMonthTouched(true);
    setSelectedMonth(name);
  };

  const filteredStandings = standings.filter(p => {
    const matchName = p.manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.team.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName;
  });

  // Determine displayed GWs
  let displayedGWs = Array.from({ length: 38 }, (_, i) => i + 1);
  if (selectedMonth !== 'all') {
    const month = months.find(m => m.name === selectedMonth);
    if (month) {
      displayedGWs = month.gws;
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Bảng Xếp Hạng Classic League (GW1 - GW38)
            </h3>
            {isLive && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black animate-pulse"
                style={{ backgroundColor: '#ff2d55', color: '#ffffff' }}
              >
                ● LIVE GW{currentGW}
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Tính tổng điểm FPL thực tế sau khi trừ điểm âm chuyển nhượng (Net Points). 14 HLV tranh tài.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Tìm HLV, Đội bóng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors border"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>
      </div>

      {/* Month Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => chooseMonth('all')}
          className={`interactive px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            selectedMonth === 'all'
              ? 'shadow-md scale-105'
              : 'opacity-70 hover:opacity-100'
          }`}
          style={selectedMonth === 'all' ? {
            backgroundColor: 'var(--accent-primary)',
            color: '#000000',
          } : {
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          Toàn Bộ Mùa (GW1-38)
        </button>
        {months.map(m => {
          const isSel = selectedMonth === m.name;
          return (
            <button
              key={m.name}
              onClick={() => chooseMonth(m.name)}
              className={`interactive flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                isSel ? 'shadow-md scale-105' : 'opacity-70 hover:opacity-100'
              }`}
              style={isSel ? {
                backgroundColor: 'var(--bg-card-hover)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-highlight)'
              } : {
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {m.name} ({m.range})
            </button>
          );
        })}
      </div>

      {/* Main Table Matrix with horizontal scroll & frozen columns */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span>🏆 BXH 14 HLV</span>
          <span>👉 Vuốt ngang xem 38 GW</span>
        </div>
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin touch-scroll">
          <table className="w-full border-collapse text-left text-xs">
            
            {/* Table Header */}
            <thead className="font-mono text-[11px] sticky top-0 z-20 uppercase border-b"
              style={{
                backgroundColor: 'var(--table-head-bg)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <tr>
                <th className="py-2.5 sm:py-3 px-1.5 sm:px-3 w-10 sm:w-12 text-center sticky left-0 z-30 border-r"
                  style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                >
                  #
                </th>
                <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 min-w-[135px] sm:min-w-[190px] sticky left-10 sm:left-12 z-30 border-r"
                  style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                >
                  HLV & Đội Bóng
                </th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[55px] sm:min-w-[62px] font-extrabold border-r"
                  style={{
                    backgroundColor: isLive ? 'rgba(255, 45, 85, 0.10)' : 'rgba(0, 245, 255, 0.06)',
                    color: isLive ? '#ff2d55' : 'var(--accent-secondary)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  {isLive ? '⚡ ' : ''}GW{currentGW}
                </th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[65px] sm:min-w-[70px] font-extrabold border-r"
                  style={{
                    backgroundColor: 'rgba(0, 255, 135, 0.08)',
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  TOTAL
                </th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[55px] sm:min-w-[60px] border-r" style={{ borderColor: 'var(--border-subtle)' }}>
                  AVG
                </th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[55px] sm:min-w-[65px] border-r" style={{ borderColor: 'var(--border-subtle)' }}>
                  BEST
                </th>
                {displayedGWs.map(gw => (
                  <th key={gw} className="py-2.5 sm:py-3 px-2 text-center min-w-[40px] sm:min-w-[44px] font-normal" style={{ color: 'var(--text-faint)' }}>
                    GW{gw}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredStandings.map((p) => {
                const isRank1 = p.rank === 1;
                const isRank2 = p.rank === 2;
                const isRank3 = p.rank === 3;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer(p.id)}
                    className="interactive transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isRank1
                        ? 'rgba(255, 215, 0, 0.06)'
                        : isRank2
                        ? 'rgba(226, 232, 240, 0.04)'
                        : isRank3
                        ? 'rgba(249, 115, 22, 0.04)'
                        : undefined
                    }}
                  >
                    {/* Frozen Rank Column */}
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-subtle)',
                        color: isRank1 ? 'var(--accent-gold)' : isRank2 ? 'var(--text-main)' : isRank3 ? '#f97316' : 'var(--text-muted)'
                      }}
                    >
                      {p.rank}
                    </td>

                    {/* Frozen Manager Name Column */}
                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[135px] sm:min-w-[190px]"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <PlayerAvatar
                          name={p.manager}
                          avatarUrl={p.avatarUrl}
                          clubLogoUrl={p.clubLogoUrl}
                          favoriteClub={p.favoriteClub}
                          rank={p.rank}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="font-bold truncate text-[11px] sm:text-sm font-display flex items-center gap-1 sm:gap-1.5" style={{ color: 'var(--text-main)' }}>
                            {p.manager}
                            {isRank1 && <span title="Hạng 1 Classic" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#ffd700] text-[#ffd700]" /></span>}
                            {isRank2 && <span title="Hạng 2 Classic" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#e2e8f0] text-[#cbd5e1]" /></span>}
                            {isRank3 && <span title="Hạng 3 Classic" className="inline-flex flex-shrink-0"><Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 fill-[#ea580c] text-[#f97316]" /></span>}
                          </p>
                          <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {p.team}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Current gameweek points — live while the round runs */}
                    {(() => {
                      const gwPts = p.scores[currentGW - 1];
                      return (
                        <td className="py-3 px-2 sm:px-3 text-center font-mono font-black text-xs sm:text-sm border-r"
                          style={{
                            color: gwPts === null || gwPts === undefined
                              ? 'var(--text-faint)'
                              : isLive ? '#ff2d55' : 'var(--accent-secondary)',
                            borderColor: 'var(--border-subtle)'
                          }}
                        >
                          <SquadPopupWrap live={live} gw={currentGW} managerId={p.id}>
                            <span className="cursor-help">{gwPts === null || gwPts === undefined ? '-' : gwPts}</span>
                          </SquadPopupWrap>
                        </td>
                      );
                    })()}

                    {/* Total Points */}
                    <td className="py-3 px-3 text-center font-mono font-black text-xs sm:text-sm border-r"
                      style={{
                        color: 'var(--accent-primary)',
                        backgroundColor: 'rgba(0, 255, 135, 0.06)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      {p.total}
                    </td>

                    {/* Average */}
                    <td className="py-3 px-3 text-center font-mono border-r" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                      {p.average}
                    </td>

                    {/* Best GW */}
                    <td className="py-3 px-3 text-center font-mono font-bold border-r" style={{ color: 'var(--accent-secondary)', borderColor: 'var(--border-subtle)' }}>
                      {p.bestGW?.pts || 0}
                    </td>

                    {/* GW 1 to 38 Points */}
                    {displayedGWs.map(gw => {
                      const pts = p.scores[gw - 1];
                      return (
                        <td
                          key={gw}
                          className="py-3 px-2 text-center font-mono text-[11px]"
                          style={{
                            color: pts === null
                              ? 'var(--text-faint)'
                              : pts >= 80
                              ? 'var(--accent-primary)'
                              : pts >= 60
                              ? 'var(--accent-secondary)'
                              : pts <= 35 && pts > 0
                              ? 'var(--accent-tertiary)'
                              : 'var(--text-main)'
                          }}
                        >
                          {pts === null ? '-' : pts}
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};
