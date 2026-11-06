import React, { useEffect, useState } from 'react';
import {
  Trophy,
  RefreshCw,
  Zap,
  Moon,
  Sun,
  Swords,
  Calendar,
  Award,
  Wallet,
  LayoutGrid,
  Crown,
  Compass,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export type ThemeMode = 'fpl' | 'dusk';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastUpdated: string;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onOpenAi: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Home', desc: 'Bục vinh quang và tâm điểm vòng đấu', icon: LayoutGrid },
  { id: 'classic', label: 'Classic', shortLabel: 'Classic', desc: 'Bảng tổng sắp 38 vòng tính điểm thực', icon: Trophy },
  { id: 'h2h', label: 'H2H', shortLabel: 'H2H', desc: 'Đối đầu trực tiếp 1v1 từng vòng', icon: Swords },
  { id: 'weekly', label: 'Nhất tuần', shortLabel: 'Tuần', desc: 'Đua điểm cao nhất mỗi Gameweek', icon: Zap },
  { id: 'monthly', label: 'Nhất tháng', shortLabel: 'Tháng', desc: 'Bảng tổng kết 10 chặng trong mùa', icon: Calendar },
  { id: 'cup', label: 'Fantasy Cup', shortLabel: 'Cup', desc: 'Nhánh đấu loại trực tiếp Top 8 cuối mùa', icon: Award },
  { id: 'pool', label: 'Quỹ thưởng', shortLabel: 'Quỹ', desc: 'Thống kê giải thưởng thực nhận 7 triệu', icon: Wallet },
  { id: 'advisor', label: 'Phân tích', shortLabel: 'Phân tích', desc: 'Điểm kỳ vọng xP, Captain và chuyển nhượng', icon: Compass },
  { id: 'fame', label: 'Vinh danh', shortLabel: 'Vinh danh', desc: 'Lịch sử các nhà vô địch qua từng mùa', icon: Crown },
];

const MOBILE_DOCK_IDS = ['dashboard', 'classic', 'h2h', 'weekly', 'advisor'];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSync,
  isSyncing,
  lastUpdated,
  theme,
  setTheme,
  onOpenAi,
}) => {
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleSyncClick = async () => {
    try {
      await onSync();
      setSyncNotice('Đã cập nhật');
      window.setTimeout(() => setSyncNotice(null), 3200);
    } catch {
      setSyncNotice('Lỗi đồng bộ');
      window.setTimeout(() => setSyncNotice(null), 3200);
    }
  };

  const selectTab = (id: string) => {
    setActiveTab(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dusk' ? 'fpl' : 'dusk');
  };

  return (
    <>
      {/* FLOATING FLUID ISLAND NAVBAR (Detached from top edge) */}
      <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-6 lg:px-8 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div
            className="pointer-events-auto w-full xl:w-auto rounded-full p-1.5 backdrop-blur-2xl transition-[box-shadow,background-color] duration-300 ease-out-strong"
            style={{
              backgroundColor: 'var(--bg-tray)',
              boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)',
            }}
          >
            <div
              className="flex items-center justify-between gap-2 sm:gap-3 rounded-full px-2.5 sm:px-3.5 py-1.5"
              style={{
                backgroundColor: 'var(--bg-header)',
                boxShadow: 'inset 0 1px 0 0 var(--inner-highlight)',
              }}
            >
              {/* Brand Emblem */}
              <button
                type="button"
                onClick={() => selectTab('dashboard')}
                className="pressable flex items-center gap-2.5 pl-1 pr-2 py-0.5 rounded-full text-left flex-shrink-0 whitespace-nowrap"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, #4b0b52 0%, #240429 100%)',
                    boxShadow: '0 4px 12px -3px rgba(56,0,60,0.45), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                >
                  <Trophy className="w-3.5 h-3.5" strokeWidth={1.6} style={{ color: '#34d399' }} />
                </div>
                <div className="leading-none">
                  <span
                    className="block text-[12px] font-mono uppercase tracking-[0.18em] font-semibold"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    FPL 26/27
                  </span>
                  <span
                    className="block text-xs sm:text-[13px] font-display font-extrabold tracking-tight mt-0.5"
                    style={{ color: 'var(--text-main)' }}
                  >
                    HTCV Open
                  </span>
                </div>
              </button>

              {/* Desktop Navigation Pill Rail */}
              <nav className="hidden xl:flex items-center gap-0.5 px-1" aria-label="Điều hướng chính">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className="pressable whitespace-nowrap relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-[color,background-color,transform,box-shadow] duration-200 ease-out-strong"
                      style={
                        isActive
                          ? {
                              backgroundColor: 'var(--accent-brand)',
                              color: 'var(--accent-brand-ink)',
                              boxShadow: '0 6px 14px -6px rgba(56, 0, 60, 0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                            }
                          : {
                              color: 'var(--text-muted)',
                            }
                      }
                    >
                      <Icon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        strokeWidth={1.5}
                        style={{ color: isActive ? 'var(--accent-brand-spark)' : 'var(--text-faint)' }}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Tablet Active Section Indicator */}
              <div className="hidden md:flex xl:hidden items-center gap-1 overflow-x-auto no-scrollbar max-w-[48vw]">
                {NAV_ITEMS.slice(0, 6).map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className="pressable whitespace-nowrap flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-[color,background-color,transform] duration-200 ease-out-strong"
                      style={
                        isActive
                          ? {
                              backgroundColor: 'var(--accent-brand)',
                              color: 'var(--accent-brand-ink)',
                            }
                          : { color: 'var(--text-muted)' }
                      }
                    >
                      {item.shortLabel}
                    </button>
                  );
                })}
              </div>

              {/* Right Controls: AI Trigger, Theme Switcher, Sync Pill, Fluid Hamburger */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Quick AI Trigger in Header (Desktop/Tablet) */}
                <button
                  type="button"
                  onClick={onOpenAi}
                  className="pressable hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out-strong"
                  style={{
                    backgroundColor: 'var(--accent-primary-soft)',
                    color: 'var(--accent-primary)',
                    boxShadow: '0 0 0 1px var(--border-highlight)',
                  }}
                  title="Mở cửa sổ hỏi đáp Trợ lý AI"
                >
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span className="hidden lg:inline">AI</span>
                </button>

                {/* 2-Mode Broadcast Studio Switcher (Premier Daylight / Royal Velvet Dusk) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="pressable w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,transform] duration-200 ease-out-strong"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    color: 'var(--text-secondary)',
                    boxShadow: '0 0 0 1px var(--border-subtle), inset 0 1px 0 0 var(--inner-highlight)',
                  }}
                  title={
                    theme === 'dusk'
                      ? 'Chuyển sang Premier Studio (Sáng)'
                      : 'Chuyển sang Royal Velvet (Tím dịu mắt)'
                  }
                  aria-label="Đổi sắc thái giao diện"
                >
                  {theme === 'dusk' ? (
                    <Sun className="w-3.5 h-3.5" strokeWidth={1.6} />
                  ) : (
                    <Moon className="w-3.5 h-3.5" strokeWidth={1.6} />
                  )}
                </button>

                {/* Nested Button-in-Button Sync Island */}
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="pressable group whitespace-nowrap inline-flex items-center gap-2 rounded-full pl-1 sm:pl-3 pr-1 py-1 text-xs font-medium transition-[background-color,box-shadow,transform,opacity] duration-200 ease-out-strong disabled:opacity-55"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    color: 'var(--text-main)',
                    boxShadow: '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)',
                  }}
                  title={lastUpdated ? `Cập nhật gần nhất: ${lastUpdated}` : 'Đồng bộ dữ liệu mới nhất'}
                >
                  <span
                    className="hidden sm:inline text-[14px] font-semibold"
                    style={{ color: syncNotice ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                  >
                    {isSyncing ? 'Đang tải' : syncNotice || 'Làm mới'}
                  </span>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ease-out-strong group-hover:scale-105"
                    style={{
                      backgroundColor: 'var(--accent-primary-soft)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isSyncing ? 'animate-spin-smooth' : ''}`}
                      strokeWidth={1.6}
                    />
                  </span>
                </button>

                {/* Fluid 2-Line Hamburger Morph Button (Shown below xl) */}
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
                  className="pressable xl:hidden relative w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    boxShadow: '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)',
                  }}
                >
                  <span
                    className="absolute w-3.5 h-[1.5px] rounded-full transition-transform duration-300 ease-fluid"
                    style={{
                      backgroundColor: 'var(--text-main)',
                      transform: menuOpen ? 'translateY(0) rotate(45deg)' : 'translateY(-3px) rotate(0deg)',
                    }}
                  />
                  <span
                    className="absolute w-3.5 h-[1.5px] rounded-full transition-transform duration-300 ease-fluid"
                    style={{
                      backgroundColor: 'var(--text-main)',
                      transform: menuOpen ? 'translateY(0) rotate(-45deg)' : 'translateY(3px) rotate(0deg)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* EXPANDED GLASS MODAL NAVIGATION WITH STAGGERED MASK REVEAL */}
      <div
        className={`fixed inset-0 z-50 xl:hidden backdrop-blur-3xl transition-opacity duration-500 ease-fluid ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          className="max-w-2xl mx-auto px-5 pt-20 pb-28 h-full overflow-y-auto flex flex-col justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <span className="eyebrow-pill">Danh mục giải đấu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="pressable px-3 py-1 rounded-full text-xs font-mono"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 0 0 1px var(--border-outer)',
                }}
              >
                Đóng · Esc
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NAV_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    style={{
                      transitionDelay: menuOpen ? `${45 + idx * 35}ms` : '0ms',
                      backgroundColor: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      boxShadow: isActive
                        ? '0 0 0 1px var(--border-highlight), var(--shadow-ambient)'
                        : '0 0 0 1px var(--border-outer), var(--shadow-ambient)',
                      transform: menuOpen ? 'translateY(0)' : 'translateY(24px)',
                      opacity: menuOpen ? 1 : 0,
                    }}
                    className="pressable group flex items-center justify-between p-3.5 rounded-2xl text-left transition-[transform,opacity,background-color,box-shadow] duration-500 ease-fluid"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-brand)' : 'var(--bg-card-solid)',
                          color: isActive ? 'var(--accent-brand-spark)' : 'var(--text-secondary)',
                        }}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                          {item.label}
                        </p>
                        <p className="text-[14px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight
                      className="w-4 h-4 flex-shrink-0 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.5}
                      style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-faint)' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="mt-6 pt-4 flex items-center justify-between text-xs font-mono"
            style={{ borderTop: '1px solid rgba(255,255,255,0.16)', color: '#f8f7fc' }}
          >
            <span>HTCV Open League · 2026/27</span>
            <span>{lastUpdated ? `Cập nhật: ${lastUpdated}` : 'Tự động đồng bộ'}</span>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING ISLAND BOTTOM DOCK (<768px) */}
      <nav
        aria-label="Điều hướng nhanh trên điện thoại"
        className="md:hidden fixed bottom-3 inset-x-3 z-30 pointer-events-none pb-safe"
      >
        <div
          className="pointer-events-auto max-w-md mx-auto rounded-full p-1 backdrop-blur-2xl"
          style={{
            backgroundColor: 'var(--bg-tray)',
            boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)',
          }}
        >
          <div
            className="grid grid-cols-5 items-center rounded-full px-1 py-1"
            style={{
              backgroundColor: 'var(--bg-header)',
              boxShadow: 'inset 0 1px 0 0 var(--inner-highlight)',
            }}
          >
            {MOBILE_DOCK_IDS.map((id) => {
              const item = NAV_ITEMS.find((n) => n.id === id)!;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className="pressable flex flex-col items-center justify-center py-1.5 rounded-full transition-[background-color,color,transform] duration-200 ease-out-strong"
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--accent-brand)',
                          color: 'var(--accent-brand-ink)',
                        }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  <Icon
                    className="w-4 h-4"
                    strokeWidth={1.5}
                    style={{ color: isActive ? 'var(--accent-brand-spark)' : 'var(--text-muted)' }}
                  />
                  <span className="text-[13px] font-semibold mt-0.5 tracking-tight">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
