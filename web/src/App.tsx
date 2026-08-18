import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FootballCursor } from './components/FootballCursor';
import { StadiumBackground } from './components/StadiumBackground';
import { Navbar, ThemeMode } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { DashboardView } from './components/DashboardView';
import { ClassicTable } from './components/ClassicTable';
import { H2HArena } from './components/H2HArena';
import { WeeklyWinners } from './components/WeeklyWinners';
import { MonthlyAwards } from './components/MonthlyAwards';
import { FantasyCup } from './components/FantasyCup';
import { PrizePool } from './components/PrizePool';
import { ManagerModal } from './components/ManagerModal';

import {
  fetchDashboardData,
  fetchClassicStandings,
  fetchH2HStandings,
  fetchWeeklyWinners,
  fetchMonthlyAwards,
  fetchLiveData,
  fetchSeasonInfo,
  triggerLiveSync,
} from './services/fplApi';
import {
  mergeLiveClassic,
  mergeLiveH2H,
  monthOfGw,
  livePollInterval,
  MonthRange,
} from './services/liveStandings';

import {
  INITIAL_DASHBOARD,
  INITIAL_CLASSIC_STANDINGS,
  INITIAL_H2H_STANDINGS,
  INITIAL_WEEKLY_WINNERS,
  INITIAL_MONTHLY_AWARDS,
  MONTH_RANGES,
} from './data/initialData';

import {
  LeagueDashboardData,
  ClassicStanding,
  H2HStanding,
  WeeklyWinner,
  MonthlyAward,
  LiveGwData,
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [initialAutoSyncing, setInitialAutoSyncing] = useState<boolean>(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // 4 Design Themes: 'fpl' | 'dark' | 'light' | 'volt'
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('htcv_fpl_theme');
    return (saved as ThemeMode) || 'fpl';
  });

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('htcv_fpl_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Application Data States (settled data written by the backend)
  const [dashboard, setDashboard] = useState<LeagueDashboardData>(INITIAL_DASHBOARD);
  const [classicStandings, setClassicStandings] = useState<ClassicStanding[]>(INITIAL_CLASSIC_STANDINGS);
  const [h2hStandings, setH2HStandings] = useState<H2HStanding[]>(INITIAL_H2H_STANDINGS);
  const [weeklyWinners, setWeeklyWinners] = useState<WeeklyWinner[]>(INITIAL_WEEKLY_WINNERS);
  const [monthlyAwards, setMonthlyAwards] = useState<MonthlyAward[]>(INITIAL_MONTHLY_AWARDS);

  // Provisional in-play data, refreshed on its own faster clock
  const [live, setLive] = useState<LiveGwData | null>(null);
  const [months, setMonths] = useState<MonthRange[]>(MONTH_RANGES);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Load settled data from the Google Sheet Web App API
  const loadData = useCallback(async () => {
    const [dash, classic, h2h, weekly, monthly] = await Promise.all([
      fetchDashboardData(),
      fetchClassicStandings(),
      fetchH2HStandings(),
      fetchWeeklyWinners(),
      fetchMonthlyAwards(),
    ]);
    setDashboard(dash.data);
    setClassicStandings(classic.data);
    setH2HStandings(h2h.data);
    setWeeklyWinners(weekly.data);
    setMonthlyAwards(monthly.data);
    // Surface the fallback instead of passing placeholder tables off as real.
    setIsOffline(!dash.ok && !classic.ok && !h2h.ok);
  }, []);

  const loadLive = useCallback(async () => {
    const payload = await fetchLiveData();
    if (payload) setLive(payload);
    return payload;
  }, []);

  /**
   * Rebuild the settled tables when the backend reports a gameweek has just
   * finished. Opening the site therefore still pulls the newest data — but it
   * only pays for the multi-minute rebuild when there is genuinely something
   * new to settle, instead of on every single page view.
   */
  const settlementRequested = useRef(false);
  useEffect(() => {
    if (!live?.settlementPending || settlementRequested.current) return;
    settlementRequested.current = true;

    (async () => {
      setIsSyncing(true);
      try {
        await triggerLiveSync();
        await Promise.all([loadData(), loadLive()]);
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [live?.settlementPending, loadData, loadLive]);

  // Initial load: settled tables first, then the live overlay on top.
  useEffect(() => {
    const initApp = async () => {
      setInitialAutoSyncing(true);
      try {
        await Promise.all([loadData(), loadLive()]);
        const season = await fetchSeasonInfo();
        if (season && season.months.length) setMonths(season.months);
      } catch (err) {
        console.warn('Initial load finished with errors:', err);
      } finally {
        setInitialAutoSyncing(false);
      }
    };

    initApp();
  }, [loadData, loadLive]);

  /**
   * Keep the live overlay moving while people are watching.
   *
   * Polling is paused on hidden tabs and paced by match state, so an idle
   * afternoon costs one call every 15 minutes while a live match costs one a
   * minute. A full rebuild is deliberately not run on page load any more: it
   * takes minutes and every visitor was triggering one.
   */
  const pollMs = livePollInterval(live);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadLive();
    };

    // Coming back to the tab should show current scores immediately.
    const onVisibilityChange = () => tick();

    const timer = window.setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // Re-running on pollMs is the point: the cadence tightens to a minute when
    // matches kick off and relaxes again once the gameweek is settled.
  }, [pollMs, loadLive]);

  // Handle Manual Full Sync (rebuilds the settled tables)
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerLiveSync();
      await Promise.all([loadData(), loadLive()]);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Standings shown to visitors always include the gameweek in progress, so
  // the table re-orders itself as goals go in rather than waiting for a
  // finished gameweek.
  const liveClassicStandings = useMemo(
    () => mergeLiveClassic(classicStandings, live),
    [classicStandings, live],
  );
  const liveH2HStandings = useMemo(
    () => mergeLiveH2H(h2hStandings, live),
    [h2hStandings, live],
  );

  // The gameweek every tab lands on by default — no manual switching needed.
  const currentGW = live?.gw
    || (typeof dashboard.currentGW === 'number' ? dashboard.currentGW : dashboard.gwsCompleted || 1);
  const currentMonthName = monthOfGw(currentGW, months).name;
  const isLiveNow = !!live?.isLive;

  return (
    <div className="relative min-h-screen flex flex-col font-sans transition-colors duration-300" data-theme={theme}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)'
      }}
    >
      {/* ⚽ Compact 3D Football Cursor with Spinning Mini-Balls Trail */}
      <FootballCursor />

      {/* 🏟️ Stadium Atmosphere Background */}
      <StadiumBackground theme={theme} />

      {/* Top Floating Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSync={handleSync}
        isSyncing={isSyncing || initialAutoSyncing}
        lastUpdated={dashboard.lastUpdated}
        theme={theme}
        setTheme={handleThemeChange}
      />

      {/* Data status bar: loading → live → offline fallback */}
      {(initialAutoSyncing || isLiveNow || isOffline) && (
        <div className="relative z-20 border-b py-1.5 px-4 text-center transition-colors"
          style={{
            background: 'linear-gradient(90deg, var(--bg-card), var(--bg-card-hover))',
            borderColor: 'var(--border-highlight)'
          }}
        >
          <p className="text-[11px] font-mono font-semibold flex items-center justify-center gap-2"
            style={{ color: isOffline ? '#ff6b6b' : 'var(--accent-primary)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: isOffline ? '#ff6b6b' : 'var(--accent-primary)' }} />
            {initialAutoSyncing ? (
              <span>⚡ Đang kéo dữ liệu FPL mới nhất về hệ thống...</span>
            ) : isOffline ? (
              <span>⚠️ Không kết nối được máy chủ dữ liệu — đang hiển thị bảng mẫu, số liệu chưa phải thực tế.</span>
            ) : (
              <span>
                🔴 LIVE — GW{live?.gw} đang diễn ra, bảng xếp hạng tự cập nhật
                {live?.updatedAt ? ` (lúc ${new Date(live.updatedAt).toLocaleTimeString('vi-VN')})` : ''}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {/* Superstars Hero Banner (Shown on Dashboard & overview) */}
        {activeTab === 'dashboard' && (
          <HeroBanner
            dashboard={dashboard}
            onExploreClick={() => setActiveTab('classic')}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            dashboard={dashboard}
            classicStandings={liveClassicStandings}
            h2hStandings={liveH2HStandings}
            weeklyWinners={weeklyWinners}
            monthlyAwards={monthlyAwards}
            currentGW={currentGW}
            isLive={isLiveNow}
            months={months}
            onSelectTab={setActiveTab}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'classic' && (
          <ClassicTable
            standings={liveClassicStandings}
            currentGW={currentGW}
            currentMonthName={currentMonthName}
            isLive={isLiveNow}
            months={months}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'h2h' && (
          <H2HArena
            standings={liveH2HStandings}
            currentGW={currentGW}
            isLive={isLiveNow}
            live={live}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyWinners
            winners={weeklyWinners}
            classicStandings={liveClassicStandings}
            currentGW={currentGW}
            isLive={isLiveNow}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyAwards
            awards={monthlyAwards}
            classicStandings={liveClassicStandings}
            h2hStandings={liveH2HStandings}
            currentMonthName={currentMonthName}
            isLive={isLiveNow}
            months={months}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'cup' && (
          <FantasyCup />
        )}

        {activeTab === 'pool' && (
          <PrizePool
            weeklyWinners={weeklyWinners}
            monthlyAwards={monthlyAwards}
            classicStandings={liveClassicStandings}
            h2hStandings={liveH2HStandings}
            onSelectPlayer={(id) => setSelectedPlayerId(id)}
          />
        )}

      </main>

      {/* Manager Detail Deep-Dive Modal */}
      <ManagerModal
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        classicStandings={liveClassicStandings}
        h2hStandings={liveH2HStandings}
      />

      {/* Footer (with pb-20 on mobile to clear mobile bottom navigation bar) */}
      <footer className="relative z-10 w-full border-t backdrop-blur-md py-6 pb-24 md:pb-6 mt-12 transition-colors"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center text-xs font-mono text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--text-main)' }}>HTCV Open League Season 2026-2027 • Official League Hub</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
