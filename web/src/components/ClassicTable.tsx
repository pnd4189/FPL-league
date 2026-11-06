import React, { useState } from 'react';
import { Trophy, Search, ArrowLeftRight } from 'lucide-react';
import { ClassicStanding, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { SquadPopupWrap } from './SquadTooltip';
import { Reveal } from './scroll-reveal';

interface ClassicTableProps {
  standings: ClassicStanding[];
  currentGW?: number;
  isLive?: boolean;
  live?: LiveGwData | null;
  onSelectPlayer: (id: number) => void;
}

export const ClassicTable: React.FC<ClassicTableProps> = ({
  standings,
  currentGW = 1,
  isLive = false,
  live = null,
  onSelectPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStandings = standings.filter((p) => {
    const q = searchTerm.toLowerCase();
    return p.manager.toLowerCase().includes(q) || p.team.toLowerCase().includes(q);
  });

  const displayedGWs = Array.from({ length: 38 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header & Search */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="eyebrow-pill">
                  <Trophy className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />
                  <span>Classic League · #132688</span>
                </span>
                {isLive && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[13px] font-mono font-semibold"
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
              <h3
                className="text-xl sm:text-2xl font-display font-bold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                Bảng xếp hạng Classic toàn mùa
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Tổng điểm thực tế của 14 HLV từ vòng 1 đến vòng 38 sau khi trừ điểm phạt chuyển nhượng.
              </p>
            </div>

            <div className="relative w-full md:w-64 flex-shrink-0">
              <Search
                className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2"
                strokeWidth={1.5}
                style={{ color: 'var(--text-faint)' }}
              />
              <input
                type="text"
                placeholder="Tìm HLV hoặc tên đội..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full pl-9 pr-3.5 py-2 text-xs focus:outline-none transition-shadow duration-200"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  color: 'var(--text-main)',
                  boxShadow: '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)',
                }}
              />
            </div>
          </div>
        </div>
      </Reveal>

      {/* 38-GW Matrix Table */}
      <Reveal delayMs={50}>
        <div className="bezel-shell">
          <div className="bezel-core overflow-hidden">
            <div
              className="md:hidden flex items-center justify-between px-4 py-2 text-[13px] font-mono"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <span>14 HLV tranh tài</span>
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                Vuốt ngang xem 38 vòng
              </span>
            </div>

            <div className="overflow-x-auto max-h-[640px] touch-scroll">
              <table className="w-full border-collapse text-left text-xs tabular-nums">
                <thead
                  className="font-mono text-[13px] sticky top-0 z-20 uppercase tracking-wider"
                  style={{
                    backgroundColor: 'var(--table-head-bg)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <tr>
                    <th
                      className="py-3 px-2 sm:px-3 w-10 sm:w-12 text-center sticky left-0 z-30"
                      style={{
                        backgroundColor: 'var(--table-head-bg)',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      #
                    </th>
                    <th
                      className="py-3 px-3 sm:px-4 min-w-[145px] sm:min-w-[200px] sticky left-10 sm:left-12 z-30"
                      style={{
                        backgroundColor: 'var(--table-head-bg)',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      HLV & Đội bóng
                    </th>
                    <th
                      className="py-3 px-2.5 sm:px-3 text-center min-w-[58px] sm:min-w-[64px] font-semibold"
                      style={{
                        backgroundColor: isLive ? 'var(--accent-tertiary-soft)' : 'var(--accent-secondary-soft)',
                        color: isLive ? 'var(--accent-tertiary)' : 'var(--accent-secondary)',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      GW{currentGW}
                    </th>
                    <th
                      className="py-3 px-2.5 sm:px-3 text-center min-w-[68px] sm:min-w-[74px] font-semibold"
                      style={{
                        backgroundColor: 'var(--accent-primary-soft)',
                        color: 'var(--accent-primary)',
                        borderRight: '1px solid var(--border-subtle)',
                      }}
                    >
                      Tổng
                    </th>
                    <th
                      className="py-3 px-2.5 sm:px-3 text-center min-w-[56px]"
                      style={{ borderRight: '1px solid var(--border-subtle)' }}
                    >
                      TB
                    </th>
                    <th
                      className="py-3 px-2.5 sm:px-3 text-center min-w-[58px]"
                      style={{ borderRight: '1px solid var(--border-subtle)' }}
                    >
                      Cao nhất
                    </th>
                    {displayedGWs.map((gw) => (
                      <th
                        key={gw}
                        className="py-3 px-2 text-center min-w-[42px] font-normal"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        V{gw}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredStandings.map((p) => {
                    const isRank1 = p.rank === 1;
                    const isRank2 = p.rank === 2;
                    const isRank3 = p.rank === 3;
                    const gwPts = p.scores[currentGW - 1];

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer(p.id)}
                        className="transition-colors duration-150 cursor-pointer hover:bg-[var(--table-row-hover)]"
                        style={
                          isRank1
                            ? { backgroundColor: 'var(--accent-gold-soft)' }
                            : undefined
                        }
                      >
                        <td
                          className="py-3 px-2 sm:px-3 text-center font-mono font-semibold sticky left-0 z-10"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRight: '1px solid var(--border-subtle)',
                            color: isRank1
                              ? 'var(--accent-gold)'
                              : isRank2
                              ? 'var(--text-main)'
                              : isRank3
                              ? 'var(--accent-bronze)'
                              : 'var(--text-muted)',
                          }}
                        >
                          {String(p.rank).padStart(2, '0')}
                        </td>

                        <td
                          className="py-2.5 sm:py-3 px-3 sm:px-4 sticky left-10 sm:left-12 z-10 min-w-[145px] sm:min-w-[200px]"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRight: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar
                              name={p.manager}
                              avatarUrl={p.avatarUrl}
                              clubLogoUrl={p.clubLogoUrl}
                              favoriteClub={p.favoriteClub}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p
                                className="font-semibold truncate text-xs sm:text-[13px] font-display"
                                style={{
                                  color: isRank1 ? 'var(--accent-gold)' : 'var(--text-main)',
                                }}
                              >
                                {p.manager}
                              </p>
                              <p className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {p.team}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className="py-3 px-2.5 sm:px-3 text-center font-mono font-bold text-xs sm:text-[13px]"
                          style={{
                            color:
                              gwPts === null || gwPts === undefined
                                ? 'var(--text-faint)'
                                : isLive
                                ? 'var(--accent-tertiary)'
                                : 'var(--accent-secondary)',
                            borderRight: '1px solid var(--border-subtle)',
                          }}
                        >
                          <SquadPopupWrap live={live} gw={currentGW} managerId={p.id}>
                            <span className="cursor-help">
                              {gwPts === null || gwPts === undefined ? '-' : gwPts}
                            </span>
                          </SquadPopupWrap>
                        </td>

                        <td
                          className="py-3 px-3 text-center font-mono font-bold text-xs sm:text-sm"
                          style={{
                            color: 'var(--accent-primary)',
                            backgroundColor: 'var(--accent-primary-soft)',
                            borderRight: '1px solid var(--border-subtle)',
                          }}
                        >
                          {p.total}
                        </td>

                        <td
                          className="py-3 px-2.5 text-center font-mono"
                          style={{
                            color: 'var(--text-muted)',
                            borderRight: '1px solid var(--border-subtle)',
                          }}
                        >
                          {p.average}
                        </td>

                        <td
                          className="py-3 px-2.5 text-center font-mono font-semibold"
                          style={{
                            color: 'var(--text-secondary)',
                            borderRight: '1px solid var(--border-subtle)',
                          }}
                        >
                          {p.bestGW?.pts || 0}
                        </td>

                        {displayedGWs.map((gw) => {
                          const pts = p.scores[gw - 1];
                          return (
                            <td
                              key={gw}
                              className="py-3 px-2 text-center font-mono text-[14px]"
                              style={{
                                color:
                                  pts === null
                                    ? 'var(--text-faint)'
                                    : pts >= 75
                                    ? 'var(--accent-primary)'
                                    : pts >= 65
                                    ? 'var(--accent-secondary)'
                                    : pts <= 35 && pts > 0
                                    ? 'var(--accent-tertiary)'
                                    : 'var(--text-secondary)',
                              }}
                            >
                              {pts === null ? (
                                '-'
                              ) : pts >= 75 ? (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded font-bold"
                                  style={{ backgroundColor: 'var(--accent-primary-soft)' }}
                                >
                                  {pts}
                                </span>
                              ) : (
                                pts
                              )}
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
      </Reveal>
    </div>
  );
};
