import React, { useEffect, useState } from 'react';
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

const SIZE_MAP: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[13px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-xs sm:text-sm',
  lg: 'w-14 h-14 sm:w-16 sm:h-16 text-sm sm:text-base',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 text-base sm:text-lg',
};

const BADGE_SIZE_MAP: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
  xs: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
  sm: 'w-4 h-4 -bottom-0.5 -right-0.5',
  md: 'w-4 h-4 -bottom-0.5 -right-0.5',
  lg: 'w-5 h-5 -bottom-0.5 -right-0.5',
  xl: 'w-6 h-6 sm:w-7 sm:h-7 -bottom-0.5 -right-0.5',
};

const getInitials = (name: string) => {
  if (!name) return 'PL';
  const clean = name.split('&')[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const resolvePlayerMeta = (rawName: string) => {
  if (!rawName) return undefined;
  const candidate = rawName.split('&')[0].trim().toLowerCase();
  if (!candidate) return undefined;
  return INITIAL_PLAYERS.find((p) => {
    const pName = p.manager.toLowerCase();
    if (pName === candidate) return true;
    if (candidate === 'tú' && pName.includes('tú')) return true;
    if (candidate === 'lâm' && pName.includes('lâm')) return true;
    if (candidate === 'vito' && pName === 'hải') return true;
    if ((candidate === 'tbd' || candidate.includes('hlv 14') || candidate.includes('tân binh')) && pName === 'tân') {
      return true;
    }
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
  showCrown = false,
  showClubBadge = false,
  className = '',
}) => {
  const playerMeta = resolvePlayerMeta(name);
  const effectiveAvatarUrl = avatarUrl || playerMeta?.avatarUrl;
  const effectiveClubLogoUrl = clubLogoUrl || playerMeta?.clubLogoUrl;
  const effectiveFavoriteClub = favoriteClub || playerMeta?.favoriteClub;
  const effectiveClubColor = clubColor || playerMeta?.clubColors?.primary || '#38003c';

  const [imgError, setImgError] = useState(false);
  const [clubImgError, setClubImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [effectiveAvatarUrl]);

  useEffect(() => {
    setClubImgError(false);
  }, [effectiveClubLogoUrl]);

  const sizeClasses = SIZE_MAP[size];
  const badgeSizeClasses = BADGE_SIZE_MAP[size];

  const isRank1 = rank === 1;
  const isRank2 = rank === 2;
  const isRank3 = rank === 3;

  const ringStyle: React.CSSProperties = isRank1
    ? {
        boxShadow:
          '0 0 0 2px var(--bg-card), 0 0 0 3.5px var(--accent-gold), 0 10px 24px -8px rgba(217, 119, 6, 0.32)',
      }
    : isRank2
    ? {
        boxShadow: '0 0 0 2px var(--bg-card), 0 0 0 3px var(--accent-silver)',
      }
    : isRank3
    ? {
        boxShadow: '0 0 0 2px var(--bg-card), 0 0 0 3px var(--accent-bronze)',
      }
    : {
        boxShadow: '0 0 0 1.5px var(--bg-card), 0 0 0 2.5px var(--border-outer)',
      };

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {showCrown && isRank1 && size !== 'xs' && size !== 'sm' && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <Crown
            className="w-4 h-4"
            strokeWidth={1.6}
            style={{ color: 'var(--accent-gold)', fill: 'var(--accent-gold)' }}
          />
        </div>
      )}

      <div
        style={{
          ...ringStyle,
          backgroundColor: 'var(--bg-elevated)',
        }}
        className={`relative rounded-full overflow-hidden flex items-center justify-center font-semibold tracking-wider ${sizeClasses} transition-transform duration-200 ease-out-strong`}
      >
        {effectiveAvatarUrl && !imgError ? (
          <img
            src={effectiveAvatarUrl}
            alt={name}
            className="w-full h-full object-cover object-top rounded-full"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center w-full h-full"
            style={{ backgroundColor: effectiveClubColor, color: '#ffffff' }}
          >
            <span className="font-display font-bold">{getInitials(name)}</span>
          </div>
        )}
      </div>

      {showClubBadge && effectiveClubLogoUrl && !clubImgError && (
        <div
          className={`absolute ${badgeSizeClasses} z-10 rounded-full p-0.5 flex items-center justify-center overflow-hidden`}
          style={{
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(24, 10, 38, 0.18), 0 0 0 1.5px var(--bg-card)',
          }}
          title={effectiveFavoriteClub ? `CLB yêu thích: ${effectiveFavoriteClub}` : undefined}
        >
          <img
            src={effectiveClubLogoUrl}
            alt={effectiveFavoriteClub || 'Club'}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setClubImgError(true)}
          />
        </div>
      )}

      {rank !== undefined && rank > 0 && rank <= 3 && size !== 'xs' && (
        <div
          className="absolute -bottom-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[12px] sm:text-[13px] font-bold font-mono tabular-nums z-10"
          style={
            isRank1
              ? {
                  backgroundColor: 'var(--accent-gold)',
                  color: '#ffffff',
                  boxShadow: '0 0 0 2px var(--bg-card)',
                }
              : isRank2
              ? {
                  backgroundColor: 'var(--accent-silver)',
                  color: '#ffffff',
                  boxShadow: '0 0 0 2px var(--bg-card)',
                }
              : {
                  backgroundColor: 'var(--accent-bronze)',
                  color: '#ffffff',
                  boxShadow: '0 0 0 2px var(--bg-card)',
                }
          }
        >
          {rank}
        </div>
      )}
    </div>
  );
};
