import React, { useState } from 'react';
import { Trophy, RefreshCw, Zap, Moon, Sun, Flame, Sparkles, Swords, Calendar, Award, DollarSign, Activity } from 'lucide-react';
import confetti from 'canvas-confetti';

export type ThemeMode = 'fpl' | 'dark' | 'light' | 'volt';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastUpdated: string;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSync,
  isSyncing,
  lastUpdated,
  theme,
  setTheme,
}) => {
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncClick = async () => {
    try {
      await onSync();
      // Celebrate successful sync
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.1, x: 0.85 },
        colors: ['#00ff87', '#04f5ff', '#ffd700'],
      });
      setSyncStatus('Đồng bộ thành công!');
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (e: any) {
      setSyncStatus('Đồng bộ thất bại');
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Activity },
    { id: 'classic', label: 'Classic League', shortLabel: 'Classic', icon: Trophy },
    { id: 'h2h', label: 'H2H League', shortLabel: 'H2H', icon: Swords },
    { id: 'weekly', label: 'Nhất Tuần (50k)', shortLabel: 'Tuần', icon: Zap },
    { id: 'monthly', label: 'Nhất Tháng', shortLabel: 'Tháng', icon: Calendar },
    { id: 'cup', label: 'Fantasy Cup', shortLabel: 'Cup', icon: Award },
    { id: 'pool', label: 'Giải Thưởng', shortLabel: 'Thưởng', icon: DollarSign },
  ];

  const themes: { id: ThemeMode; name: string; icon: any; previewColor: string; label: string }[] = [
    { id: 'fpl', name: 'FPL Classic', icon: Flame, previewColor: '#37003c', label: 'FPL' },
    { id: 'dark', name: 'Midnight Dark', icon: Moon, previewColor: '#10b981', label: 'Dark' },
    { id: 'light', name: 'Studio Light', icon: Sun, previewColor: '#4338ca', label: 'Light' },
    { id: 'volt', name: 'Volt Athletic', icon: Zap, previewColor: '#ccff00', label: 'Volt' },
  ];

  return (
    <>
      {/* 📱 TOP HEADER (Desktop & Mobile) */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b transition-colors duration-300 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-2">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl p-0.5 shadow-md border flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-brand), #120520)',
                  borderColor: 'var(--border-highlight)'
                }}
              >
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 drop-shadow" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs md:text-sm font-mono tracking-wider font-bold uppercase truncate" style={{ color: 'var(--accent-secondary)' }}>
                    FPL 2026-2027
                  </span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30">
                    Official
                  </span>
                </div>
                <h1 className="text-sm sm:text-base md:text-xl font-display font-black tracking-tight flex items-center gap-1 truncate" style={{ color: 'var(--text-main)' }}>
                  HTCV <span style={{ color: 'var(--accent-primary)' }}>OPEN LEAGUE</span>
                </h1>
              </div>
            </div>

            {/* Right Action Bar: Theme Switcher + Sync Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              
              {/* 🎨 4-Theme Segmented Selector */}
              <div className="flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl border backdrop-blur-md transition-colors"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`interactive relative p-1 sm:p-1.5 md:px-2.5 md:py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                        isSelected
                          ? 'shadow-md scale-105'
                          : 'opacity-60 hover:opacity-100 hover:bg-white/10'
                      }`}
                      style={isSelected ? {
                        backgroundColor: 'var(--bg-card-hover)',
                        color: 'var(--text-main)',
                        border: `1px solid var(--border-highlight)`
                      } : {
                        color: 'var(--text-muted)'
                      }}
                      title={`Chuyển giao diện: ${t.name}`}
                    >
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: isSelected ? 'var(--accent-primary)' : undefined }} />
                      <span className="hidden lg:inline text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sync Live Button */}
              <button
                onClick={handleSyncClick}
                disabled={isSyncing}
                className={`interactive group relative inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-xl font-semibold text-xs md:text-sm transition-all duration-300 border ${
                  isSyncing
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95 shadow-md'
                }`}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-highlight)',
                  color: 'var(--accent-primary)'
                }}
                title="Kéo dữ liệu mới nhất từ FPL API qua Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="hidden md:inline font-display">
                  {isSyncing ? 'Đang đồng bộ...' : 'Sync Live'}
                </span>
                <span className="md:hidden font-display text-[11px]">
                  {isSyncing ? '...' : 'Sync'}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar (Scrollable on tablet/mobile, clean on desktop) */}
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t touch-scroll no-scrollbar"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`interactive flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'shadow-md border scale-105'
                      : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={isActive ? {
                    backgroundColor: 'var(--bg-card-hover)',
                    color: 'var(--text-main)',
                    borderColor: 'var(--border-highlight)'
                  } : {
                    color: 'var(--text-muted)'
                  }}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span className="font-display">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 📱 MOBILE FLOATING DOCKED BOTTOM NAVIGATION (FotMob / Official App Style for <768px screens) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 backdrop-blur-2xl border-t transition-colors pb-safe shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="grid grid-cols-7 items-center h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center py-1 relative transition-all active:scale-90"
              >
                <div className="relative">
                  <Icon
                    className="w-5 h-5 transition-transform"
                    style={{
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    />
                  )}
                </div>
                <span
                  className="text-[9px] font-mono tracking-tighter mt-0.5 truncate max-w-full font-bold"
                  style={{
                    color: isActive ? 'var(--text-main)' : 'var(--text-faint)'
                  }}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
