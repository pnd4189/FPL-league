import React, { useEffect } from 'react';
import { X, Trophy, Swords, ArrowUpRight, Sparkles } from 'lucide-react';
import { ClassicStanding, H2HStanding } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { INITIAL_PLAYERS } from '../data/initialData';

interface ManagerModalProps {
  playerId: number | null;
  onClose: () => void;
  classicStandings: ClassicStanding[];
  h2hStandings: H2HStanding[];
  currentGW?: number;
  onAskAi?: (managerId: number) => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({
  playerId,
  onClose,
  classicStandings,
  h2hStandings,
  currentGW = 1,
  onAskAi,
}) => {
  useEffect(() => {
    if (!playerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [playerId, onClose]);

  if (!playerId) return null;

  const playerInfo = INITIAL_PLAYERS.find((p) => p.id === playerId) || {
    id: playerId,
    manager: 'HLV',
    team: 'FPL Team',
    favoriteClub: 'Premier League',
    fanClubNickname: 'EPL Fan',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t80.png',
    clubColors: { primary: '#37003C', secondary: '#2ee59d', text: '#ffffff' },
  };

  const classic = classicStandings.find((c) => c.id === playerId);
  const h2h = h2hStandings.find((h) => h.id === playerId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-2xl"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="bezel-shell-lg w-full max-w-lg max-h-[90dvh] overflow-y-auto touch-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bezel-core-lg relative p-5 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="pressable absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              color: 'var(--text-secondary)',
              boxShadow: '0 0 0 1px var(--border-outer)',
            }}
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>

          {/* Identity Header */}
          <div
            className="flex items-center gap-4 pb-5 pr-10"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <PlayerAvatar
              name={playerInfo.manager}
              avatarUrl={playerInfo.avatarUrl}
              clubLogoUrl={playerInfo.clubLogoUrl}
              favoriteClub={playerInfo.favoriteClub}
              rank={classic?.rank}
              size="xl"
              showCrown
              showClubBadge
            />
            <div className="min-w-0">
              <span className="eyebrow-pill mb-1.5">Entry #{playerInfo.id}</span>
              <h3
                className="text-xl font-display font-bold truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {playerInfo.manager}
              </h3>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--accent-primary)' }}>
                {playerInfo.team}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                Fan {playerInfo.favoriteClub}
              </p>
            </div>
          </div>

          {/* Dual Standings Summary */}
          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="surface-well p-4">
              <div className="flex items-center gap-1.5 text-[14px] font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
                <span>Classic League</span>
              </div>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--text-main)' }}>
                #{classic?.rank || '-'}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--accent-primary)' }}>
                  ({classic?.total || 0} pts)
                </span>
              </p>
              <p className="text-[13px] mt-1 font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                TB {classic?.average || 0} · Cao nhất {classic?.bestGW?.pts || 0}
              </p>
            </div>

            <div className="surface-well p-4">
              <div className="flex items-center gap-1.5 text-[14px] font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Swords className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--accent-secondary)' }} />
                <span>H2H League</span>
              </div>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: 'var(--text-main)' }}>
                #{h2h?.rank || '-'}{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--accent-secondary)' }}>
                  ({h2h?.points || 0} Pts)
                </span>
              </p>
              <p className="text-[13px] mt-1 font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                {h2h?.won || 0}T {h2h?.drawn || 0}H {h2h?.lost || 0}B · GD {h2h?.goalDifference || 0}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            {onAskAi && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAskAi(playerId);
                }}
                className="btn-island-ghost group justify-between flex-1"
              >
                <span>Phân tích đội với AI</span>
                <span className="btn-island-icon">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} />
                </span>
              </button>
            )}

            <a
              href={`https://fantasy.premierleague.com/en/entry/${playerId}/event/${currentGW}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-island group justify-between flex-1"
            >
              <span>Đội hình GW{currentGW} trên FPL</span>
              <span className="btn-island-icon">
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
