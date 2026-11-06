import React, { useState, useEffect } from 'react';
import { Swords, Trophy, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { H2HStanding, H2HMatch, LiveGwData, H2HScheduleRow } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { INITIAL_PLAYERS } from '../data/initialData';
import { SquadPopupWrap } from './SquadTooltip';
import { fetchH2HSchedule } from '../services/fplApi';
import { Reveal } from './scroll-reveal';

interface H2HArenaProps {
  standings: H2HStanding[];
  currentGW?: number;
  isLive?: boolean;
  live?: LiveGwData | null;
  onSelectPlayer: (id: number) => void;
}

export const H2HArena: React.FC<H2HArenaProps> = ({
  standings,
  currentGW = 1,
  isLive = false,
  live = null,
  onSelectPlayer,
}) => {
  const [selectedGW, setSelectedGW] = useState<number>(currentGW);
  const [gwTouched, setGwTouched] = useState(false);

  useEffect(() => {
    if (!gwTouched) setSelectedGW(currentGW);
  }, [currentGW, gwTouched]);

  const chooseGW = (next: number) => {
    setGwTouched(true);
    setSelectedGW(next);
  };

  const teamOf = (id: number) => INITIAL_PLAYERS.find((p) => p.id === id)?.team || '';

  const [schedule, setSchedule] = useState<H2HScheduleRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchH2HSchedule().then((rows) => {
      if (!cancelled) setSchedule(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveMatches = (): H2HMatch[] | null => {
    if (!live || live.gw !== selectedGW || !live.h2h.length) return null;
    return live.h2h.map((fixture, idx) => ({
      gw: selectedGW,
      id: idx + 1,
      homePlayer: fixture.homeManager,
      homeTeam: teamOf(fixture.homeId),
      homePts: fixture.homePoints,
      homeH2HPts: fixture.homeH2HPoints,
      homeId: fixture.homeId,
      awayPlayer: fixture.awayManager,
      awayTeam: teamOf(fixture.awayId),
      awayPts: fixture.awayPoints,
      awayH2HPts: fixture.awayH2HPoints,
      awayId: fixture.awayId,
      result:
        fixture.homePoints === fixture.awayPoints
          ? 'Draw'
          : fixture.homePoints > fixture.awayPoints
          ? 'Home Win'
          : 'Away Win',
      diff: fixture.diff,
      played: true,
    }));
  };

  const scheduleMatches = (): H2HMatch[] | null => {
    if (!schedule) return null;
    const rows = schedule.filter((r) => r.gw === selectedGW);
    if (!rows.length) return [];
    return rows.map((r, idx) => ({
      gw: selectedGW,
      id: idx + 1,
      homePlayer: INITIAL_PLAYERS.find((p) => p.id === r.homeId)?.manager || `#${r.homeId}`,
      homeTeam: teamOf(r.homeId),
      homePts: r.homePts,
      homeH2HPts: r.homePts > r.awayPts ? 3 : r.homePts === r.awayPts ? 1 : 0,
      homeId: r.homeId,
      awayPlayer: INITIAL_PLAYERS.find((p) => p.id === r.awayId)?.manager || `#${r.awayId}`,
      awayTeam: teamOf(r.awayId),
      awayPts: r.awayPts,
      awayH2HPts: r.awayPts > r.homePts ? 3 : r.awayPts === r.homePts ? 1 : 0,
      awayId: r.awayId,
      result: r.played
        ? r.homePts === r.awayPts
          ? 'Draw'
          : r.homePts > r.awayPts
          ? 'Home Win'
          : 'Away Win'
        : 'Upcoming',
      diff: Math.abs(r.homePts - r.awayPts),
      played: r.played,
    }));
  };

  const liveNow = liveMatches();
  const matches = liveNow || scheduleMatches() || [];
  const showingLive = isLive && selectedGW === currentGW && !!liveNow;
  const scheduleLoading = !liveNow && schedule === null;

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="eyebrow-pill mb-2">
                <Swords className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-secondary)' }} />
                <span>Head-to-Head · #132702</span>
              </span>
              <h3
                className="text-xl sm:text-2xl font-display font-bold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                Đối đầu trực tiếp 1v1
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                7 cặp đấu mỗi vòng. Đội nhiều điểm vòng hơn nhận 3 điểm H2H, bằng điểm chia nhau 1 điểm.
              </p>
            </div>

            <div className="surface-well px-4 py-2.5 flex items-center gap-2 text-xs font-mono font-semibold flex-shrink-0">
              <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Vô địch H2H:</span>
              <span style={{ color: 'var(--accent-gold)' }}>800.000đ</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Matchday Fixtures */}
      <Reveal delayMs={40}>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-6">
            <div
              className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <h4
                  className="text-sm sm:text-base font-display font-bold"
                  style={{ color: 'var(--text-main)' }}
                >
                  Kết quả cặp đấu vòng {selectedGW}
                </h4>
                {showingLive && (
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
                    LIVE
                  </span>
                )}
              </div>

              <div
                className="inline-flex items-center gap-1 p-1 rounded-full"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  boxShadow: '0 0 0 1px var(--border-outer)',
                }}
              >
                <button
                  type="button"
                  onClick={() => chooseGW(Math.max(1, selectedGW - 1))}
                  disabled={selectedGW === 1}
                  aria-label="Vòng trước"
                  className="pressable w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ color: 'var(--text-main)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
                <span
                  className="text-xs font-mono font-semibold tabular-nums px-2.5"
                  style={{ color: 'var(--text-main)' }}
                >
                  GW {selectedGW} / 38
                </span>
                <button
                  type="button"
                  onClick={() => chooseGW(Math.min(38, selectedGW + 1))}
                  disabled={selectedGW === 38}
                  aria-label="Vòng kế tiếp"
                  className="pressable w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ color: 'var(--text-main)' }}
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {scheduleLoading ? (
                <p
                  className="text-xs font-mono col-span-full py-8 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Đang tải lịch bốc thăm chính thức từ FPL...
                </p>
              ) : matches.length === 0 ? (
                <p
                  className="text-xs font-mono col-span-full py-8 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Chưa có dữ liệu lịch đấu vòng {selectedGW}.
                </p>
              ) : (
                matches.map((m, idx) => {
                  const homeP = INITIAL_PLAYERS.find((p) => p.id === m.homeId);
                  const awayP = INITIAL_PLAYERS.find((p) => p.id === m.awayId);
                  const homeWon = m.played && m.homePts > m.awayPts;
                  const awayWon = m.played && m.awayPts > m.homePts;

                  return (
                    <div key={idx} className="surface-well surface-well-hover p-4">
                      <div
                        className="text-[10px] font-mono mb-3 flex items-center justify-between"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        <span>CẶP {String(idx + 1).padStart(2, '0')}</span>
                        <span>
                          {m.played
                            ? m.diff === 0
                              ? 'Hòa điểm'
                              : `Chênh ${m.diff} pts`
                            : 'Chưa đấu'}
                        </span>
                      </div>

                      {/* Home */}
                      <div className="flex items-center justify-between gap-2 py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            name={m.homePlayer}
                            avatarUrl={homeP?.avatarUrl}
                            clubLogoUrl={homeP?.clubLogoUrl}
                            favoriteClub={homeP?.favoriteClub}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{
                                color: homeWon ? 'var(--text-main)' : 'var(--text-secondary)',
                              }}
                            >
                              {m.homePlayer}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                              {m.homeTeam}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-xs font-mono font-bold tabular-nums px-2.5 py-1 rounded-lg cursor-help"
                          style={{
                            backgroundColor: homeWon ? 'var(--accent-primary-soft)' : 'var(--bg-card)',
                            color: homeWon ? 'var(--accent-primary)' : 'var(--text-main)',
                            boxShadow: '0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <SquadPopupWrap live={live} gw={selectedGW} managerId={m.homeId}>
                            <span>{m.played ? m.homePts : '-'}</span>
                          </SquadPopupWrap>
                        </span>
                      </div>

                      <div className="my-1.5 flex items-center gap-2">
                        <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                          vs
                        </span>
                        <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                      </div>

                      {/* Away */}
                      <div className="flex items-center justify-between gap-2 py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            name={m.awayPlayer}
                            avatarUrl={awayP?.avatarUrl}
                            clubLogoUrl={awayP?.clubLogoUrl}
                            favoriteClub={awayP?.favoriteClub}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{
                                color: awayWon ? 'var(--text-main)' : 'var(--text-secondary)',
                              }}
                            >
                              {m.awayPlayer}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                              {m.awayTeam}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-xs font-mono font-bold tabular-nums px-2.5 py-1 rounded-lg cursor-help"
                          style={{
                            backgroundColor: awayWon ? 'var(--accent-primary-soft)' : 'var(--bg-card)',
                            color: awayWon ? 'var(--accent-primary)' : 'var(--text-main)',
                            boxShadow: '0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <SquadPopupWrap live={live} gw={selectedGW} managerId={m.awayId}>
                            <span>{m.played ? m.awayPts : '-'}</span>
                          </SquadPopupWrap>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {/* H2H Standings Table */}
      <Reveal delayMs={70}>
        <div className="bezel-shell">
          <div className="bezel-core overflow-hidden">
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{
                backgroundColor: 'var(--table-head-bg)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h4 className="text-sm font-display font-bold" style={{ color: 'var(--text-main)' }}>
                  Bảng xếp hạng H2H toàn mùa
                </h4>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Xếp theo luật chính thức của FPL: Điểm H2H trước, tổng điểm Classic sau.
                </p>
              </div>
              <span className="md:hidden inline-flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                Vuốt ngang
              </span>
            </div>

            <div className="overflow-x-auto max-h-[620px] touch-scroll">
              <table className="w-full border-collapse text-left text-xs tabular-nums">
                <thead
                  className="font-mono text-[10px] sticky top-0 z-20 uppercase tracking-wider"
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
                    <th className="py-3 px-2 text-center w-10">Trận</th>
                    <th className="py-3 px-2 text-center w-10" style={{ color: 'var(--accent-primary)' }}>
                      T
                    </th>
                    <th className="py-3 px-2 text-center w-10">H</th>
                    <th className="py-3 px-2 text-center w-10" style={{ color: 'var(--accent-tertiary)' }}>
                      B
                    </th>
                    <th className="py-3 px-2 text-center w-12">GF</th>
                    <th className="py-3 px-2 text-center w-12">GA</th>
                    <th className="py-3 px-2 text-center w-12">GD</th>
                    <th
                      className="py-3 px-3 text-center min-w-[66px] font-semibold"
                      style={{
                        backgroundColor: 'var(--accent-secondary-soft)',
                        color: 'var(--accent-secondary)',
                      }}
                    >
                      H2H Pts
                    </th>
                    <th className="py-3 px-3 text-center min-w-[78px]">Classic</th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {standings.map((p) => {
                    const isRank1 = p.rank === 1;
                    const isRank2 = p.rank === 2;
                    const isRank3 = p.rank === 3;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer(p.id)}
                        className="transition-colors duration-150 cursor-pointer hover:bg-[var(--table-row-hover)]"
                        style={isRank1 ? { backgroundColor: 'var(--accent-gold-soft)' } : undefined}
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
                                style={{ color: isRank1 ? 'var(--accent-gold)' : 'var(--text-main)' }}
                              >
                                {p.manager}
                              </p>
                              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {p.team}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.played}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
                          {p.won}
                        </td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.drawn}
                        </td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--accent-tertiary)' }}>
                          {p.lost}
                        </td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.pointsFor}
                        </td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.pointsAgainst}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {p.goalDifference > 0 ? `+${p.goalDifference}` : p.goalDifference}
                        </td>
                        <td
                          className="py-3 px-3 text-center font-mono font-bold text-xs sm:text-sm"
                          style={{
                            color: 'var(--accent-secondary)',
                            backgroundColor: 'var(--accent-secondary-soft)',
                          }}
                        >
                          {p.points}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {p.classicTotal}
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
    </div>
  );
};
