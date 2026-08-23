import React, { useState, useEffect } from 'react';
import { Zap, Trophy, Award, CheckCircle2, Clock, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { WeeklyWinner, ClassicStanding, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { SquadPopupWrap } from './SquadTooltip';
import { shareAmount } from '../services/prizes';

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

  const top1Score = roundRankings[0]?.points || 0;
  const isPlayed = roundRankings[0]?.hasPlayed;
  
  // Check if multiple managers tie for 1st place
  const tiedWinners = isPlayed && top1Score > 0 
    ? roundRankings.filter(p => p.points === top1Score)
    : [roundRankings[0]];
  const isTie = tiedWinners.length > 1;
  const prizePerWinner = shareAmount(50000, tiedWinners.length);

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Vinh Danh Nhất Tuần (50.000đ / Gameweek)
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Tổng cộng 38 giải nhất tuần = 1.900.000đ. Đội cao điểm nhất nhận 50k (nếu bằng điểm sẽ chia đều giải thưởng).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase font-mono" style={{ color: 'var(--text-faint)' }}>Đã trao thưởng</p>
            <p className="text-sm sm:text-base font-black font-mono" style={{ color: 'var(--accent-primary)' }}>{totalPrizeDistributed.toLocaleString('vi-VN')} đ</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--bg-card-hover)',
              borderColor: 'var(--border-highlight)',
              color: 'var(--accent-primary)'
            }}
          >
            <Trophy className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ⚡ BẢNG XẾP HẠNG TRỰC TIẾP VÒNG ĐANG DIỄN RA (LIVE ROUND LEADERBOARD) */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Header & GW Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b mb-6"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <div>
              <h4 className="text-base sm:text-lg font-display font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                BXH Trực Tiếp Gameweek {selectedGW}
                {isLive && selectedGW === activeGWNumber && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black animate-pulse"
                    style={{ backgroundColor: '#ff2d55', color: '#ffffff' }}
                  >
                    ● LIVE
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-highlight)'
                  }}
                >
                  {isTie ? `Chia đều ${prizePerWinner.toLocaleString('vi-VN')}đ` : 'Thưởng 50.000đ'}
                </span>
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isLive && selectedGW === activeGWNumber
                  ? 'Điểm tạm tính theo thời gian thực, tự cập nhật khi cầu thủ ghi điểm (chưa áp dụng dự bị tự động)'
                  : `Thứ tự xếp hạng 14 HLV theo điểm số vòng đấu ${selectedGW}`}
              </p>
            </div>
          </div>

          {/* GW Selector Carousel */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => chooseGW(Math.max(1, selectedGW - 1))}
              disabled={selectedGW === 1}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
              style={{ color: 'var(--text-main)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--accent-primary)' }}>
              Gameweek {selectedGW} / 38
            </span>
            <button
              onClick={() => chooseGW(Math.min(38, selectedGW + 1))}
              disabled={selectedGW === 38}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
              style={{ color: 'var(--text-main)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlight Banner: Single Winner OR Joint Winners on Tie */}
        <div className="mb-6">
          {isTie ? (
            /* Joint Winners on Tie (Chia đôi / chia đều) */
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit text-xs font-mono font-bold mb-3"
                style={{
                  backgroundColor: 'rgba(255, 215, 0, 0.12)',
                  borderColor: 'rgba(255, 215, 0, 0.35)',
                  color: 'var(--accent-gold)'
                }}
              >
                <Users className="w-4 h-4" />
                <span>ĐỒNG HẠNG NHẤT — CHIA ĐỀU {prizePerWinner.toLocaleString('vi-VN')}Đ / HLV ({tiedWinners.length} ĐỘI BẰNG ĐIỂM)</span>
              </div>
              <div className={`grid grid-cols-1 ${tiedWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                {tiedWinners.map((winner, idx) => (
                  <div
                    key={winner.id || idx}
                    className="rounded-2xl p-4 border flex items-center justify-between shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--bg-card-solid), var(--bg-card-hover))',
                      borderColor: 'var(--border-highlight)'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                        <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: 'var(--accent-gold)' }}
                        >
                          🥇 ĐỒNG NHẤT VÒNG
                        </span>
                        <h5 className="text-base font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                          {winner.manager}
                        </h5>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-black font-mono" style={{ color: 'var(--accent-primary)' }}>
                        {winner.points} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                      </p>
                      <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                        +{prizePerWinner.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Sole Winner (Single Prominent Top 1 Card - No Runner Up) */
            <div className="rounded-2xl p-4 sm:p-5 border flex items-center justify-between shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--bg-card-solid), var(--bg-card-hover))',
                borderColor: 'var(--border-highlight)'
              }}
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: 'var(--accent-gold)' }}
                    >
                      🥇 NHẤT VÒNG (50.000Đ)
                    </span>
                  </div>
                  <h5 className="text-base sm:text-lg font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                    {roundRankings[0]?.manager || 'Chờ thi đấu'}
                  </h5>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{roundRankings[0]?.team}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xl sm:text-3xl font-black font-mono" style={{ color: 'var(--accent-primary)' }}>
                  {roundRankings[0]?.points || 0} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                </p>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>+50.000 VNĐ</span>
              </div>
            </div>
          )}
        </div>

        {/* 14 Managers Full Round Table */}
        <div className="overflow-x-auto scrollbar-thin rounded-xl border touch-scroll max-h-[580px]" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <span>⚡ BXH Gameweek {selectedGW}</span>
            <span>👉 Vuốt ngang xem điểm & thưởng</span>
          </div>
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
                <th className="py-2.5 sm:py-3 px-3 text-center min-w-[80px]">
                  Điểm GW{selectedGW}{isLive && selectedGW === activeGWNumber ? ' ⚡' : ''}
                </th>
                <th className="py-2.5 sm:py-3 px-3 text-left min-w-[105px]">Captain</th>
                <th className="py-2.5 sm:py-3 px-3 text-center min-w-[70px]">Điểm C</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right min-w-[110px]">Thưởng Nhất Tuần</th>
              </tr>
            </thead>

            <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
              {roundRankings.map((p, idx) => {
                const rankNum = idx + 1;
                const isWinner = isPlayed && p.points === top1Score && top1Score > 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                    className="interactive transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isWinner
                        ? 'rgba(0, 255, 135, 0.06)'
                        : undefined
                    }}
                  >
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-subtle)',
                        color: isWinner ? 'var(--accent-primary)' : rankNum === 2 ? 'var(--text-main)' : rankNum === 3 ? 'var(--accent-gold)' : 'var(--text-muted)'
                      }}
                    >
                      {isWinner && isTie ? 1 : rankNum}
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
                          rank={rankNum}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="font-bold truncate text-[11px] sm:text-sm font-display" style={{ color: 'var(--text-main)' }}>{p.manager}</p>
                          <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{p.team}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 sm:py-3 px-3 text-center font-mono font-black text-xs sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
                      {(() => {
                        const cell = (
                          <span className="cursor-help">
                            {p.hasPlayed ? p.points : '-'} <span className="text-[9px] sm:text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                          </span>
                        );
                        // Hovering the points opens the whole squad with live
                        // player points while the gameweek is running.
                        return (
                          <SquadPopupWrap live={live} gw={selectedGW} managerId={p.id}>
                            {cell}
                          </SquadPopupWrap>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 sm:py-3 px-3 text-left">
                      {(() => {
                        const cap = captainOf(p.id);
                        if (!cap) return <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>-</span>;
                        return (
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0"
                              style={{ backgroundColor: cap.mult === 3 ? '#04f5ff' : '#ff2d55', color: cap.mult === 3 ? '#000' : '#fff' }}>
                              {cap.mult === 3 ? 'TC' : 'C'}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                              {cap.name}
                            </span>
                            <span className="text-[8px] font-mono flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{cap.team}</span>
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 sm:py-3 px-3 text-center font-mono font-black text-xs sm:text-sm"
                      style={{ color: captainOf(p.id) ? 'var(--text-main)' : 'var(--text-faint)' }}>
                      {(() => {
                        const cap = captainOf(p.id);
                        return cap ? cap.pts * cap.mult : '-';
                      })()}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-xs">
                      {isWinner ? (
                        <span className="font-black px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'var(--bg-card-hover)',
                            borderColor: 'var(--border-highlight)',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          +{prizePerWinner.toLocaleString('vi-VN')} VNĐ {isTie ? '(Chia đôi)' : ''}
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

      {/* 38 Gameweek Grid */}
      <div>
        <h4 className="text-base font-display font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Award className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Lịch Sử & Danh Sách 38 Vòng Đấu
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {winners.map((w) => {
            const hasWinner = w.points > 0;
            return (
              <div
                key={w.gw}
                className="glass-panel rounded-2xl p-4 border transition-all"
                style={{
                  borderColor: hasWinner ? 'var(--border-highlight)' : 'var(--border-subtle)'
                }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold"
                    style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                    Gameweek {w.gw}
                  </div>

                  <span className="text-xs font-mono font-extrabold" style={{ color: 'var(--accent-primary)' }}>
                    50.000đ
                  </span>
                </div>

                {/* Winner Info (No Runner Up) */}
                {hasWinner ? (
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={w.winner} size="md" rank={1} />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate font-display" style={{ color: 'var(--text-main)' }}>{w.winner}</p>
                      <p className="text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{w.points} pts cao nhất</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-full border flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold font-display" style={{ color: 'var(--text-main)' }}>Sắp Khởi Tranh</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chờ kết quả Gameweek {w.gw}</p>
                    </div>
                  </div>
                )}

                {/* Paid Status */}
                <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-faint)' }}>Trạng thái:</span>
                  {w.paid ? (
                    <span className="flex items-center gap-1 font-bold" style={{ color: 'var(--accent-primary)' }}>
                      <CheckCircle2 className="w-3 h-3" /> Đã trao giải
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {hasWinner ? 'Chờ thanh toán' : 'Chưa diễn ra'}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
