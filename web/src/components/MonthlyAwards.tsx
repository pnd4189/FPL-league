import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Swords, Award, Users, Info } from 'lucide-react';
import { MonthlyAward, ClassicStanding, H2HStanding, LiveGwData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { MONTH_RANGES, INITIAL_PLAYERS, getH2HMatchupsForGW } from '../data/initialData';
import { MonthRange } from '../services/liveStandings';
import { SquadPopupWrap } from './SquadTooltip';

interface MonthlyAwardsProps {
  awards: MonthlyAward[];
  classicStandings?: ClassicStanding[];
  h2hStandings?: H2HStanding[];
  currentMonthName?: string;
  currentGW?: number;
  isLive?: boolean;
  live?: LiveGwData | null;
  months?: MonthRange[];
  onSelectPlayer?: (id: number) => void;
}

export const MonthlyAwards: React.FC<MonthlyAwardsProps> = ({
  awards,
  classicStandings = [],
  currentMonthName,
  currentGW = 1,
  isLive = false,
  live = null,
  months = MONTH_RANGES,
  onSelectPlayer,
}) => {
  // Open on the month currently being played rather than always August.
  const [selectedMonthName, setSelectedMonthName] = useState<string>(currentMonthName || months[0].name);
  const [monthTouched, setMonthTouched] = useState(false);
  const [activeMiniTab, setActiveMiniTab] = useState<'classic' | 'h2h'>('classic');

  useEffect(() => {
    if (!monthTouched && currentMonthName) setSelectedMonthName(currentMonthName);
  }, [currentMonthName, monthTouched]);

  const chooseMonth = (name: string) => {
    setMonthTouched(true);
    setSelectedMonthName(name);
  };

  const selectedMonthObj = months.find(m => m.name === selectedMonthName) || months[0];

  // 1. Calculate Classic Monthly Standings for the selected month
  // RULE: Ranked strictly by TOTAL POINTS (monthTotal) of all GWs in that month.
  const classicMonthlyRankings = classicStandings.map(p => {
    let monthTotal = 0;
    let playedCount = 0;
    const gwBreakdown: { gw: number; score: number | null }[] = [];

    selectedMonthObj.gws.forEach(gw => {
      const score = p.scores[gw - 1];
      gwBreakdown.push({ gw, score });
      if (score !== null) {
        monthTotal += score;
        playedCount++;
      }
    });

    const average = playedCount > 0 ? (monthTotal / playedCount).toFixed(1) : '0.0';

    return {
      id: p.id,
      manager: p.manager,
      team: p.team,
      avatarUrl: p.avatarUrl,
      clubLogoUrl: p.clubLogoUrl,
      favoriteClub: p.favoriteClub,
      fanClubNickname: p.fanClubNickname,
      clubColors: p.clubColors,
      monthTotal,
      playedCount,
      average,
      gwBreakdown,
      overallTotal: p.total,
    };
  }).sort((a, b) => {
    // Sort primarily by month total points
    return b.monthTotal - a.monthTotal;
  });

  const topClassicScore = classicMonthlyRankings[0]?.monthTotal || 0;
  const isClassicPlayed = classicMonthlyRankings[0]?.playedCount > 0;
  const tiedClassicWinners = isClassicPlayed && topClassicScore > 0
    ? classicMonthlyRankings.filter(p => p.monthTotal === topClassicScore)
    : [classicMonthlyRankings[0]];
  const isClassicTie = tiedClassicWinners.length > 1;
  const classicPrizeEach = isClassicTie ? Math.floor(100000 / tiedClassicWinners.length) : 100000;

  // 2. Calculate H2H Monthly Standings for the selected month based on round fixtures
  // RULE: Ranked by 1. H2H Points -> 2. Goal Difference (GD) -> 3. Goals For (GF) -> 4. Classic Total
  const h2hMonthlyRankings = INITIAL_PLAYERS.map(p => {
    const classicRecord = classicStandings.find(c => c.id === p.id);
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let gf = 0; // Points for (Total FPL score in month)
    let ga = 0; // Points against (Opponents' FPL score in month)
    let pCount = 0;

    const gwResults: {
      gw: number;
      result: 'W' | 'D' | 'L' | '-';
      myScore: number | null;
      oppScore: number | null;
      oppManager: string;
      isHome: boolean;
    }[] = [];

    selectedMonthObj.gws.forEach(gw => {
      const pairings = getH2HMatchupsForGW(gw, INITIAL_PLAYERS);
      const match = pairings.find(m => m.home.id === p.id || m.away.id === p.id);
      const isHome = match ? match.home.id === p.id : true;
      const opp = match ? (isHome ? match.away : match.home) : null;
      const oppStanding = opp ? classicStandings.find(c => c.id === opp.id) : null;

      const myScore = classicRecord ? classicRecord.scores[gw - 1] : null;
      const oppScore = oppStanding ? oppStanding.scores[gw - 1] : null;

      if (myScore !== null && oppScore !== null) {
        pCount++;
        gf += myScore;
        ga += oppScore;
        if (myScore > oppScore) {
          won++;
          gwResults.push({ gw, result: 'W', myScore, oppScore, oppManager: opp?.manager || '', isHome });
        } else if (myScore === oppScore) {
          drawn++;
          gwResults.push({ gw, result: 'D', myScore, oppScore, oppManager: opp?.manager || '', isHome });
        } else {
          lost++;
          gwResults.push({ gw, result: 'L', myScore, oppScore, oppManager: opp?.manager || '', isHome });
        }
      } else {
        gwResults.push({ gw, result: '-', myScore: null, oppScore: null, oppManager: opp?.manager || '', isHome });
      }
    });

    const gd = gf - ga;
    const h2hPts = won * 3 + drawn * 1;
    const monthClassicTotal = classicMonthlyRankings.find(c => c.id === p.id)?.monthTotal || 0;

    return {
      id: p.id,
      manager: p.manager,
      team: p.team,
      avatarUrl: p.avatarUrl,
      clubLogoUrl: p.clubLogoUrl,
      favoriteClub: p.favoriteClub,
      fanClubNickname: p.fanClubNickname,
      clubColors: p.clubColors,
      pCount,
      won,
      drawn,
      lost,
      gf,
      ga,
      gd,
      h2hPts,
      monthClassicTotal,
      gwResults,
    };
  }).sort((a, b) => {
    // 1. H2H Points
    if (b.h2hPts !== a.h2hPts) return b.h2hPts - a.h2hPts;
    // 2. Goal Difference (GD) - Higher GD wins!
    if (b.gd !== a.gd) return b.gd - a.gd;
    // 3. Goals For (GF)
    if (b.gf !== a.gf) return b.gf - a.gf;
    // 4. Classic Month Total
    return b.monthClassicTotal - a.monthClassicTotal;
  });

  const topH2HPts = h2hMonthlyRankings[0]?.h2hPts || 0;
  const topH2HGD = h2hMonthlyRankings[0]?.gd || 0;
  const topH2HGF = h2hMonthlyRankings[0]?.gf || 0;
  const topH2HClassic = h2hMonthlyRankings[0]?.monthClassicTotal || 0;
  const isH2HPlayed = h2hMonthlyRankings[0]?.pCount > 0;

  // Joint winners only if H2H points AND GD AND GF AND Classic points are all completely equal
  const tiedH2HWinners = isH2HPlayed && topH2HPts > 0
    ? h2hMonthlyRankings.filter(p => p.h2hPts === topH2HPts && p.gd === topH2HGD && p.gf === topH2HGF && p.monthClassicTotal === topH2HClassic)
    : [h2hMonthlyRankings[0]];
  const isH2HTie = tiedH2HWinners.length > 1;
  const h2hPrizeEach = isH2HTie ? Math.floor(100000 / tiedH2HWinners.length) : 100000;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent-tertiary)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Vinh Danh Xuất Sắc Hàng Tháng (10 Tháng × 2 Giải)
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Mỗi tháng trao 2 giải độc lập: Nhất Classic (100k) & Nhất H2H (100k). Tổng quỹ thưởng tháng = 2.000.000đ.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border"
          style={{
            backgroundColor: 'var(--bg-card-hover)',
            borderColor: 'var(--border-highlight)',
            color: 'var(--accent-tertiary)'
          }}
        >
          <Award className="w-4 h-4" />
          <span>200.000đ / Tháng (Classic + H2H)</span>
        </div>
      </div>

      {/* Main Monthly Hub Card */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Month Selector Carousel Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 scrollbar-none border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
          {months.map(m => {
            const isActive = selectedMonthName === m.name;
            return (
              <button
                key={m.name}
                onClick={() => setSelectedMonthName(m.name)}
                className={`interactive flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  isActive ? 'shadow-md scale-105' : 'opacity-70 hover:opacity-100'
                }`}
                style={isActive ? {
                  backgroundColor: 'var(--accent-tertiary)',
                  color: '#ffffff',
                  border: '1px solid var(--border-highlight)'
                } : {
                  backgroundColor: 'var(--bg-card-solid)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {m.name} <span className="text-[10px] opacity-75 font-normal">({m.range})</span>
              </button>
            );
          })}
        </div>

        {/* 🔀 2 Mini-Tabs Selector: Classic vs H2H */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-6">
          <div className="flex items-center p-1 rounded-xl border backdrop-blur-md"
            style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => setActiveMiniTab('classic')}
              className={`interactive px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all ${
                activeMiniTab === 'classic' ? 'shadow-md scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              style={activeMiniTab === 'classic' ? {
                backgroundColor: 'var(--bg-card-hover)',
                color: 'var(--accent-tertiary)',
                border: '1px solid var(--border-highlight)'
              } : {
                color: 'var(--text-muted)'
              }}
            >
              <Trophy className="w-4 h-4" />
              <span>1. Giải Tháng Classic (100k)</span>
            </button>

            <button
              onClick={() => setActiveMiniTab('h2h')}
              className={`interactive px-4 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 transition-all ${
                activeMiniTab === 'h2h' ? 'shadow-md scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              style={activeMiniTab === 'h2h' ? {
                backgroundColor: 'var(--bg-card-hover)',
                color: 'var(--accent-secondary)',
                border: '1px solid var(--border-highlight)'
              } : {
                color: 'var(--text-muted)'
              }}
            >
              <Swords className="w-4 h-4" />
              <span>2. Giải Tháng H2H League (100k)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                borderColor: 'var(--border-subtle)',
                color: activeMiniTab === 'classic' ? 'var(--accent-tertiary)' : 'var(--accent-secondary)'
              }}
            >
              {selectedMonthName} • {selectedMonthObj.range}
            </span>
          </div>
        </div>

        {/* ========================================================
            TAB 1: CLASSIC MONTHLY TABLE
            ======================================================== */}
        {activeMiniTab === 'classic' && (
          <div className="space-y-6">
            
            {/* Explanatory Rule Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
              style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-tertiary)' }} />
              <span>
                <strong>Luật Xếp Hạng Classic Tháng:</strong> Xếp theo <strong>Tổng điểm FPL các vòng trong tháng</strong>. HLV đạt tổng điểm cao nhất tháng sẽ giành giải thưởng 100.000 VNĐ.
              </span>
            </div>

            {/* Classic Leader Highlight Card */}
            <div>
              {isClassicTie ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit text-xs font-mono font-bold mb-2"
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.12)',
                      borderColor: 'rgba(255, 215, 0, 0.35)',
                      color: 'var(--accent-gold)'
                    }}
                  >
                    <Users className="w-4 h-4" />
                    <span>ĐỒNG HẠNG NHẤT CLASSIC — CHIA ĐỀU {classicPrizeEach.toLocaleString('vi-VN')}Đ / HLV</span>
                  </div>
                  <div className={`grid grid-cols-1 ${tiedClassicWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    {tiedClassicWinners.map((winner, idx) => (
                      <div
                        key={winner.id || idx}
                        className="rounded-2xl p-4 border flex items-center justify-between shadow-lg"
                        style={{
                          backgroundColor: 'var(--bg-card-solid)',
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
                              style={{ backgroundColor: 'rgba(233, 0, 82, 0.15)', color: 'var(--accent-tertiary)' }}
                            >
                              🥇 ĐỒNG NHẤT CLASSIC
                            </span>
                            <h5 className="text-base font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                              {winner.manager}
                            </h5>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-black font-mono" style={{ color: 'var(--accent-tertiary)' }}>
                            {winner.monthTotal} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                          </p>
                          <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-tertiary)' }}>
                            +{classicPrizeEach.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 sm:p-5 border flex items-center justify-between shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-highlight)'
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PlayerAvatar
                      name={classicMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                      avatarUrl={classicMonthlyRankings[0]?.avatarUrl}
                      clubLogoUrl={classicMonthlyRankings[0]?.clubLogoUrl}
                      favoriteClub={classicMonthlyRankings[0]?.favoriteClub}
                      size="lg"
                      rank={1}
                      showCrown={true}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(233, 0, 82, 0.15)', color: 'var(--accent-tertiary)' }}
                      >
                        🥇 TẠM DẪN ĐẦU CLASSIC {selectedMonthName.toUpperCase()}
                      </span>
                      <h5 className="text-base sm:text-lg font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                        {classicMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                      </h5>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{classicMonthlyRankings[0]?.team}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xl sm:text-3xl font-black font-mono" style={{ color: 'var(--accent-tertiary)' }}>
                      {classicMonthlyRankings[0]?.monthTotal || 0} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                    </p>
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-tertiary)' }}>+100.000 VNĐ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Classic Monthly Table */}
            <div className="overflow-x-auto scrollbar-thin rounded-xl border touch-scroll max-h-[580px]" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span>🏆 Classic Tháng</span>
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
                    {selectedMonthObj.gws.map(gw => (
                      <th key={gw} className="py-2.5 sm:py-3 px-2 text-center min-w-[45px] sm:min-w-[55px]" style={{ color: 'var(--text-faint)' }}>
                        GW{gw}
                      </th>
                    ))}
                    <th className="py-2.5 sm:py-3 px-2 text-center min-w-[50px] sm:min-w-[60px]" style={{ color: 'var(--text-muted)' }}>AVG</th>
                    <th className="py-2.5 sm:py-3 px-3 text-center font-black min-w-[90px] sm:min-w-[110px]"
                      style={{ backgroundColor: 'rgba(233, 0, 82, 0.08)', color: 'var(--accent-tertiary)' }}
                    >
                      TỔNG THÁNG
                    </th>
                    <th className="py-2.5 sm:py-3 px-3 text-right min-w-[100px] sm:min-w-[120px]">Thưởng Dự Kiến</th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {classicMonthlyRankings.map((p, idx) => {
                    const isClassicWinner = isClassicPlayed && p.monthTotal === topClassicScore && topClassicScore > 0;
                    const rankNum = isClassicWinner && isClassicTie ? 1 : idx + 1;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                        className="interactive transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isClassicWinner ? 'rgba(233, 0, 82, 0.05)' : undefined
                        }}
                      >
                        <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                          style={{
                            backgroundColor: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-subtle)',
                            color: isClassicWinner ? 'var(--accent-tertiary)' : rankNum === 2 ? 'var(--text-main)' : rankNum === 3 ? 'var(--accent-gold)' : 'var(--text-muted)'
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
                              <p className="font-bold truncate text-[11px] sm:text-xs font-display" style={{ color: 'var(--text-main)' }}>{p.manager}</p>
                              <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{p.team}</p>
                            </div>
                          </div>
                        </td>

                        {/* GW Points Breakdown */}
                        {p.gwBreakdown.map(({ gw, score }) => (
                          <td key={gw} className="py-3 px-3 text-center font-mono text-[11px]"
                            style={{ color: gw === currentGW && isLive ? '#ff2d55' : 'var(--text-muted)' }}
                          >
                            <SquadPopupWrap live={live} gw={gw} managerId={p.id}>
                              <span className={gw === currentGW && isLive ? 'font-black cursor-help' : ''}>
                                {score !== null ? score : '-'}
                              </span>
                            </SquadPopupWrap>
                          </td>
                        ))}

                        {/* Month Average (Informational) */}
                        <td className="py-3 px-3 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                          {p.average}
                        </td>

                        {/* Month Total Points (Primary Ranking Factor) */}
                        <td className="py-3 px-4 text-center font-mono font-black text-sm"
                          style={{ color: 'var(--accent-tertiary)', backgroundColor: 'rgba(233, 0, 82, 0.05)' }}
                        >
                          {p.playedCount > 0 ? p.monthTotal : '-'} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                          {isClassicWinner ? (
                            <span className="font-black px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: 'var(--bg-card-hover)',
                                borderColor: 'var(--border-highlight)',
                                color: 'var(--accent-tertiary)'
                              }}
                            >
                              +{classicPrizeEach.toLocaleString('vi-VN')} VNĐ {isClassicTie ? '(Chia đều)' : ''}
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
        )}

        {/* ========================================================
            TAB 2: H2H MONTHLY TABLE
            ======================================================== */}
        {activeMiniTab === 'h2h' && (
          <div className="space-y-6">
            
            {/* Explanatory Rule Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
              style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-secondary)' }} />
              <span>
                <strong>Luật Xếp Hạng H2H Tháng:</strong> 1. Điểm H2H (Thắng 3đ, Hòa 1đ) → 2. <strong>Hiệu Số Bàn Thắng (GD)</strong> → 3. Tổng Điểm Ghi (GF). <em>Đội có hiệu số cao hơn sẽ thắng giải.</em>
              </span>
            </div>

            {/* H2H Leader Highlight Card */}
            <div>
              {isH2HTie ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit text-xs font-mono font-bold mb-2"
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.12)',
                      borderColor: 'rgba(255, 215, 0, 0.35)',
                      color: 'var(--accent-gold)'
                    }}
                  >
                    <Users className="w-4 h-4" />
                    <span>ĐỒNG HẠNG NHẤT H2H — CHIA ĐỀU {h2hPrizeEach.toLocaleString('vi-VN')}Đ / HLV</span>
                  </div>
                  <div className={`grid grid-cols-1 ${tiedH2HWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    {tiedH2HWinners.map((winner, idx) => (
                      <div
                        key={winner.id || idx}
                        className="rounded-2xl p-4 border flex items-center justify-between shadow-lg"
                        style={{
                          backgroundColor: 'var(--bg-card-solid)',
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
                              style={{ backgroundColor: 'rgba(4, 245, 255, 0.15)', color: 'var(--accent-secondary)' }}
                            >
                              ⚔️ ĐỒNG NHẤT H2H
                            </span>
                            <h5 className="text-base font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                              {winner.manager}
                            </h5>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-black font-mono" style={{ color: 'var(--accent-secondary)' }}>
                            {winner.h2hPts} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Pts</span>
                          </p>
                          <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-secondary)' }}>
                            +{h2hPrizeEach.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-4 sm:p-5 border flex items-center justify-between shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-highlight)'
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PlayerAvatar
                      name={h2hMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                      avatarUrl={h2hMonthlyRankings[0]?.avatarUrl}
                      clubLogoUrl={h2hMonthlyRankings[0]?.clubLogoUrl}
                      favoriteClub={h2hMonthlyRankings[0]?.favoriteClub}
                      size="lg"
                      rank={1}
                      showCrown={true}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(4, 245, 255, 0.15)', color: 'var(--accent-secondary)' }}
                      >
                        ⚔️ TẠM DẪN ĐẦU H2H {selectedMonthName.toUpperCase()}
                      </span>
                      <h5 className="text-base sm:text-lg font-black font-display truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
                        {h2hMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                      </h5>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{h2hMonthlyRankings[0]?.team}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xl sm:text-3xl font-black font-mono" style={{ color: 'var(--accent-secondary)' }}>
                      {h2hMonthlyRankings[0]?.h2hPts || 0} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Pts</span>
                    </p>
                    <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      GD: {h2hMonthlyRankings[0]?.gd > 0 ? `+${h2hMonthlyRankings[0]?.gd}` : h2hMonthlyRankings[0]?.gd || 0}
                    </p>
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-secondary)' }}>+100.000 VNĐ</span>
                  </div>
                </div>
              )}
            </div>

            {/* H2H Monthly Table */}
            <div className="overflow-x-auto scrollbar-thin rounded-xl border touch-scroll max-h-[580px]" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="md:hidden flex items-center justify-between px-3 py-1.5 border-b text-[10px] font-mono"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span>⚔️ H2H Tháng</span>
                <span>👉 Vuốt ngang xem kết quả & điểm</span>
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
                    {selectedMonthObj.gws.map(gw => (
                      <th key={gw} className="py-2.5 sm:py-3 px-2 text-center min-w-[85px] sm:min-w-[95px]" style={{ color: 'var(--text-faint)' }}>
                        GW{gw}
                      </th>
                    ))}
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-8 sm:w-9">P</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-8 sm:w-9" style={{ color: 'var(--accent-primary)' }}>W</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-8 sm:w-9">D</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-8 sm:w-9" style={{ color: 'var(--accent-tertiary)' }}>L</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-10 sm:w-11">GF</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-10 sm:w-11">GA</th>
                    <th className="py-2.5 sm:py-3 px-1.5 text-center w-10 sm:w-11 font-black" style={{ color: 'var(--text-main)' }}>GD</th>
                    <th className="py-2.5 sm:py-3 px-2.5 text-center font-black min-w-[65px] sm:min-w-[70px]"
                      style={{ backgroundColor: 'rgba(4, 245, 255, 0.08)', color: 'var(--accent-secondary)' }}
                    >
                      H2H PTS
                    </th>
                    <th className="py-2.5 sm:py-3 px-3 text-right min-w-[100px] sm:min-w-[120px]">Thưởng Dự Kiến</th>
                  </tr>
                </thead>

                <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                  {h2hMonthlyRankings.map((p, idx) => {
                    const isH2HWinner = isH2HPlayed && p.h2hPts === topH2HPts && p.gd === topH2HGD && p.gf === topH2HGF && p.monthClassicTotal === topH2HClassic && topH2HPts > 0;
                    const rankNum = isH2HWinner && isH2HTie ? 1 : idx + 1;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                        className="interactive transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isH2HWinner ? 'rgba(4, 245, 255, 0.05)' : undefined
                        }}
                      >
                        <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black sticky left-0 z-10 border-r"
                          style={{
                            backgroundColor: 'var(--bg-card-solid)',
                            borderColor: 'var(--border-subtle)',
                            color: isH2HWinner ? 'var(--accent-secondary)' : rankNum === 2 ? 'var(--text-main)' : rankNum === 3 ? 'var(--accent-gold)' : 'var(--text-muted)'
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
                              <p className="font-bold truncate text-[11px] sm:text-xs font-display" style={{ color: 'var(--text-main)' }}>{p.manager}</p>
                              <p className="text-[9px] sm:text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{p.team}</p>
                            </div>
                          </div>
                        </td>

                        {/* Each GW H2H Result Badge */}
                        {p.gwResults.map(gr => (
                          <td key={gr.gw} className="py-3 px-2.5 text-center font-mono text-[10px]">
                            {gr.result !== '-' ? (
                              <span className="inline-block px-1.5 py-0.5 rounded font-bold border"
                                style={{
                                  backgroundColor: gr.result === 'W'
                                    ? 'rgba(0, 255, 135, 0.12)'
                                    : gr.result === 'L'
                                    ? 'rgba(233, 0, 82, 0.12)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                  color: gr.result === 'W'
                                    ? 'var(--accent-primary)'
                                    : gr.result === 'L'
                                    ? 'var(--accent-tertiary)'
                                    : 'var(--text-muted)',
                                  borderColor: gr.result === 'W'
                                    ? 'rgba(0, 255, 135, 0.3)'
                                    : gr.result === 'L'
                                    ? 'rgba(233, 0, 82, 0.3)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }}
                                title={`${gr.result === 'W' ? 'Thắng' : gr.result === 'L' ? 'Thua' : 'Hòa'} vs ${gr.oppManager} (${gr.myScore}-${gr.oppScore})`}
                              >
                                {gr.result} {gr.myScore}-{gr.oppScore}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)' }}>-</span>
                            )}
                          </td>
                        ))}

                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.pCount}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{p.won}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.drawn}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--accent-tertiary)' }}>{p.lost}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.gf > 0 ? p.gf : '-'}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{p.ga > 0 ? p.ga : '-'}</td>
                        <td className="py-3 px-2 text-center font-mono font-black"
                          style={{
                            color: p.gd > 0 ? 'var(--accent-primary)' : p.gd < 0 ? 'var(--accent-tertiary)' : 'var(--text-main)'
                          }}
                        >
                          {p.pCount > 0 ? (p.gd > 0 ? `+${p.gd}` : p.gd) : '-'}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-black text-sm"
                          style={{ color: 'var(--accent-secondary)', backgroundColor: 'rgba(4, 245, 255, 0.05)' }}
                        >
                          {p.pCount > 0 ? p.h2hPts : '-'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                          {isH2HWinner ? (
                            <span className="font-black px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: 'var(--bg-card-hover)',
                                borderColor: 'var(--border-highlight)',
                                color: 'var(--accent-secondary)'
                              }}
                            >
                              +{h2hPrizeEach.toLocaleString('vi-VN')} VNĐ {isH2HTie ? '(Chia đều)' : ''}
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
        )}

      </div>

      {/* 10 Months Summary Grid */}
      <div>
        <h4 className="text-base font-display font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Trophy className="w-5 h-5" style={{ color: 'var(--accent-tertiary)' }} />
          Lịch Sử 10 Tháng Trao Giải (Tổng 2.000.000đ)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {awards.map((m, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-2xl p-5 border transition-all shadow-lg group"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* Month Header */}
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-tertiary)' }} />
                  <h4 className="text-base font-display font-black" style={{ color: 'var(--text-main)' }}>{m.monthName}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono border"
                    style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                  >
                    {m.gwRange}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-tertiary)' }}>
                  Tổng 200k
                </span>
              </div>

              {/* Dual Winners (Classic & H2H) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Classic Winner */}
                <div className="rounded-xl p-3 border flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                        <Trophy className="w-3 h-3" /> Nhất Classic
                      </span>
                      <span className="text-[11px] font-mono font-black" style={{ color: 'var(--accent-primary)' }}>100.000đ</span>
                    </div>
                    <div className="flex items-center gap-2.5 my-1">
                      <PlayerAvatar name={m.classicWinner} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate font-display" style={{ color: 'var(--text-main)' }}>{m.classicWinner}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {m.classicPoints > 0 ? `${m.classicPoints} pts` : 'Chờ hoàn thành'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t text-[9px] font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
                    {m.paidClassic ? '✅ Đã chuyển thưởng' : 'Chưa trao giải'}
                  </div>
                </div>

                {/* H2H Winner */}
                <div className="rounded-xl p-3 border flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase flex items-center gap-1" style={{ color: 'var(--accent-secondary)' }}>
                        <Swords className="w-3 h-3" /> Nhất H2H
                      </span>
                      <span className="text-[11px] font-mono font-black" style={{ color: 'var(--accent-secondary)' }}>100.000đ</span>
                    </div>
                    <div className="flex items-center gap-2.5 my-1">
                      <PlayerAvatar name={m.h2hWinner} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate font-display" style={{ color: 'var(--text-main)' }}>{m.h2hWinner}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {m.h2hPoints > 0 ? `${m.h2hPoints} Pts H2H` : 'Chờ hoàn thành'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t text-[9px] font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
                    {m.paidH2H ? '✅ Đã chuyển thưởng' : 'Chưa trao giải'}
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
