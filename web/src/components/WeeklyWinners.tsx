import React, { useState, useEffect } from 'react';
import { Zap, Trophy, Award, CheckCircle2, Clock, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { WeeklyWinner, ClassicStanding, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { SquadPopupWrap } from './SquadTooltip';
import { shareAmount } from '../services/prizes';
import { Reveal } from './scroll-reveal';

interface WeeklyWinnersProps {
  winners: WeeklyWinner[];
  classicStandings?: ClassicStanding[];
  currentGW?: number | string;
  isLive?: boolean;
  live?: LiveGwData | null;
  onSelectPlayer?: (id: number) => void;
}

export const WeeklyWinners: React.FC<WeeklyWinnersProps> = ({
  winners,
  classicStandings = [],
  currentGW = 1,
  isLive = false,
  live = null,
  onSelectPlayer,
}) => {
  const activeGWNumber = typeof currentGW === 'number' ? currentGW : 1;
  const [selectedGW, setSelectedGW] = useState<number>(activeGWNumber);
  const [gwTouched, setGwTouched] = useState(false);

  // The gameweek arrives after the first render, and it moves on during the
  // season — follow it until the visitor browses to another gameweek.
  useEffect(() => {
    if (!gwTouched) setSelectedGW(activeGWNumber);
  }, [activeGWNumber, gwTouched]);

  const chooseGW = (next: number) => {
    setGwTouched(true);
    setSelectedGW(next);
  };

  const totalPrizeDistributed = winners.filter(w => w.points > 0).length * 50000;

  // Calculate live ranking of 14 managers for selectedGW
  const roundRankings = classicStandings.map(p => {
    const pts = p.scores[selectedGW - 1];
    return {
      id: p.id,
      manager: p.manager,
      team: p.team,
      avatarUrl: p.avatarUrl,
      clubLogoUrl: p.clubLogoUrl,
      favoriteClub: p.favoriteClub,
      fanClubNickname: p.fanClubNickname,
      clubColors: p.clubColors,
      points: pts !== null ? pts : 0,
      hasPlayed: pts !== null,
    };
  }).sort((a, b) => b.points - a.points);

  // Captain picks come from the live payload, so they exist for the gameweek
  // in progress; older gameweeks simply show a dash.
  const liveById = new Map((live?.scores || []).map(s => [s.id, s]));
  const captainOf = (id: number) => {
    const row = liveById.get(id);
    return live && live.gw === selectedGW && row?.captain ? row.captain : null;
  };

  // The 38-round history below comes from the settled weekly sheet, which can
  // lag FPL's live corrections while a gameweek is running. For the gameweek
  // in progress only, take the leader from the live-merged classic standings —
  // the same source the ranking table above uses — so both halves of this tab
  // agree. Joint leaders join as "A & B", matching how the sheet stores ties.
  const liveGwWinner = (gw: number): { winner: string; points: number } | null => {
    if (!live || !live.isLive || live.gw !== gw) return null;
    const played = classicStandings
      .map(p => ({ manager: p.manager, points: p.scores[gw - 1] }))
      .filter((p): p is { manager: string; points: number } => p.points !== null);
    if (!played.length) return null;
    const top = Math.max(...played.map(p => p.points));
    return {
      winner: played.filter(p => p.points === top).map(p => p.manager).join(' & '),
      points: top,
    };
  };

  const top1Score = roundRankings[0]?.points || 0;
  const isPlayed = roundRankings[0]?.hasPlayed;

  // Check if multiple managers tie for 1st place
  const tiedWinners = isPlayed && top1Score > 0
    ? roundRankings.filter(p => p.points === top1Score)
    : [roundRankings[0]];
  const isTie = tiedWinners.length > 1;
  const prizePerWinner = shareAmount(50000, tiedWinners.length);

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header Banner */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="eyebrow-pill">
                <Zap className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />
                <span>38 Vòng · 50.000 VNĐ / Gameweek</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Giải nhất tuần
              </h3>
              <p className="text-xs sm:text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Tổng quỹ thưởng tuần 1.900.000 VNĐ cho 38 vòng đấu. Đội ghi điểm cao nhất vòng nhận 50.000 VNĐ; trường hợp bằng điểm sẽ chia đều giải thưởng.
              </p>
            </div>

            <div className="surface-well px-4 py-3 flex items-center gap-3.5 flex-shrink-0">
              <div className="text-right">
                <p className="text-[13px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-faint)' }}>
                  Đã ghi nhận
                </p>
                <p className="text-base sm:text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                  {totalPrizeDistributed.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--accent-primary-soft)',
                  color: 'var(--accent-primary)',
                  boxShadow: 'inset 0 0 0 1px var(--border-highlight)',
                }}
              >
                <Trophy className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Live Round Leaderboard */}
      <Reveal delayMs={60}>
        <div className="bezel-shell-lg">
          <div className="bezel-core-lg p-5 sm:p-7 md:p-8">
            {/* Header & GW Selector */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b mb-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${isLive && selectedGW === activeGWNumber ? 'animate-pulse-soft' : ''}`}
                    style={{
                      backgroundColor: isLive && selectedGW === activeGWNumber ? 'var(--accent-tertiary)' : 'var(--accent-primary)',
                    }}
                  />
                  <h4 className="text-base sm:text-lg font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                    Bảng xếp hạng Gameweek {selectedGW}
                  </h4>
                  {isLive && selectedGW === activeGWNumber && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[13px] font-mono font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--accent-tertiary-soft)',
                        color: 'var(--accent-tertiary)',
                        boxShadow: 'inset 0 0 0 1px rgba(244, 63, 107, 0.28)',
                      }}
                    >
                      Live
                    </span>
                  )}
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[13px] font-mono font-semibold tabular-nums"
                    style={{
                      backgroundColor: 'var(--accent-primary-soft)',
                      color: 'var(--accent-primary)',
                      boxShadow: 'inset 0 0 0 1px var(--border-highlight)',
                    }}
                  >
                    {isTie ? `Chia đều ${prizePerWinner.toLocaleString('vi-VN')}đ` : 'Thưởng 50.000đ'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {isLive && selectedGW === activeGWNumber
                    ? (live?.autoSubsApplied
                        ? (live.autoSubsProvisional
                            ? 'Đã hết trận: đã tạm áp dụng dự bị tự động & đội phó, chờ FPL chốt chính thức'
                            : 'Điểm chính thức theo FPL: đã áp dụng dự bị tự động')
                        : 'Điểm tạm tính theo thời gian thực, tự cập nhật khi cầu thủ ghi điểm (chưa áp dụng dự bị tự động)')
                    : `Thứ hạng 14 HLV theo điểm số vòng đấu ${selectedGW}. Bấm hoặc di chuột vào ô điểm để xem đội hình 15 cầu thủ.`}
                </p>
              </div>

              {/* GW Selector Pill */}
              <div className="surface-well inline-flex items-center gap-1 p-1 rounded-full flex-shrink-0">
                <button
                  type="button"
                  onClick={() => chooseGW(Math.max(1, selectedGW - 1))}
                  disabled={selectedGW === 1}
                  aria-label="Vòng trước"
                  className="pressable w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-[background-color,opacity,transform] duration-200 ease-out-strong"
                  style={{ color: 'var(--text-main)' }}
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
                </button>
                <span className="text-xs font-mono font-semibold px-3 tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                  GW {selectedGW} / 38
                </span>
                <button
                  type="button"
                  onClick={() => chooseGW(Math.min(38, selectedGW + 1))}
                  disabled={selectedGW === 38}
                  aria-label="Vòng sau"
                  className="pressable w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition-[background-color,opacity,transform] duration-200 ease-out-strong"
                  style={{ color: 'var(--text-main)' }}
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            {/* Highlight Banner: Single Winner OR Joint Winners on Tie */}
            <div className="mb-6">
              {isTie ? (
                <div className="space-y-3">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[14px] font-mono font-semibold tabular-nums"
                    style={{
                      backgroundColor: 'var(--accent-gold-soft)',
                      color: 'var(--accent-gold)',
                      boxShadow: 'inset 0 0 0 1px rgba(228, 191, 106, 0.28)',
                    }}
                  >
                    <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>
                      Đồng hạng nhất · Chia đều {prizePerWinner.toLocaleString('vi-VN')}đ / HLV ({tiedWinners.length} đội bằng điểm)
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 ${tiedWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    {tiedWinners.map((winner, idx) => (
                      <div
                        key={winner.id || idx}
                        onClick={() => winner?.id && onSelectPlayer && onSelectPlayer(winner.id)}
                        className="podium-1 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <PlayerAvatar
                            name={winner.manager}
                            avatarUrl={winner.avatarUrl}
                            clubLogoUrl={winner.clubLogoUrl}
                            favoriteClub={winner.favoriteClub}
                            size="lg"
                            rank={1}
                            showCrown={true}
                          />
                          <div className="min-w-0">
                            <span
                              className="inline-block text-[13px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--accent-gold-soft)', color: 'var(--accent-gold)' }}
                            >
                              Đồng nhất vòng
                            </span>
                            <h5 className="text-base font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                              {winner.manager}
                            </h5>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                            {winner.points} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                          </p>
                          <span className="text-[14px] font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                            +{prizePerWinner.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => roundRankings[0]?.id && onSelectPlayer && onSelectPlayer(roundRankings[0].id)}
                  className="podium-1 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PlayerAvatar
                      name={roundRankings[0]?.manager || 'Chờ GW'}
                      avatarUrl={roundRankings[0]?.avatarUrl}
                      clubLogoUrl={roundRankings[0]?.clubLogoUrl}
                      favoriteClub={roundRankings[0]?.favoriteClub}
                      size="lg"
                      rank={1}
                      showCrown={true}
                    />
                    <div className="min-w-0">
                      <span
                        className="inline-block text-[13px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--accent-gold-soft)', color: 'var(--accent-gold)' }}
                      >
                        Dẫn đầu vòng · 50.000đ
                      </span>
                      <h5 className="text-base sm:text-lg font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                        {roundRankings[0]?.manager || 'Chờ thi đấu'}
                      </h5>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{roundRankings[0]?.team}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                      {roundRankings[0]?.points || 0}{' '}
                      <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                    </p>
                    <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                      +50.000 VNĐ
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 14 Managers Full Round Table */}
            <div
              className="overflow-x-auto rounded-2xl border touch-scroll max-h-[580px]"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}
            >
              <div
                className="md:hidden flex items-center justify-between px-3.5 py-2 border-b text-[13px] font-mono"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span>Bảng điểm Gameweek {selectedGW}</span>
                <span>Vuốt ngang để xem đầy đủ</span>
              </div>
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
                      className="py-3 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[195px] sticky left-10 sm:left-12 z-30 border-r"
                      style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                    >
                      HLV & Đội bóng
                    </th>
                    <th className="py-3 px-3 text-center min-w-[88px]">
                      Điểm GW{selectedGW}
                    </th>
                    <th className="py-3 px-3 text-left min-w-[115px]">Captain</th>
                    <th className="py-3 px-3 text-center min-w-[76px]">Điểm C</th>
                    <th className="py-3 px-3 sm:px-4 text-right min-w-[125px]">Thưởng tuần</th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {roundRankings.map((p, idx) => {
                    const rankNum = idx + 1;
                    const isWinnerRow = isPlayed && p.points === top1Score && top1Score > 0;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                        className="transition-colors duration-150 cursor-pointer"
                        style={{
                          backgroundColor: isWinnerRow ? 'var(--accent-primary-soft)' : undefined,
                        }}
                      >
                        <td
                          className="py-3 px-2 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 border-r"
                          style={{
                            backgroundColor: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-subtle)',
                            color: isWinnerRow
                              ? 'var(--accent-primary)'
                              : rankNum === 2
                              ? 'var(--text-main)'
                              : rankNum === 3
                              ? 'var(--accent-gold)'
                              : 'var(--text-muted)',
                          }}
                        >
                          {isWinnerRow && isTie ? 1 : rankNum}
                        </td>

                        <td
                          className="py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[140px] sm:min-w-[195px]"
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
                              <p className="font-semibold truncate text-xs sm:text-sm font-display" style={{ color: 'var(--text-main)' }}>
                                {p.manager}
                              </p>
                              <p className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {p.team}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className="py-3 px-3 text-center font-mono font-bold text-xs sm:text-sm"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {(() => {
                            const cell = (
                              <span className="cursor-help">
                                {p.hasPlayed ? p.points : '-'}{' '}
                                <span className="text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}>
                                  pts
                                </span>
                              </span>
                            );
                            return (
                              <SquadPopupWrap live={live} gw={selectedGW} managerId={p.id}>
                                {cell}
                              </SquadPopupWrap>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-3 text-left">
                          {(() => {
                            const cap = captainOf(p.id);
                            if (!cap) {
                              return (
                                <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                                  -
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 min-w-0">
                                <span
                                  className="text-[12px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{
                                    backgroundColor: cap.mult === 3 ? 'var(--accent-secondary-soft)' : 'var(--accent-tertiary-soft)',
                                    color: cap.mult === 3 ? 'var(--accent-secondary)' : 'var(--accent-tertiary)',
                                  }}
                                >
                                  {cap.mult === 3 ? 'TC' : 'C'}
                                </span>
                                <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                                  {cap.name}
                                </span>
                                <span className="text-[13px] font-mono flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
                                  {cap.team}
                                </span>
                              </span>
                            );
                          })()}
                        </td>

                        <td
                          className="py-3 px-3 text-center font-mono font-bold text-xs sm:text-sm"
                          style={{ color: captainOf(p.id) ? 'var(--text-main)' : 'var(--text-faint)' }}
                        >
                          {(() => {
                            const cap = captainOf(p.id);
                            return cap ? cap.pts * cap.mult : '-';
                          })()}
                        </td>

                        <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-xs">
                          {isWinnerRow ? (
                            <span
                              className="inline-block font-bold px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: 'var(--accent-primary-soft)',
                                color: 'var(--accent-primary)',
                                boxShadow: 'inset 0 0 0 1px var(--border-highlight)',
                              }}
                            >
                              +{prizePerWinner.toLocaleString('vi-VN')} đ{isTie ? ' (chia đều)' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>-</span>
                          )}
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

      {/* 38 Gameweek Grid */}
      <Reveal delayMs={110}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <h4 className="text-base sm:text-lg font-display font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Award className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />
              <span>Hồ sơ 38 vòng đấu</span>
            </h4>
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
              38 × 50.000 VNĐ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {winners.map((w) => {
              const liveInfo = liveGwWinner(w.gw);
              const hasWinner = w.points > 0 || !!liveInfo;
              const winnerName = liveInfo ? liveInfo.winner : w.winner;
              const winnerPoints = liveInfo ? liveInfo.points : w.points;
              return (
                <div
                  key={w.gw}
                  onClick={() => chooseGW(w.gw)}
                  className="bezel-shell bezel-interactive cursor-pointer"
                >
                  <div className="bezel-core p-4 h-full flex flex-col justify-between">
                    <div>
                      <div
                        className="flex items-center justify-between pb-3 border-b mb-3"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[14px] font-mono font-semibold tabular-nums"
                          style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)' }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: hasWinner ? 'var(--accent-primary)' : 'var(--text-faint)' }}
                          />
                          GW {w.gw}
                        </div>

                        <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                          50.000đ
                        </span>
                      </div>

                      {hasWinner ? (
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={winnerName} size="md" rank={1} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-bold truncate font-display" style={{ color: 'var(--text-main)' }}>
                                {winnerName}
                              </p>
                              {liveInfo && (
                                <span
                                  className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[12px] font-mono font-bold uppercase tracking-wider"
                                  style={{
                                    backgroundColor: 'var(--accent-tertiary-soft)',
                                    color: 'var(--accent-tertiary)',
                                  }}
                                >
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                              {winnerPoints} pts cao nhất
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 py-1">
                          <div
                            className="w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: 'var(--bg-card-solid)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-faint)',
                            }}
                          >
                            <Clock className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold font-display" style={{ color: 'var(--text-main)' }}>
                              Chưa khởi tranh
                            </p>
                            <p className="text-[14px]" style={{ color: 'var(--text-faint)' }}>
                              Chờ kết quả Gameweek {w.gw}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className="mt-3.5 pt-2.5 border-t flex items-center justify-between text-[13px] font-mono"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <span style={{ color: 'var(--text-faint)' }}>Thanh toán</span>
                      {w.paid ? (
                        <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-primary)' }}>
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.6} /> Đã trao giải
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {hasWinner ? 'Chờ thanh toán' : 'Chưa diễn ra'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
};
