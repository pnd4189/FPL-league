import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { StadiumBackground } from './components/StadiumBackground';
import { Navbar, ThemeMode } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { DashboardView } from './components/DashboardView';
import { AdvisorChat } from './components/AdvisorChat';
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
  INITIAL_PLAYERS,
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

// Tabs other than the overview load on demand; they are fetched in the background once the page is idle.
const TAB_LOADERS = {
  classic: () => import('./components/ClassicTable').then(m => ({ default: m.ClassicTable })),
  h2h: () => import('./components/H2HArena').then(m => ({ default: m.H2HArena })),
  weekly: () => import('./components/WeeklyWinners').then(m => ({ default: m.WeeklyWinners })),
  monthly: () => import('./components/MonthlyAwards').then(m => ({ default: m.MonthlyAwards })),
  cup: () => import('./components/FantasyCup').then(m => ({ default: m.FantasyCup })),
  pool: () => import('./components/PrizePool').then(m => ({ default: m.PrizePool })),
  advisor: () => import('./components/AdvisorView').then(m => ({ default: m.AdvisorView })),
  fame: () => import('./components/HallOfFame').then(m => ({ default: m.HallOfFame })),
};

const ClassicTable = lazy(TAB_LOADERS.classic);
const H2HArena = lazy(TAB_LOADERS.h2h);
const WeeklyWinners = lazy(TAB_LOADERS.weekly);
const MonthlyAwards = lazy(TAB_LOADERS.monthly);
const FantasyCup = lazy(TAB_LOADERS.cup);
const PrizePool = lazy(TAB_LOADERS.pool);
const AdvisorView = lazy(TAB_LOADERS.advisor);
const HallOfFame = lazy(TAB_LOADERS.fame);

const ADVISOR_MANAGER_KEY = 'htcv_fpl_advisor_manager';
const THEME_STORAGE_KEY = 'htcv_fpl_theme';

const readInitialTheme = (): ThemeMode => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dusk' ? 'dusk' : 'fpl';
  } catch {
    return 'fpl';
  }
};

const readInitialManagerId = (): number => {
  try {
    const saved = Number(localStorage.getItem(ADVISOR_MANAGER_KEY));
    return INITIAL_PLAYERS.some(p => p.id === saved) ? saved : INITIAL_PLAYERS[0].id;
  } catch {
    return INITIAL_PLAYERS[0].id;
  }
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [initialAutoSyncing, setInitialAutoSyncing] = useState<boolean>(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // 2-Mode Broadcast Studio System: 'fpl' (Premier Daylight Studio) | 'dusk' (Royal Velvet Dusk)
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);

  // Persistent Global AI Assistant State (bottom-right popup + AdvisorView sync)
  const [advisorManagerId, setAdvisorManagerId] = useState<number>(readInitialManagerId);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [queuedAiPrompt, setQueuedAiPrompt] = useState<string | null>(null);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      /* private mode */
    }
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleAdvisorManagerChange = useCallback((id: number) => {
    setAdvisorManagerId(id);
    try {
      localStorage.setItem(ADVISOR_MANAGER_KEY, String(id));
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => {
      for (const load of Object.values(TAB_LOADERS)) void load();
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
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
  const [seasonNextGw, setSeasonNextGw] = useState<number | null | undefined>(undefined);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Load settled data from the Google Sheet Web App API
  const offlineRef = useRef(false);
  const retryTimer = useRef<number | null>(null);
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
    // Any placeholder table is a lie — flag it, and let the poll self-heal.
    const offline = [dash, classic, h2h, weekly, monthly].some(r => !r.ok);
    offlineRef.current = offline;
    setIsOffline(offline);
    // While offline, keep retrying in the background so the placeholder
    // tables heal themselves instead of waiting for a manual reload.
    if (offline && retryTimer.current === null) {
      retryTimer.current = window.setTimeout(() => {
        retryTimer.current = null;
        if (offlineRef.current) loadData();
      }, 15000);
    }
  }, []);

  const loadLive = useCallback(async () => {
    const payload = await fetchLiveData();
    if (payload) setLive(payload);
    return payload;
  }, []);

  const loadSeason = useCallback(async () => {
    const season = await fetchSeasonInfo();
    if (season) {
      setSeasonNextGw(season.nextGw);
      if (season.months.length) setMonths(season.months);
    }
    return season;
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
        await Promise.all([loadData(), loadLive(), loadSeason()]);
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [live?.settlementPending, loadData, loadLive, loadSeason]);

  // Initial load: settled tables, live overlay, and season calendar in parallel.
  useEffect(() => {
    const initApp = async () => {
      setInitialAutoSyncing(true);
      try {
        await Promise.all([loadData(), loadLive(), loadSeason()]);
      } catch (err) {
        console.warn('Initial load finished with errors:', err);
      } finally {
        setInitialAutoSyncing(false);
      }
    };

    initApp();
  }, [loadData, loadLive, loadSeason]);

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
      await Promise.all([loadData(), loadLive(), loadSeason()]);
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
  const liveH2HStandings = useMemo(() => {
    const merged = mergeLiveH2H(h2hStandings, live);
    // The H2H Classic column mirrors the Classic tab's live TOTAL. The h2h
    // sheet snapshot already counts the live gameweek, so re-derive it from
    // the same fresh numbers the Classic table shows instead of trusting a
    // possibly hours-old copy.
    const totals = new Map(liveClassicStandings.map(c => [c.id, c.total]));
    return merged.map(row => {
      const total = totals.get(row.id);
      return total !== undefined && total !== row.classicTotal
        ? { ...row, classicTotal: total }
        : row;
    });
  }, [h2hStandings, live, liveClassicStandings]);

  // The gameweek every standings/results tab lands on by default (settled or in-play).
  const currentGW =
    live?.gw ||
    (typeof dashboard.currentGW === 'number' ? dashboard.currentGW : dashboard.gwsCompleted || 1);
  const currentMonthName = monthOfGw(currentGW, months).name;
  const isLiveNow = !!live?.isLive;

  // The upcoming gameweek that AI Chat & Tactical Advisor advise for:
  // 1. Official FPL `nextGw` from `?action=season` (e.g. GW10 when GW9 is in-play or completed)
  // 2. Fallback before `season` resolves: if `currentGW` is already live or completed, target `currentGW + 1`
  const upcomingGW: number | null =
    seasonNextGw !== undefined
      ? seasonNextGw
      : isLiveNow || (dashboard.gwsCompleted || 0) >= currentGW
      ? currentGW < 38
        ? currentGW + 1
        : null
      : currentGW;

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col font-sans transition-colors duration-300 ease-out-strong"
      data-theme={theme}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Calibrated Broadcast Atmosphere & Pitch Grid */}
      <StadiumBackground theme={theme} />

      {/* Detached Floating Fluid Island Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSync={handleSync}
        isSyncing={isSyncing || initialAutoSyncing}
        lastUpdated={dashboard.lastUpdated}
        theme={theme}
        setTheme={handleThemeChange}
        onOpenAi={() => setIsAiOpen(true)}
      />

      {/* Detached Status Pill: loading -> live -> offline fallback */}
      {(initialAutoSyncing || isLiveNow || isOffline) && (
        <div className="relative z-20 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 flex justify-center">
          <div
            className="surface-well inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[14px] font-mono font-medium tabular-nums"
            style={{
              color: isOffline ? 'var(--accent-tertiary)' : 'var(--accent-primary)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-soft flex-shrink-0"
              style={{
                backgroundColor: isOffline ? 'var(--accent-tertiary)' : 'var(--accent-primary)',
              }}
            />
            {initialAutoSyncing ? (
              <span>Đang đồng bộ dữ liệu FPL mới nhất về hệ thống...</span>
            ) : isOffline ? (
              <span>Không kết nối được máy chủ dữ liệu · Đang hiển thị bảng dự phòng, hệ thống sẽ tự kết nối lại.</span>
            ) : (
              <span>
                Trực tiếp GW{live?.gw} · Điểm số đang tự động cập nhật
                {live?.updatedAt ? ` (${new Date(live.updatedAt).toLocaleTimeString('vi-VN')})` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area with Editorial Macro-Whitespace */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Editorial Split + Z-Axis Broadcast Hero (Shown on Overview) */}
        {activeTab === 'dashboard' && (
          <HeroBanner
            dashboard={dashboard}
            classicLeader={liveClassicStandings[0]}
            h2hLeader={liveH2HStandings[0]}
            upcomingGW={upcomingGW}
            isLive={isLiveNow}
            onExploreClick={() => setActiveTab('classic')}
            onOpenAi={() => setIsAiOpen(true)}
            onOpenPool={() => setActiveTab('pool')}
            onSelectPlayer={id => setSelectedPlayerId(id)}
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
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        <Suspense
          fallback={
            <div className="py-24 text-center text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              Đang tải...
            </div>
          }
        >
        {activeTab === 'classic' && (
          <ClassicTable
            standings={liveClassicStandings}
            currentGW={currentGW}
            isLive={isLiveNow}
            live={live}
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'h2h' && (
          <H2HArena
            standings={liveH2HStandings}
            currentGW={currentGW}
            isLive={isLiveNow}
            live={live}
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyWinners
            winners={weeklyWinners}
            classicStandings={liveClassicStandings}
            currentGW={currentGW}
            isLive={isLiveNow}
            live={live}
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyAwards
            awards={monthlyAwards}
            classicStandings={liveClassicStandings}
            h2hStandings={liveH2HStandings}
            currentMonthName={currentMonthName}
            currentGW={currentGW}
            isLive={isLiveNow}
            live={live}
            months={months}
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'cup' && <FantasyCup />}

        {activeTab === 'pool' && (
          <PrizePool
            weeklyWinners={weeklyWinners}
            monthlyAwards={monthlyAwards}
            classicStandings={liveClassicStandings}
            h2hStandings={liveH2HStandings}
            onSelectPlayer={id => setSelectedPlayerId(id)}
          />
        )}

        {activeTab === 'advisor' && (
          <AdvisorView
            managerId={advisorManagerId}
            upcomingGW={upcomingGW}
            live={live}
            liveReady={!initialAutoSyncing}
            onManagerChange={handleAdvisorManagerChange}
            onOpenAiChat={prompt => {
              if (prompt) setQueuedAiPrompt(prompt);
              setIsAiOpen(true);
            }}
          />
        )}

        {activeTab === 'fame' && <HallOfFame />}
        </Suspense>
      </main>

      {/* Manager Detail Deep-Dive Modal */}
      <ManagerModal
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        classicStandings={liveClassicStandings}
        h2hStandings={liveH2HStandings}
        currentGW={currentGW}
        onAskAi={id => {
          handleAdvisorManagerChange(id);
          setIsAiOpen(true);
        }}
      />

      {/* Persistent Global Bottom-Right AI Assistant Popup */}
      <AdvisorChat
        isOpen={isAiOpen}
        onOpenChange={setIsAiOpen}
        managerId={advisorManagerId}
        onManagerChange={handleAdvisorManagerChange}
        upcomingGW={upcomingGW}
        live={live}
        liveReady={!initialAutoSyncing}
        queuedPrompt={queuedAiPrompt}
        onConsumePrompt={() => setQueuedAiPrompt(null)}
        onOpenAdvisorTab={() => setActiveTab('advisor')}
      />

      {/* Editorial Footer (pb-28 on mobile clears floating bottom island dock + AI launcher) */}
      <footer
        className="relative z-10 w-full border-t py-12 md:py-16 pb-28 md:pb-16 mt-16 md:mt-24 transition-colors duration-300 ease-out-strong"
        style={{
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span>HTCV Open League · Season 2026-2027</span>
          </div>
          <span style={{ color: 'var(--text-faint)' }}>
            14 Managers · Classic & Head-to-Head Official Hub
          </span>
        </div>
      </footer>
    </div>
  );
};
