import React from 'react';
import { Trophy, Coins, Wallet, Crown } from 'lucide-react';
import { PRIZE_STRUCTURE, INITIAL_PLAYERS } from '../data/initialData';
import { WeeklyWinner, MonthlyAward, ClassicStanding, H2HStanding } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { isWinner, prizeShare } from '../services/prizes';

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
      (sum, w) => sum + prizeShare(w.winner, p.manager, w.prize || 50000), 0);

    // 2. Monthly Classic Wins (100k pot, split evenly on a tie)
    const monthlyClassicWins = monthlyAwards.filter(m => m.classicPoints > 0 && isWinner(m.classicWinner, p.manager));
    const monthlyClassicEarnings = monthlyClassicWins.reduce(
      (sum, m) => sum + prizeShare(m.classicWinner, p.manager, m.classicPrize || 100000), 0);

    // 3. Monthly H2H Wins (100k pot, split evenly on a tie)
    const monthlyH2HWins = monthlyAwards.filter(m => m.h2hPoints > 0 && isWinner(m.h2hWinner, p.manager));
    const monthlyH2HEarnings = monthlyH2HWins.reduce(
      (sum, m) => sum + prizeShare(m.h2hWinner, p.manager, m.h2hPrize || 100000), 0);

    // 4. Cup & Season bonuses (if applicable)
    const cupEarnings = 0;
    const seasonClassicEarnings = 0;
    const seasonH2HEarnings = 0;

    const totalWon = weeklyEarnings + monthlyClassicEarnings + monthlyH2HEarnings + cupEarnings + seasonClassicEarnings + seasonH2HEarnings;

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
    <div className="space-y-8">
      
      {/* Header Summary */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Bảng Vàng Tiền Thưởng & Cơ Cấu Giải Đấu 2026-2027
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Thống kê chi tiết tiền thưởng thực nhận của 14 HLV được cập nhật trực tiếp tại thời điểm mở web.
          </p>
        </div>

        {/* Balance Status */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl border text-right"
            style={{
              backgroundColor: 'var(--bg-card-hover)',
              borderColor: 'var(--border-highlight)',
            }}
          >
            <p className="text-[10px] uppercase font-mono" style={{ color: 'var(--text-faint)' }}>Tổng Quỹ Giải</p>
            <p className="text-sm font-black font-mono" style={{ color: 'var(--accent-primary)' }}>7.000.000 VNĐ</p>
          </div>
        </div>
      </div>

      {/* 💰 BẢNG XẾP HẠNG TIỀN THƯỞNG 14 HLV (PRIZE EARNINGS LEADERBOARD) */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', color: 'var(--accent-gold)' }}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Xếp Hạng Tiền Thưởng Thực Nhận Của 14 HLV
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Xếp hạng theo tổng số tiền giải thưởng đã tích lũy đến hiện tại</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.12)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              color: 'var(--accent-gold)'
            }}
          >
            <Coins className="w-4 h-4" />
            <span>Đã Trao: {totalPrizeDistributed.toLocaleString('vi-VN')} đ / 7.000.000 đ</span>
          </div>
        </div>

        {/* Top Earner Highlight Podium Card */}
        <div className="rounded-2xl p-4 sm:p-5 border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-card-solid)',
            borderColor: 'var(--border-highlight)'
          }}
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
              <span className="px-2 py-0.5 rounded-full text-black text-[10px] font-black uppercase font-mono"
                style={{ backgroundColor: 'var(--accent-gold)' }}
              >
                👑 VUA TIỀN THƯỞNG HIỆN TẠI
              </span>
              <h5 className="text-lg sm:text-xl font-black font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                {topEarner?.manager}
              </h5>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {topEarner?.team}
              </p>
            </div>
          </div>

          <div className="text-right px-4 py-3 rounded-xl border w-full sm:w-auto"
            style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-faint)' }}>Tổng Tiền Thưởng Đã Nhận</p>
            <p className="text-xl sm:text-2xl font-black font-mono" style={{ color: 'var(--accent-gold)' }}>
              {topEarner?.totalWon.toLocaleString('vi-VN')} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>VNĐ</span>
            </p>
          </div>
        </div>

        {/* 14 Managers Full Prize Table */}
        <div className="overflow-x-auto scrollbar-thin rounded-xl border touch-scroll max-h-[580px]" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <span>💰 Bảng Tiền Thưởng</span>
            <span>👉 Vuốt ngang xem chi tiết</span>
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
                <th className="py-2.5 sm:py-3 px-2.5 sm:px-4 min-w-[135px] sm:min-w-[170px] sticky left-10 sm:left-12 z-30 border-r"
                  style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                >
                  HLV & Đội Bóng
                </th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[80px] sm:min-w-[90px]">Nhất Tuần (50k)</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[90px] sm:min-w-[100px]">Nhất Classic (100k)</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[80px] sm:min-w-[90px]">Nhất H2H (100k)</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center min-w-[70px] sm:min-w-[80px]">Cup / Mùa</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right min-w-[110px] sm:min-w-[120px] font-black" style={{ color: 'var(--accent-gold)', backgroundColor: 'rgba(255, 215, 0, 0.08)' }}>
                  TỔNG TIỀN THƯỞNG
                </th>
              </tr>
            </thead>

            <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
              {managerEarnings.map((p, idx) => {
                const rankNum = idx + 1;
                const isRank1 = rankNum === 1;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                    className="interactive transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isRank1 ? 'rgba(255, 215, 0, 0.08)' : undefined
                    }}
                  >
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                      style={{
                        backgroundColor: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-subtle)',
                        color: isRank1 ? 'var(--accent-gold)' : rankNum === 2 ? 'var(--text-main)' : rankNum === 3 ? '#f97316' : 'var(--text-muted)'
                      }}
                    >
                      {rankNum}
                    </td>

                    <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[135px] sm:min-w-[170px]"
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
                          <p className="font-bold truncate text-[11px] sm:text-sm font-display flex items-center gap-1 sm:gap-1.5" style={{ color: 'var(--text-main)' }}>
                            {p.manager}
                            {rankNum === 1 && <span title="Vua Tiền Thưởng" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#ffd700] text-[#ffd700]" /></span>}
                            {rankNum === 2 && <span title="Á Quân Tiền Thưởng" className="inline-flex flex-shrink-0"><Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 fill-[#e2e8f0] text-[#cbd5e1]" /></span>}
                            {rankNum === 3 && <span title="Hạng 3 Tiền Thưởng" className="inline-flex flex-shrink-0"><Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 fill-[#ea580c] text-[#f97316]" /></span>}
                          </p>
                          <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{p.team}</p>
                        </div>
                      </div>
                    </td>

                    {/* Weekly Wins */}
                    <td className="py-3 px-3 text-center font-mono">
                      {p.weeklyCount > 0 ? (
                        <span className="font-bold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'rgba(0, 255, 135, 0.1)',
                            color: 'var(--accent-primary)',
                            borderColor: 'rgba(0, 255, 135, 0.25)'
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
                        <span className="font-bold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'rgba(233, 0, 82, 0.1)',
                            color: 'var(--accent-tertiary)',
                            borderColor: 'rgba(233, 0, 82, 0.25)'
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
                        <span className="font-bold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'rgba(4, 245, 255, 0.1)',
                            color: 'var(--accent-secondary)',
                            borderColor: 'rgba(4, 245, 255, 0.25)'
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
                        <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>
                          {(p.cupEarnings + p.seasonClassicEarnings + p.seasonH2HEarnings).toLocaleString('vi-VN')}đ
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>-</span>
                      )}
                    </td>

                    {/* TOTAL PRIZE WON */}
                    <td className="py-3 px-4 text-right font-mono font-black text-sm"
                      style={{ color: 'var(--accent-gold)', backgroundColor: 'rgba(255, 215, 0, 0.05)' }}
                    >
                      {p.totalWon.toLocaleString('vi-VN')} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>VNĐ</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Breakdown Structure Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
        >
          <h4 className="text-sm font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
            Quy Định & Cơ Cấu Phân Bổ Toàn Bộ Giải Thưởng
          </h4>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="font-mono text-[11px] uppercase border-b"
              style={{
                backgroundColor: 'var(--table-head-bg)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <tr>
                <th className="py-3 px-4">Hạng Mục Giải Thưởng</th>
                <th className="py-3 px-3 text-right">Định Mức</th>
                <th className="py-3 px-3 text-center">Số Lượng</th>
                <th className="py-3 px-4 text-right">Tổng Tiền</th>
                <th className="py-3 px-4">Ghi Chú Quy Chế</th>
              </tr>
            </thead>

            <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
              {PRIZE_STRUCTURE.prizes.map((p, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-bold font-display" style={{ color: 'var(--text-main)' }}>
                    {p.title}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {p.amount.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                    {p.count}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black" style={{ color: 'var(--accent-primary)' }}>
                    {p.total.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {p.desc}
                  </td>
                </tr>
              ))}
              
              {/* Summary Row */}
              <tr className="font-bold border-t-2"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-highlight)'
                }}
              >
                <td className="py-3 px-4 uppercase font-display" colSpan={3} style={{ color: 'var(--text-main)' }}>
                  TỔNG CỘNG CHI PHÍ GIẢI THƯỞNG
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-base" style={{ color: 'var(--accent-gold)' }}>
                  {totalExpenses.toLocaleString('vi-VN')} đ
                </td>
                <td className="py-3 px-4 text-xs font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  100% Cân đối quỹ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
