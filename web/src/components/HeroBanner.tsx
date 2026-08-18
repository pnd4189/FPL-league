import React from 'react';
import { Trophy, Calendar, Zap, Crown, Flame, Sparkles } from 'lucide-react';
import { LeagueDashboardData } from '../types';

interface HeroBannerProps {
  dashboard: LeagueDashboardData;
  onExploreClick?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ dashboard }) => {
  return (
    <div className="w-full space-y-4 mb-8">
      
      {/* 🌟 1. HERO VISUAL SHOWCASE: 100% Full Unobstructed Superstars & Premier League Trophy */}
      <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl border shadow-2xl group"
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:h-[340px] lg:h-[380px] overflow-hidden bg-slate-950">
          <img
            src="/assets/pl_stars_banner.jpg"
            alt="Premier League Superstars & Trophy: Haaland, Palmer, Saka, Bruno, Rice, Semenyo, Rogers, Isak, Thiago, Porro, Pickford"
            className="w-full h-full object-cover object-center scale-100 group-hover:scale-[1.015] transition-transform duration-700 ease-out"
          />

          {/* Very Subtle Edge Glow Vignette (Preserves complete visibility of Haaland & Trophy on left) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Floating Top Header Badges (Positioned cleanly at top corners without blocking any faces/trophy) */}
          <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-5 flex items-center justify-between pointer-events-auto z-10">
            
            {/* Live GW Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border shadow-lg text-xs font-mono font-bold"
              style={{
                borderColor: 'var(--border-highlight)',
                color: 'var(--accent-primary)'
              }}
            >
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
              <span className="uppercase tracking-wider">{dashboard.currentGW}</span>
            </div>

            {/* Total Prize Pool Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-black/65 backdrop-blur-md border shadow-lg font-mono text-xs font-black"
              style={{
                borderColor: 'var(--accent-gold)',
                color: 'var(--accent-gold)'
              }}
            >
              <Trophy className="w-4 h-4 fill-current" />
              <span>TỔNG QUỸ: 7.000.000 VNĐ</span>
            </div>

          </div>

          {/* Floating Bottom Subtle Watermark */}
          <div className="absolute bottom-3 left-4 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>HTCV Official Season 2026-2027</span>
          </div>
        </div>
      </div>

      {/* 🏆 2. TOURNAMENT INFO & PRIZE STRUCTURE COMMAND CENTER */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden">
        
        {/* Main Title & Tournament Info Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-mono text-white shadow-sm"
                style={{ backgroundColor: 'var(--accent-tertiary)' }}
              >
                Official 2026-2027
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                14 HLV Tranh Tài • 38 Vòng Đấu Kịch Tính
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black leading-tight tracking-tight"
              style={{ color: 'var(--text-main)' }}
            >
              ĐẤU TRƯỜNG <span style={{ color: 'var(--accent-primary)' }}>HTCV OPEN LEAGUE</span>
            </h2>

            <p className="text-xs sm:text-sm mt-1.5 font-normal leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              Giải đấu Fantasy Ngoại hạng Anh thường niên quy tụ 14 HLV hàng đầu. Tranh tài song song 2 mặt trận Classic & H2H League với 38 vòng đấu đỉnh cao.
            </p>
          </div>

          {/* Quick Format Pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <Flame className="w-5 h-5" style={{ color: 'var(--accent-tertiary)' }} />
            <div>
              <p className="text-[10px] uppercase font-mono font-bold" style={{ color: 'var(--text-faint)' }}>Thể thức thi đấu</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Song song Classic & H2H</p>
            </div>
          </div>
        </div>

        {/* 4 Key Prize Cards Grid (High Contrast & Perfectly Styled in All 4 Themes) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 pt-6">
          
          {/* Card 1: Nhất Vòng */}
          <div className="rounded-2xl p-3.5 sm:p-4 border transition-all shadow-sm flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  Nhất Vòng
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(0, 255, 135, 0.08)',
                    borderColor: 'rgba(0, 255, 135, 0.25)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  38 Giải
                </span>
              </div>
              <p className="text-base sm:text-xl font-black font-mono" style={{ color: 'var(--accent-primary)' }}>
                50.000đ <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ GW</span>
              </p>
            </div>
            <p className="text-[10px] font-mono mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
              Tổng thưởng 1.900.000 VNĐ
            </p>
          </div>

          {/* Card 2: Nhất Tháng */}
          <div className="rounded-2xl p-3.5 sm:p-4 border transition-all shadow-sm flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent-secondary)' }} />
                  Nhất Tháng
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(4, 245, 255, 0.08)',
                    borderColor: 'rgba(4, 245, 255, 0.25)',
                    color: 'var(--accent-secondary)'
                  }}
                >
                  10 Tháng
                </span>
              </div>
              <p className="text-base sm:text-xl font-black font-mono" style={{ color: 'var(--accent-secondary)' }}>
                200.000đ <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ Tháng</span>
              </p>
            </div>
            <p className="text-[10px] font-mono mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
              Classic 100k + H2H 100k (2.0M)
            </p>
          </div>

          {/* Card 3: Vô Địch Cả Mùa */}
          <div className="rounded-2xl p-3.5 sm:p-4 border transition-all shadow-sm flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
                  Vô Địch Cả Mùa
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.08)',
                    borderColor: 'rgba(255, 215, 0, 0.25)',
                    color: 'var(--accent-gold)'
                  }}
                >
                  2 Mặt Trận
                </span>
              </div>
              <p className="text-base sm:text-xl font-black font-mono" style={{ color: 'var(--accent-gold)' }}>
                800.000đ <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ Giải</span>
              </p>
            </div>
            <p className="text-[10px] font-mono mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
              Top 1, 2, 3 Classic & H2H (3.0M)
            </p>
          </div>

          {/* Card 4: Fantasy Cup */}
          <div className="rounded-2xl p-3.5 sm:p-4 border transition-all shadow-sm flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Crown className="w-3.5 h-3.5" style={{ color: 'var(--accent-tertiary)' }} />
                  Fantasy Cup
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(233, 0, 82, 0.08)',
                    borderColor: 'rgba(233, 0, 82, 0.25)',
                    color: 'var(--accent-tertiary)'
                  }}
                >
                  GW36 - GW38
                </span>
              </div>
              <p className="text-base sm:text-xl font-black font-mono" style={{ color: 'var(--accent-tertiary)' }}>
                100.000đ <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Vô Địch</span>
              </p>
            </div>
            <p className="text-[10px] font-mono mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
              Top 8 Knockout Đấu Loại
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
