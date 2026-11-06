import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Swords, Award, Users, Info, CheckCircle2 } from 'lucide-react';
import { MonthlyAward, ClassicStanding, H2HStanding, LiveGwData, H2HScheduleRow } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { MONTH_RANGES, INITIAL_PLAYERS } from '../data/initialData';
import { fetchH2HSchedule } from '../services/fplApi';
import { MonthRange } from '../services/liveStandings';
import { SquadPopupWrap } from './SquadTooltip';
import { Reveal } from './scroll-reveal';

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
  // The league's real draw decides who meets whom in each gameweek; a locally
  // generated round-robin used to pick wrong opponents here.
  const [schedule, setSchedule] = useState<H2HScheduleRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchH2HSchedule().then(rows => {
      if (!cancelled) setSchedule(rows);
    });
    return () => { cancelled = true; };
  }, []);

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
      const fixture = (schedule || []).find(m => m.gw === gw && (m.homeId === p.id || m.awayId === p.id));
      const isHome = fixture ? fixture.homeId === p.id : true;
      const opp = fixture ? { id: isHome ? fixture.awayId : fixture.homeId } : null;
      const oppStanding = opp ? classicStandings.find(c => c.id === opp.id) : null;

      const myScore = classicRecord ? classicRecord.scores[gw - 1] : null;
      const oppScore = oppStanding ? oppStanding.scores[gw - 1] : null;

      if (myScore !== null && oppScore !== null) {
        pCount++;
        gf += myScore;
        ga += oppScore;
        const oppManager = INITIAL_PLAYERS.find(ip => ip.id === opp?.id)?.manager || '';
        if (myScore > oppScore) {
          won++;
          gwResults.push({ gw, result: 'W', myScore, oppScore, oppManager, isHome });
        } else if (myScore === oppScore) {
          drawn++;
          gwResults.push({ gw, result: 'D', myScore, oppScore, oppManager, isHome });
        } else {
          lost++;
          gwResults.push({ gw, result: 'L', myScore, oppScore, oppManager, isHome });
        }
      } else {
        gwResults.push({
          gw,
          result: '-',
          myScore: null,
          oppScore: null,
          oppManager: INITIAL_PLAYERS.find(ip => ip.id === opp?.id)?.manager || '',
          isHome,
        });
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
    // MONTHLY H2H rule — intentionally different from the overall H2H League
    // tab (which ranks by the official FPL rule: H2H Pts → Classic Total).
    // Here GD decides ties; classic total is only the LAST tie level. Keep as
    // is — do not use classic total as the primary tiebreak.
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
    <div className="space-y-8 md:space-y-10">
      {/* Header Banner */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="eyebrow-pill">
                <Calendar className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-secondary)' }} />
                <span>10 Tháng · 2 Hạng Mục Độc Lập</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Giải Thưởng Tháng
              </h3>
              <p className="text-xs sm:text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Mỗi tháng trao 2 giải độc lập gồm Nhất Classic (100.000 VNĐ) và Nhất H2H (100.000 VNĐ). Tổng ngân sách giải tháng toàn mùa đạt 2.000.000 VNĐ.
              </p>
            </div>

            <div className="surface-well px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <Award className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-faint)' }}>
                  Định mức mỗi tháng
                </p>
                <p className="text-sm sm:text-base font-bold font-mono tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                  200.000 VNĐ
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Main Monthly Hub Card */}
      <Reveal delayMs={60}>
        <div className="bezel-shell-lg">
          <div className="bezel-core-lg p-5 sm:p-7 md:p-8">
            {/* Month Selector Carousel Pills */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b mb-6 touch-scroll"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {months.map(m => {
                const isActive = selectedMonthName === m.name;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => chooseMonth(m.name)}
                    className="pressable flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-mono font-semibold tabular-nums transition-[background-color,color,box-shadow,transform,opacity] duration-200 ease-out-strong"
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-primary-ink)',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28)',
                          }
                        : {
                            backgroundColor: 'var(--bg-card-solid)',
                            color: 'var(--text-muted)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }
                    }
                  >
                    {m.name}{' '}
                    <span className="text-[10px] opacity-75 font-normal">({m.range})</span>
                  </button>
                );
              })}
            </div>

            {/* 2-Way Segmented Control: Classic vs H2H */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-6">
              <div className="surface-well inline-flex items-center p-1 rounded-full gap-1">
                <button
                  type="button"
                  onClick={() => setActiveMiniTab('classic')}
                  className="pressable px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-[background-color,color,box-shadow,transform] duration-200 ease-out-strong"
                  style={
                    activeMiniTab === 'classic'
                      ? {
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--accent-primary)',
                          boxShadow: '0 0 0 1px var(--border-highlight), inset 0 1px 0 var(--inner-highlight)',
                        }
                      : {
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  <Trophy className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Classic Tháng (100k)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMiniTab('h2h')}
                  className="pressable px-4 py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-[background-color,color,box-shadow,transform] duration-200 ease-out-strong"
                  style={
                    activeMiniTab === 'h2h'
                      ? {
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--accent-secondary)',
                          boxShadow: '0 0 0 1px rgba(123, 140, 255, 0.32), inset 0 1px 0 var(--inner-highlight)',
                        }
                      : {
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  <Swords className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>H2H Tháng (100k)</span>
                </button>
              </div>

              <span
                className="text-xs font-mono font-semibold px-3.5 py-1.5 rounded-full tabular-nums"
                style={{
                  backgroundColor: activeMiniTab === 'classic' ? 'var(--accent-primary-soft)' : 'var(--accent-secondary-soft)',
                  color: activeMiniTab === 'classic' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                }}
              >
                {selectedMonthName} · {selectedMonthObj.range}
              </span>
            </div>

            {/* ========================================================
                TAB 1: CLASSIC MONTHLY TABLE
                ======================================================== */}
            {activeMiniTab === 'classic' && (
              <div className="space-y-6">
                {/* Explanatory Rule Badge */}
                <div className="surface-well flex items-start sm:items-center gap-2.5 px-4 py-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
                  <span>
                    <strong style={{ color: 'var(--text-main)' }}>Quy tắc Classic Tháng:</strong> Xếp hạng theo tổng điểm thực tế của tất cả vòng đấu thuộc {selectedMonthName}. HLV cao điểm nhất nhận 100.000 VNĐ (chia đều nếu đồng điểm).
                  </span>
                </div>

                {/* Classic Leader Highlight Card */}
                <div>
                  {isClassicTie ? (
                    <div className="space-y-3">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold tabular-nums"
                        style={{
                          backgroundColor: 'var(--accent-gold-soft)',
                          color: 'var(--accent-gold)',
                          boxShadow: 'inset 0 0 0 1px rgba(228, 191, 106, 0.28)',
                        }}
                      >
                        <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Đồng hạng nhất Classic · Chia đều {classicPrizeEach.toLocaleString('vi-VN')}đ / HLV</span>
                      </div>
                      <div className={`grid grid-cols-1 ${tiedClassicWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                        {tiedClassicWinners.map((winner, idx) => (
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
                                  className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
                                >
                                  Đồng nhất Classic
                                </span>
                                <h5 className="text-base font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                                  {winner.manager}
                                </h5>
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                                {winner.monthTotal} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                              </p>
                              <span className="text-[11px] font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                                +{classicPrizeEach.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => classicMonthlyRankings[0]?.id && onSelectPlayer && onSelectPlayer(classicMonthlyRankings[0].id)}
                      className="podium-1 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5"
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
                          <span
                            className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
                          >
                            Dẫn đầu Classic {selectedMonthName}
                          </span>
                          <h5 className="text-base sm:text-lg font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                            {classicMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                          </h5>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{classicMonthlyRankings[0]?.team}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                          {classicMonthlyRankings[0]?.monthTotal || 0}{' '}
                          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>pts</span>
                        </p>
                        <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                          +100.000 VNĐ
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Classic Monthly Table */}
                <div
                  className="overflow-x-auto rounded-2xl border touch-scroll max-h-[580px]"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}
                >
                  <div
                    className="md:hidden flex items-center justify-between px-3.5 py-2 border-b text-[10px] font-mono"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                  >
                    <span>Classic {selectedMonthName}</span>
                    <span>Vuốt ngang xem điểm từng vòng</span>
                  </div>
                  <table className="w-full border-collapse text-left text-xs tabular-nums">
                    <thead
                      className="font-mono text-[10px] sticky top-0 z-20 uppercase tracking-wider border-b"
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
                          className="py-3 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[180px] sticky left-10 sm:left-12 z-30 border-r"
                          style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                        >
                          HLV & Đội bóng
                        </th>
                        {selectedMonthObj.gws.map(gw => (
                          <th key={gw} className="py-3 px-2.5 text-center min-w-[50px] sm:min-w-[58px]" style={{ color: 'var(--text-faint)' }}>
                            GW{gw}
                          </th>
                        ))}
                        <th className="py-3 px-2.5 text-center min-w-[56px]" style={{ color: 'var(--text-muted)' }}>
                          AVG
                        </th>
                        <th
                          className="py-3 px-3 text-center font-bold min-w-[98px] sm:min-w-[114px]"
                          style={{ backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}
                        >
                          Tổng tháng
                        </th>
                        <th className="py-3 px-3 sm:px-4 text-right min-w-[115px]">Thưởng dự kiến</th>
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
                            className="transition-colors duration-150 cursor-pointer"
                            style={{
                              backgroundColor: isClassicWinner ? 'var(--accent-primary-soft)' : undefined,
                            }}
                          >
                            <td
                              className="py-3 px-2 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 border-r"
                              style={{
                                backgroundColor: 'var(--bg-card-solid)',
                                borderColor: 'var(--border-subtle)',
                                color: isClassicWinner
                                  ? 'var(--accent-primary)'
                                  : rankNum === 2
                                  ? 'var(--text-main)'
                                  : rankNum === 3
                                  ? 'var(--accent-gold)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              {rankNum}
                            </td>

                            <td
                              className="py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[140px] sm:min-w-[180px]"
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
                                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                    {p.team}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {p.gwBreakdown.map(({ gw, score }) => (
                              <td
                                key={gw}
                                className="py-3 px-2.5 text-center font-mono text-xs"
                                style={{ color: gw === currentGW && isLive ? 'var(--accent-tertiary)' : 'var(--text-secondary)' }}
                              >
                                <SquadPopupWrap live={live} gw={gw} managerId={p.id}>
                                  <span className="cursor-help font-medium">
                                    {score !== null ? score : '-'}
                                  </span>
                                </SquadPopupWrap>
                              </td>
                            ))}

                            <td className="py-3 px-2.5 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                              {p.average}
                            </td>

                            <td
                              className="py-3 px-3 text-center font-mono font-bold text-sm"
                              style={{ color: 'var(--accent-primary)', backgroundColor: 'var(--accent-primary-soft)' }}
                            >
                              {p.playedCount > 0 ? p.monthTotal : '-'}{' '}
                              <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                                pts
                              </span>
                            </td>

                            <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-xs">
                              {isClassicWinner ? (
                                <span
                                  className="inline-block font-bold px-2.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: 'var(--accent-primary-soft)',
                                    color: 'var(--accent-primary)',
                                    boxShadow: 'inset 0 0 0 1px var(--border-highlight)',
                                  }}
                                >
                                  +{classicPrizeEach.toLocaleString('vi-VN')} đ{isClassicTie ? ' (chia đều)' : ''}
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
                <div className="surface-well flex items-start sm:items-center gap-2.5 px-4 py-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.5} style={{ color: 'var(--accent-secondary)' }} />
                  <span>
                    <strong style={{ color: 'var(--text-main)' }}>Quy tắc H2H Tháng:</strong> 1. Điểm H2H (Thắng 3đ, Hòa 1đ) · 2. Hiệu số điểm (GD) · 3. Tổng điểm ghi được (GF) · 4. Điểm Classic tháng.
                  </span>
                </div>

                {/* H2H Leader Highlight Card */}
                <div>
                  {isH2HTie ? (
                    <div className="space-y-3">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold tabular-nums"
                        style={{
                          backgroundColor: 'var(--accent-gold-soft)',
                          color: 'var(--accent-gold)',
                          boxShadow: 'inset 0 0 0 1px rgba(228, 191, 106, 0.28)',
                        }}
                      >
                        <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Đồng hạng nhất H2H · Chia đều {h2hPrizeEach.toLocaleString('vi-VN')}đ / HLV</span>
                      </div>
                      <div className={`grid grid-cols-1 ${tiedH2HWinners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                        {tiedH2HWinners.map((winner, idx) => (
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
                                  className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: 'var(--accent-secondary-soft)', color: 'var(--accent-secondary)' }}
                                >
                                  Đồng nhất H2H
                                </span>
                                <h5 className="text-base font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                                  {winner.manager}
                                </h5>
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{winner.team}</p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
                                {winner.h2hPts} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Pts</span>
                              </p>
                              <span className="text-[11px] font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                                +{h2hPrizeEach.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => h2hMonthlyRankings[0]?.id && onSelectPlayer && onSelectPlayer(h2hMonthlyRankings[0].id)}
                      className="podium-1 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5"
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
                          <span
                            className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent-secondary-soft)', color: 'var(--accent-secondary)' }}
                          >
                            Dẫn đầu H2H {selectedMonthName}
                          </span>
                          <h5 className="text-base sm:text-lg font-bold font-display truncate mt-1" style={{ color: 'var(--text-main)' }}>
                            {h2hMonthlyRankings[0]?.manager || 'Chờ thi đấu'}
                          </h5>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{h2hMonthlyRankings[0]?.team}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
                          {h2hMonthlyRankings[0]?.h2hPts || 0}{' '}
                          <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Pts</span>
                        </p>
                        <p className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          GD: {h2hMonthlyRankings[0]?.gd > 0 ? `+${h2hMonthlyRankings[0]?.gd}` : h2hMonthlyRankings[0]?.gd || 0}
                        </p>
                        <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                          +100.000 VNĐ
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* H2H Monthly Table */}
                <div
                  className="overflow-x-auto rounded-2xl border touch-scroll max-h-[580px]"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}
                >
                  <div
                    className="md:hidden flex items-center justify-between px-3.5 py-2 border-b text-[10px] font-mono"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                  >
                    <span>H2H {selectedMonthName}</span>
                    <span>Vuốt ngang xem kết quả đối đầu</span>
                  </div>
                  <table className="w-full border-collapse text-left text-xs tabular-nums">
                    <thead
                      className="font-mono text-[10px] sticky top-0 z-20 uppercase tracking-wider border-b"
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
                          className="py-3 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[180px] sticky left-10 sm:left-12 z-30 border-r"
                          style={{ backgroundColor: 'var(--table-head-bg)', borderColor: 'var(--border-subtle)' }}
                        >
                          HLV & Đội bóng
                        </th>
                        {selectedMonthObj.gws.map(gw => (
                          <th key={gw} className="py-3 px-2 text-center min-w-[88px] sm:min-w-[96px]" style={{ color: 'var(--text-faint)' }}>
                            GW{gw}
                          </th>
                        ))}
                        <th className="py-3 px-2 text-center w-9">P</th>
                        <th className="py-3 px-2 text-center w-9" style={{ color: 'var(--accent-primary)' }}>
                          W
                        </th>
                        <th className="py-3 px-2 text-center w-9">D</th>
                        <th className="py-3 px-2 text-center w-9" style={{ color: 'var(--accent-tertiary)' }}>
                          L
                        </th>
                        <th className="py-3 px-2 text-center w-11">GF</th>
                        <th className="py-3 px-2 text-center w-11">GA</th>
                        <th className="py-3 px-2 text-center w-11 font-bold" style={{ color: 'var(--text-main)' }}>
                          GD
                        </th>
                        <th
                          className="py-3 px-3 text-center font-bold min-w-[72px]"
                          style={{ backgroundColor: 'var(--accent-secondary-soft)', color: 'var(--accent-secondary)' }}
                        >
                          H2H Pts
                        </th>
                        <th className="py-3 px-3 sm:px-4 text-right min-w-[115px]">Thưởng dự kiến</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
                      {h2hMonthlyRankings.map((p, idx) => {
                        const isH2HWinner =
                          isH2HPlayed &&
                          p.h2hPts === topH2HPts &&
                          p.gd === topH2HGD &&
                          p.gf === topH2HGF &&
                          p.monthClassicTotal === topH2HClassic &&
                          topH2HPts > 0;
                        const rankNum = isH2HWinner && isH2HTie ? 1 : idx + 1;

                        return (
                          <tr
                            key={p.id}
                            onClick={() => onSelectPlayer && onSelectPlayer(p.id)}
                            className="transition-colors duration-150 cursor-pointer"
                            style={{
                              backgroundColor: isH2HWinner ? 'var(--accent-secondary-soft)' : undefined,
                            }}
                          >
                            <td
                              className="py-3 px-2 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 border-r"
                              style={{
                                backgroundColor: 'var(--bg-card-solid)',
                                borderColor: 'var(--border-subtle)',
                                color: isH2HWinner
                                  ? 'var(--accent-secondary)'
                                  : rankNum === 2
                                  ? 'var(--text-main)'
                                  : rankNum === 3
                                  ? 'var(--accent-gold)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              {rankNum}
                            </td>

                            <td
                              className="py-3 px-2.5 sm:px-4 sticky left-10 sm:left-12 z-10 border-r min-w-[140px] sm:min-w-[180px]"
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
                                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                    {p.team}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {p.gwResults.map(gr => (
                              <td key={gr.gw} className="py-3 px-2 text-center font-mono text-[10px]">
                                {gr.result !== '-' ? (
                                  <span
                                    className="inline-block px-2 py-0.5 rounded-full font-semibold"
                                    style={{
                                      backgroundColor:
                                        gr.result === 'W'
                                          ? 'var(--accent-primary-soft)'
                                          : gr.result === 'L'
                                          ? 'var(--accent-tertiary-soft)'
                                          : 'var(--bg-elevated)',
                                      color:
                                        gr.result === 'W'
                                          ? 'var(--accent-primary)'
                                          : gr.result === 'L'
                                          ? 'var(--accent-tertiary)'
                                          : 'var(--text-muted)',
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

                            <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                              {p.pCount}
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
                              {p.gf > 0 ? p.gf : '-'}
                            </td>
                            <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                              {p.ga > 0 ? p.ga : '-'}
                            </td>
                            <td
                              className="py-3 px-2 text-center font-mono font-bold"
                              style={{
                                color: p.gd > 0 ? 'var(--accent-primary)' : p.gd < 0 ? 'var(--accent-tertiary)' : 'var(--text-main)',
                              }}
                            >
                              {p.pCount > 0 ? (p.gd > 0 ? `+${p.gd}` : p.gd) : '-'}
                            </td>

                            <td
                              className="py-3 px-3 text-center font-mono font-bold text-sm"
                              style={{ color: 'var(--accent-secondary)', backgroundColor: 'var(--accent-secondary-soft)' }}
                            >
                              {p.pCount > 0 ? p.h2hPts : '-'}
                            </td>

                            <td className="py-3 px-3 sm:px-4 text-right font-mono font-semibold text-xs">
                              {isH2HWinner ? (
                                <span
                                  className="inline-block font-bold px-2.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: 'var(--accent-secondary-soft)',
                                    color: 'var(--accent-secondary)',
                                    boxShadow: 'inset 0 0 0 1px rgba(123, 140, 255, 0.3)',
                                  }}
                                >
                                  +{h2hPrizeEach.toLocaleString('vi-VN')} đ{isH2HTie ? ' (chia đều)' : ''}
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
        </div>
      </Reveal>

      {/* 10 Months Summary Grid */}
      <Reveal delayMs={110}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <h4 className="text-base sm:text-lg font-display font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Trophy className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />
              <span>Tổng hợp 10 tháng thi đấu</span>
            </h4>
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
              Tổng 2.000.000 VNĐ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {awards.map((m, idx) => (
              <div
                key={idx}
                onClick={() => chooseMonth(m.monthName)}
                className="bezel-shell bezel-interactive cursor-pointer"
              >
                <div className="bezel-core p-5">
                  <div
                    className="flex items-center justify-between pb-3.5 border-b mb-4"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.classicPoints > 0 || m.h2hPoints > 0 ? 'var(--accent-primary)' : 'var(--text-faint)' }}
                      />
                      <h5 className="text-base font-display font-bold" style={{ color: 'var(--text-main)' }}>
                        {m.monthName}
                      </h5>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums"
                        style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-muted)' }}
                      >
                        {m.gwRange}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                      200.000đ
                    </span>
                  </div>

                  {/* Dual Winners (Classic & H2H) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Classic Winner */}
                    <div className="surface-well p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className="text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <Trophy className="w-3 h-3" strokeWidth={1.6} /> Classic
                          </span>
                          <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                            100.000đ
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 my-1">
                          <PlayerAvatar name={m.classicWinner} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate font-display" style={{ color: 'var(--text-main)' }}>
                              {m.classicWinner}
                            </p>
                            <p className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              {m.classicPoints > 0 ? `${m.classicPoints} pts` : 'Chờ hoàn thành'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-2.5 pt-2 border-t text-[10px] font-mono flex items-center gap-1"
                        style={{ borderColor: 'var(--border-subtle)', color: m.paidClassic ? 'var(--accent-primary)' : 'var(--text-faint)' }}
                      >
                        {m.paidClassic ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" strokeWidth={1.6} />
                            <span>Đã chuyển thưởng</span>
                          </>
                        ) : (
                          <span>Chưa trao giải</span>
                        )}
                      </div>
                    </div>

                    {/* H2H Winner */}
                    <div className="surface-well p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className="text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1"
                            style={{ color: 'var(--accent-secondary)' }}
                          >
                            <Swords className="w-3 h-3" strokeWidth={1.6} /> H2H
                          </span>
                          <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
                            100.000đ
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 my-1">
                          <PlayerAvatar name={m.h2hWinner} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate font-display" style={{ color: 'var(--text-main)' }}>
                              {m.h2hWinner}
                            </p>
                            <p className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              {m.h2hPoints > 0 ? `${m.h2hPoints} Pts H2H` : 'Chờ hoàn thành'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-2.5 pt-2 border-t text-[10px] font-mono flex items-center gap-1"
                        style={{ borderColor: 'var(--border-subtle)', color: m.paidH2H ? 'var(--accent-secondary)' : 'var(--text-faint)' }}
                      >
                        {m.paidH2H ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" strokeWidth={1.6} />
                            <span>Đã chuyển thưởng</span>
                          </>
                        ) : (
                          <span>Chưa trao giải</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
};
