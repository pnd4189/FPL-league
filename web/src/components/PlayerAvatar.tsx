import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { INITIAL_PLAYERS } from '../data/initialData';

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string;
  clubLogoUrl?: string;
  favoriteClub?: string;
  fanClubNickname?: string;
  rank?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  clubColor?: string;
  showCrown?: boolean;
  showClubBadge?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm',
  lg: 'w-12 h-12 sm:w-16 sm:h-16 text-sm sm:text-base',
  xl: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-base sm:text-xl',
};

const BADGE_SIZE_MAP = {
  xs: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  sm: 'w-3.5 h-3.5 -bottom-1 -right-1',
  md: 'w-4 h-4 sm:w-5 sm:h-5 -bottom-1 -right-1',
  lg: 'w-4.5 h-4.5 sm:w-6 sm:h-6 -bottom-1 sm:-bottom-1.5 -right-1 sm:-right-1.5',
  xl: 'w-5.5 h-5.5 sm:w-8 sm:h-8 -bottom-1 sm:-bottom-2 -right-1 sm:-right-2',
};

const getInitials = (name: string) => {
  if (!name) return 'PL';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Name normalization & alias resolver
const resolvePlayerMeta = (name: string) => {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return INITIAL_PLAYERS.find(p => {
    const pName = p.manager.toLowerCase();
    if (pName === n) return true;
    if (n === 'tú' && pName.includes('tú')) return true;
    if (n === 'lâm' && pName.includes('lâm')) return true;
    if (n === 'vito' && pName === 'hải') return true;
    if ((n === 'tbd' || n.includes('hlv 14') || n.includes('tân binh')) && pName === 'tân') return true;
    return false;
  });
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  avatarUrl,
  clubLogoUrl,
  favoriteClub,
  rank,
  size = 'md',
  clubColor,
  showCrown = true,
  showClubBadge = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const [clubImgError, setClubImgError] = useState(false);
  const sizeClasses = SIZE_MAP[size];
  const badgeSizeClasses = BADGE_SIZE_MAP[size];

  // Resolve metadata fallback from INITIAL_PLAYERS
  const playerMeta = resolvePlayerMeta(name);
  const effectiveAvatarUrl = avatarUrl || playerMeta?.avatarUrl;
  const effectiveClubLogoUrl = clubLogoUrl || playerMeta?.clubLogoUrl;
  const effectiveFavoriteClub = favoriteClub || playerMeta?.favoriteClub;
  const effectiveClubColor = clubColor || playerMeta?.clubColors?.primary || '#37003c';

  // Rank-based ring styling
  const isRank1 = rank === 1;
  const isRank2 = rank === 2;
  const isRank3 = rank === 3;

  let ringClasses = 'border-2 border-slate-700/70';

  if (isRank1) {
    ringClasses = 'border-2 border-epl-gold shadow-neon-gold ring-2 ring-epl-gold/40 animate-pulse-slow';
  } else if (isRank2) {
    ringClasses = 'border-2 border-slate-300 shadow-neon-cyan ring-1 ring-slate-300/40';
  } else if (isRank3) {
    ringClasses = 'border-2 border-amber-600 shadow-neon-pink ring-1 ring-amber-600/40';
  } else if (rank && rank <= 7) {
    ringClasses = 'border-2 border-epl-green/50';
  }

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      
      {/* 👑 Crown Badges for Top 1 (Gold), Top 2 (Silver), Top 3 (Bronze) */}
      {showCrown && size !== 'xs' && (
        <>
          {/* Top 1: Gold Crown */}
          {isRank1 && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 animate-float pointer-events-none">
              <Crown className="w-4 h-4 text-epl-gold fill-epl-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]" />
            </div>
          )}

          {/* Top 2: Silver Crown (slightly more compact) */}
          {isRank2 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <Crown className="w-3.5 h-3.5 text-slate-200 fill-slate-200 drop-shadow-[0_0_6px_rgba(226,232,240,0.85)]" />
            </div>
          )}

          {/* Top 3: Bronze Crown (compact) */}
          {isRank3 && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <Crown className="w-3 h-3 text-amber-500 fill-amber-600 drop-shadow-[0_0_6px_rgba(249,115,22,0.85)]" />
            </div>
          )}
        </>
      )}

      {/* Main Manager Face / Photo Circle */}
      <div
        className={`relative rounded-full overflow-hidden flex items-center justify-center font-bold tracking-wider ${sizeClasses} ${ringClasses} transition-transform duration-200 hover:scale-105 bg-slate-900`}
      >
        {effectiveAvatarUrl && !imgError ? (
          <img
            src={effectiveAvatarUrl}
            alt={name}
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center w-full h-full text-white/95"
            style={{ backgroundColor: effectiveClubColor }}
          >
            <span className="drop-shadow-sm font-display font-black">{getInitials(name)}</span>
          </div>
        )}
      </div>

      {/* Pinned Favorite Club Crest Logo */}
      {showClubBadge && effectiveClubLogoUrl && !clubImgError && (
        <div
          className={`absolute ${badgeSizeClasses} z-10 rounded-full bg-slate-950/90 border border-white/40 p-0.5 shadow-md flex items-center justify-center`}
          title={`Fan CLB: ${effectiveFavoriteClub || 'Premier League'}`}
        >
          <img
            src={effectiveClubLogoUrl}
            alt={effectiveFavoriteClub || 'Club Badge'}
            className="w-full h-full object-contain drop-shadow"
            referrerPolicy="no-referrer"
            onError={() => setClubImgError(true)}
          />
        </div>
      )}

      {/* Rank Mini-Badge if top-left */}
      {rank !== undefined && rank > 0 && size !== 'xs' && (
        <div
          className={`absolute -top-1 -left-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-black font-mono border border-black/70 shadow-sm ${
            isRank1
              ? 'bg-epl-gold text-black'
              : isRank2
              ? 'bg-slate-200 text-black'
              : isRank3
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {rank}
        </div>
      )}
    </div>
  );
};
