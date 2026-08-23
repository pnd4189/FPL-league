import React, { useState, useEffect } from 'react';
import { Swords, Trophy, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { H2HStanding, H2HMatch, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { INITIAL_PLAYERS, getH2HMatchupsForGW } from '../data/initialData';
import { SquadPopupWrap } from './SquadTooltip';

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

  // Open on the gameweek being played; keep following it until the visitor
  // navigates somewhere else themselves.
  useEffect(() => {
    if (!gwTouched) setSelectedGW(currentGW);
  }, [currentGW, gwTouched]);

  const chooseGW = (next: number) => {
    setGwTouched(true);
    setSelectedGW(next);
  };

  const teamOf = (id: number) => INITIAL_PLAYERS.find(p => p.id === id)?.team || '';

  /**
   * Real fixtures with provisional scores, published by the backend for the
   * gameweek in progress. Preferred over the generated round-robin because it
   * is the actual FPL draw and the points move while matches are on.
   */
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
    }));
  };

  // Fallback: generate 7 round-robin matchups for the selected GW
  const generateMatchups = (gw: number): H2HMatch[] => {
    const pairings = getH2HMatchupsForGW(gw, INITIAL_PLAYERS);
    return pairings.map((pair, idx) => {
      const homeStanding = standings.find(s => s.id === pair.home.id);
      const awayStanding = standings.find(s => s.id === pair.away.id);
      return {
        gw,
        id: idx + 1,
        homePlayer: pair.home.manager,
        homeTeam: pair.home.team,
        homePts: homeStanding ? homeStanding.pointsFor : 0,
        homeH2HPts: homeStanding ? homeStanding.points : 0,
        homeId: pair.home.id,
        awayPlayer: pair.away.manager,
        awayTeam: pair.away.team,
        awayPts: awayStanding ? awayStanding.pointsFor : 0,
        awayH2HPts: awayStanding ? awayStanding.points : 0,
        awayId: pair.away.id,
        result: 'Upcoming',
        diff: 0,
      };
    });
  };

  const matches = liveMatches() || generateMatchups(selectedGW);
  const showingLive = isLive && selectedGW === currentGW && !!liveMatches();

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Head-to-Head League Arena (Đá Vòng Tròn 1vs1)
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Tính điểm như Ngoại Hạng Anh: Thắng 3 điểm, Hòa 1 điểm, Thua 0 điểm. 7 cặp đấu nảy lửa mỗi vòng.
          </p>
        </div>

        {/* Prize Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border"
          style={{
            backgroundColor: 'var(--bg-card-hover)',
            borderColor: 'var(--border-highlight)',
            color: 'var(--accent-secondary)'
          }}
        >
          <Trophy className="w-4 h-4" />
          <span>Vô địch H2H: 800.000đ</span>
        </div>
      </div>

      {/* Matchday Match Center */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6">
        
        {/* GW Selector Carousel */}
        <div className="flex items-center justify-between pb-4 border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-secondary)' }} />
            <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Lịch Thi Đấu & Kết Quả Gameweek {selectedGW}
            </h4>
            {showingLive && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black animate-pulse"
                style={{ backgroundColor: '#ff2d55', color: '#ffffff' }}
              >
                ● LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => chooseGW(Math.max(1, selectedGW - 1))}
              disabled={selectedGW === 1}
              className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--accent-secondary)' }}>
              GW {selectedGW} / 38
            </span>
            <button
              onClick={() => chooseGW(Math.min(38, selectedGW + 1))}
              disabled={selectedGW === 38}
              className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)'
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7 Matchup Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m, idx) => {
            const homeP = INITIAL_PLAYERS.find(p => p.id === m.homeId);
            const awayP = INITIAL_PLAYERS.find(p => p.id === m.awayId);

            return (
              <div
                key={idx}
                className="rounded-xl p-3.5 border transition-all group"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="text-[10px] font-mono mb-2 flex items-center justify-between" style={{ color: 'var(--text-faint)' }}>
                  <span>TRẬN #{idx + 1}</span>
                  <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>Gameweek {m.gw}</span>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar
                      name={m.homePlayer}
                      clubLogoUrl={homeP?.clubLogoUrl}
                      favoriteClub={homeP?.favoriteClub}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                        {m.homePlayer}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.homeTeam}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold px-2 py-0.5 rounded cursor-help"
                    style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  >
                    <SquadPopupWrap live={live} gw={selectedGW} managerId={m.homeId}>
                      <span>{m.homePts > 0 ? m.homePts : '-'}</span>
                    </SquadPopupWrap>
                  </span>
                </div>

                {/* VS Divider */}
                <div className="text-center my-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>VS</span>
                </div>

                {/* Away Team */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar
                      name={m.awayPlayer}
                      clubLogoUrl={awayP?.clubLogoUrl}
                      favoriteClub={awayP?.favoriteClub}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                        {m.awayPlayer}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.awayTeam}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold px-2 py-0.5 rounded cursor-help"
                    style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                  >
                    <SquadPopupWrap live={live} gw={selectedGW} managerId={m.awayId}>
                      <span>{m.awayPts > 0 ? m.awayPts : '-'}</span>
                    </SquadPopupWrap>
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Main H2H Standings Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b" style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-sm font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
            Bảng Xếp Hạng H2H Chi Tiết
          </h4>
        </div>
        <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span>⚔️ BXH H2H 14 HLV</span>
          <span>👉 Vuốt ngang xem chỉ số</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin touch-scroll">
          <table className="w-full border-collapse text-left text-xs">
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
                <th className="py-2.5 sm:py-3 px-2 text-center w-9 sm:w-10">P</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-9 sm:w-10" style={{ color: 'var(--accent-primary)' }}>W</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-9 sm:w-10">D</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-9 sm:w-10" style={{ color: 'var(--accent-tertiary)' }}>L</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-10 sm:w-12">GF</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-10 sm:w-12">GA</th>
                <th className="py-2.5 sm:py-3 px-2 text-center w-10 sm:w-12">GD</th>
                <th className="py-2.5 sm:py-3 px-3 text-center min-w-[60px] font-black" style={{ color: 'var(--accent-secondary)' }}>PTS</th>
                <th className="py-2.5 sm:py-3 px-3 text-center min-w-[75px]">Classic</th>
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
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-subtle)',
                        color: isRank1 ? 'var(--accent-gold)' : isRank2 ? 'var(--text-main)' : isRank3 ? '#f97316' : 'var(--text-muted)'
                      }}
                    >
                      {p.rank}
                    </td>

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
                            {isRank1 && <span title="Hạng 1 H2H" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#ffd700] text-[#ffd700]" /></span>}
                            {isRank2 && <span title="Hạng 2 H2H" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#e2e8f0] text-[#cbd5e1]" /></span>}
                            {isRank3 && <span title="Hạng 3 H2H" className="inline-flex flex-shrink-0"><Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 fill-[#ea580c] text-[#f97316]" /></span>}
                          </p>
                          <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {p.team}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.played}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{p.won}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.drawn}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono" style={{ color: 'var(--accent-tertiary)' }}>{p.lost}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.pointsFor}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.pointsAgainst}</td>
                    <td className="py-2.5 sm:py-3 px-2 text-center font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                      {p.goalDifference > 0 ? `+${p.goalDifference}` : p.goalDifference}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-center font-mono font-black text-xs sm:text-sm" style={{ color: 'var(--accent-secondary)' }}>
                      {p.points}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 text-center font-mono text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
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
  );
};
