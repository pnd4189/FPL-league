import React from 'react';
import { ArrowUpRight, Trophy, Sparkles, Swords } from 'lucide-react';
import { ClassicStanding, H2HStanding, LeagueDashboardData } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { Reveal } from './scroll-reveal';

interface HeroBannerProps {
  dashboard: LeagueDashboardData;
  classicLeader?: ClassicStanding;
  h2hLeader?: H2HStanding;
  upcomingGW?: number | null;
  isLive?: boolean;
  onExploreClick?: () => void;
  onOpenAi?: () => void;
  onOpenPool?: () => void;
  onSelectPlayer?: (id: number) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  dashboard,
  classicLeader,
  h2hLeader,
  upcomingGW = null,
  isLive = false,
  onExploreClick,
  onOpenAi,
  onOpenPool,
  onSelectPlayer,
}) => {
  const gwNum = typeof dashboard.currentGW === 'number' ? dashboard.currentGW : null;
  const gwLabel = gwNum ? `Gameweek ${gwNum}` : String(dashboard.currentGW || 'Gameweek 1');
  const roundSettled = !isLive && gwNum !== null && (dashboard.gwsCompleted || 0) >= gwNum;

  return (
    <Reveal className="pt-2 pb-10 md:pt-6 md:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* LEFT (6 COLS): Open Architectural Editorial Typography + Island CTAs + Metric Strip */}
        <div className="lg:col-span-6 flex flex-col items-start">
          {/* Eyebrow Kicker */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="eyebrow-pill">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse-soft' : ''}`}
                style={{
                  backgroundColor: isLive ? 'var(--accent-tertiary)' : 'var(--accent-primary)',
                }}
              />
              <span>
                {isLive
                  ? `Trực tiếp ${gwLabel}`
                  : roundSettled && upcomingGW
                  ? `GW${gwNum} đã chốt · Sắp đá GW${upcomingGW}`
                  : gwLabel}
              </span>
            </span>
            <span
              className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tray)',
              }}
            >
              Season {dashboard.season || '2026/27'} · 14 HLV
            </span>
          </div>

          {/* Monumental Display Headline with Editorial Italic Contrast */}
          <h1
            className="text-4xl sm:text-5xl xl:text-[3.55rem] font-display font-extrabold tracking-[-0.038em] leading-[1.05]"
            style={{ color: 'var(--text-main)' }}
          >
            Đấu trường Ngoại hạng{' '}
            <span
              className="block mt-1 font-editorial italic font-semibold tracking-[-0.02em]"
              style={{ color: 'var(--accent-primary)' }}
            >
              HTCV Open 26/27.
            </span>
          </h1>

          {/* Concise Plain-Speech Lead (Max 52ch) */}
          <p
            className="text-sm sm:text-[15px] mt-4 max-w-[52ch] leading-[1.65]"
            style={{ color: 'var(--text-muted)' }}
          >
            14 HLV tranh tài xuyên suốt 38 vòng Premier League trên hai bảng độc lập Classic và Head-to-Head. Điểm số trực tiếp, quyền thay người tự động và tiền thưởng từng chặng được đồng bộ ngay khi trận đấu khép lại.
          </p>

          {/* Dual Tactile Island CTAs */}
          <div className="flex items-center gap-3 flex-wrap mt-7">
            {onExploreClick && (
              <button type="button" onClick={onExploreClick} className="btn-island group">
                <span>Bảng xếp hạng toàn mùa</span>
                <span className="btn-island-icon">
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.9} />
                </span>
              </button>
            )}
            {onOpenAi && (
              <button type="button" onClick={onOpenAi} className="btn-island-ghost group">
                <span>Hỏi Trợ lý AI</span>
                <span className="btn-island-icon">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.7} />
                </span>
              </button>
            )}
          </div>

          {/* Open Architectural 4-Metric Strip (Zero Card Bloat) */}
          <div
            className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 pt-6 mt-8"
            style={{ borderTop: '1px solid var(--border-outer)' }}
          >
            <button
              type="button"
              onClick={onOpenPool}
              className="pressable text-left group"
            >
              <p
                className="text-xl sm:text-2xl font-stats font-extrabold tabular-nums tracking-tight flex items-center gap-1"
                style={{ color: 'var(--text-main)' }}
              >
                <span>7,0M</span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={1.7}
                  style={{ color: 'var(--accent-primary)' }}
                />
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Quỹ thưởng VNĐ
              </p>
            </button>

            <div>
              <p
                className="text-xl sm:text-2xl font-stats font-extrabold tabular-nums tracking-tight"
                style={{ color: 'var(--accent-primary)' }}
              >
                50K
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Nhất vòng × 38
              </p>
            </div>

            <div>
              <p
                className="text-xl sm:text-2xl font-stats font-extrabold tabular-nums tracking-tight"
                style={{ color: 'var(--accent-secondary)' }}
              >
                200K
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Nhất tháng × 10
              </p>
            </div>

            <div>
              <p
                className="text-xl sm:text-2xl font-stats font-extrabold tabular-nums tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                {dashboard.gwsCompleted || 0}
                <span className="text-sm font-normal" style={{ color: 'var(--text-faint)' }}>
                  /38
                </span>
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Vòng đã hoàn tất
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT (6 COLS): Double-Bezel Broadcast Showcase + Z-Axis Overlapping Live Leaders */}
        <div className="lg:col-span-6">
          <div className="relative">
            {/* Primary Superstar Broadcast Frame */}
            <div className="bezel-shell-lg transition-transform duration-500 ease-fluid md:hover:-translate-y-0.5">
              <div className="bezel-core-lg relative overflow-hidden group">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#190d29]">
                  <img
                    src="/assets/pl_stars_banner.webp"
                    alt="Ngôi sao Ngoại hạng Anh và Cúp vô địch Premier League"
                    className="w-full h-full object-cover object-top transition-transform duration-700 ease-fluid group-hover:scale-[1.025]"
                  />
                  {/* Subtle Top & Bottom Studio Scrim */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(23,11,38,0.34) 0%, rgba(23,11,38,0.02) 45%, rgba(23,11,38,0.68) 100%)',
                    }}
                  />

                  {/* Top Broadcast Identifiers */}
                  <div className="absolute top-3.5 inset-x-3.5 sm:top-4 sm:inset-x-4 flex items-center justify-between gap-2 z-10">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-[0.14em] backdrop-blur-md"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#38003c',
                        boxShadow: '0 4px 14px rgba(23, 11, 38, 0.18)',
                      }}
                    >
                      <Trophy className="w-3 h-3" strokeWidth={1.8} style={{ color: '#047857' }} />
                      <span>Premier League Hub</span>
                    </span>

                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-medium backdrop-blur-md"
                      style={{
                        backgroundColor: 'rgba(23, 11, 38, 0.68)',
                        color: '#f8f7fc',
                        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.18)',
                      }}
                    >
                      #132688 · #132702
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Z-Axis Overlapping Live Leader Cards (Collapses cleanly below 768px) */}
            <div className="mt-3.5 md:-mt-7 md:mx-4 relative z-20 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Classic #1 Floating Card */}
              <div
                onClick={() => classicLeader && onSelectPlayer?.(classicLeader.id)}
                className="bezel-shell bezel-interactive cursor-pointer"
                style={{ boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)' }}
              >
                <div className="bezel-core p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar
                      name={classicLeader?.manager || 'HLV #1'}
                      avatarUrl={classicLeader?.avatarUrl}
                      clubLogoUrl={classicLeader?.clubLogoUrl}
                      favoriteClub={classicLeader?.favoriteClub}
                      rank={1}
                      size="md"
                      showClubBadge
                    />
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--accent-gold)' }}
                      >
                        <Trophy className="w-3 h-3" strokeWidth={1.7} />
                        <span>Đỉnh bảng Classic</span>
                      </span>
                      <p
                        className="text-sm font-display font-bold truncate mt-0.5"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {classicLeader?.manager || 'Đang tải'}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {classicLeader?.team || 'HTCV League'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-xl font-stats font-extrabold tabular-nums leading-none"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {classicLeader?.total ?? 0}
                    </p>
                    <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
                      pts
                    </p>
                  </div>
                </div>
              </div>

              {/* H2H #1 Floating Card */}
              <div
                onClick={() => h2hLeader && onSelectPlayer?.(h2hLeader.id)}
                className="bezel-shell bezel-interactive cursor-pointer"
                style={{ boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)' }}
              >
                <div className="bezel-core p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar
                      name={h2hLeader?.manager || 'HLV #1'}
                      avatarUrl={h2hLeader?.avatarUrl}
                      clubLogoUrl={h2hLeader?.clubLogoUrl}
                      favoriteClub={h2hLeader?.favoriteClub}
                      rank={1}
                      size="md"
                      showClubBadge
                    />
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--accent-secondary)' }}
                      >
                        <Swords className="w-3 h-3" strokeWidth={1.7} />
                        <span>Đỉnh bảng H2H</span>
                      </span>
                      <p
                        className="text-sm font-display font-bold truncate mt-0.5"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {h2hLeader?.manager || 'Đang tải'}
                      </p>
                      <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        {h2hLeader ? `${h2hLeader.won}T · ${h2hLeader.drawn}H · ${h2hLeader.lost}B` : 'Đối đầu 1v1'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-xl font-stats font-extrabold tabular-nums leading-none"
                      style={{ color: 'var(--accent-secondary)' }}
                    >
                      {h2hLeader?.points ?? 0}
                    </p>
                    <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
                      Pts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
};
