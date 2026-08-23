import React from 'react';
import { X, Trophy, Swords, ExternalLink } from 'lucide-react';
import { ClassicStanding, H2HStanding } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { INITIAL_PLAYERS } from '../data/initialData';

interface ManagerModalProps {
  playerId: number | null;
  onClose: () => void;
  classicStandings: ClassicStanding[];
  h2hStandings: H2HStanding[];
  /** Gameweek to deep-link into on the official FPL site. */
  currentGW?: number;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({
  playerId,
  onClose,
  classicStandings,
  h2hStandings,
  currentGW = 1,
}) => {
  if (!playerId) return null;

  const playerInfo = INITIAL_PLAYERS.find(p => p.id === playerId) || {
    id: playerId,
    manager: 'HLV',
    team: 'FPL Team',
    favoriteClub: 'Premier League',
    fanClubNickname: 'EPL Fan',
    clubLogoUrl: 'https://resources.premierleague.com/premierleague/badges/70/t80.png',
    clubColors: { primary: '#37003C', secondary: '#00FF87', text: '#ffffff' }
  };

  const classic = classicStandings.find(c => c.id === playerId);
  const h2h = h2hStandings.find(h => h.id === playerId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-8 border shadow-2xl overflow-y-auto max-h-[90vh] touch-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderTop: `4px solid var(--accent-primary)`,
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="interactive absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-main)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Card */}
        <div className="flex items-center gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <PlayerAvatar
            name={playerInfo.manager}
            avatarUrl={playerInfo.avatarUrl}
            clubLogoUrl={playerInfo.clubLogoUrl}
            favoriteClub={playerInfo.favoriteClub}
            rank={classic?.rank}
            size="xl"
          />
          <div>
            <h3 className="text-xl font-display font-black mb-1" style={{ color: 'var(--text-main)' }}>{playerInfo.manager}</h3>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-secondary)' }}>{playerInfo.team}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Mã Entry ID: #{playerInfo.id}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 my-6">
          
          <div className="rounded-2xl p-3.5 border"
            style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
              <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />
              <span>Xếp Hạng Classic</span>
            </div>
            <p className="text-lg font-black font-mono" style={{ color: 'var(--text-main)' }}>
              Hạng #{classic?.rank || '-'} <span className="text-xs font-normal" style={{ color: 'var(--accent-primary)' }}>({classic?.total || 0} pts)</span>
            </p>
            <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
              Điểm TB: {classic?.average || 0} / Best: {classic?.bestGW?.pts || 0} pts
            </p>
          </div>

          <div className="rounded-2xl p-3.5 border"
            style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
              <Swords className="w-3.5 h-3.5" style={{ color: 'var(--accent-secondary)' }} />
              <span>Xếp Hạng H2H</span>
            </div>
            <p className="text-lg font-black font-mono" style={{ color: 'var(--text-main)' }}>
              Hạng #{h2h?.rank || '-'} <span className="text-xs font-normal" style={{ color: 'var(--accent-secondary)' }}>({h2h?.points || 0} Pts)</span>
            </p>
            <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-faint)' }}>
              {h2h?.won || 0}T - {h2h?.drawn || 0}H - {h2h?.lost || 0}B (GD: {h2h?.goalDifference || 0})
            </p>
          </div>

        </div>

        {/* Chips Strategy Status */}
        <div className="rounded-2xl p-4 border mb-6"
          style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-xs font-mono font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Trạng Thái Chip Chiến Thuật</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Wildcard 1</p>
              <p className="font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>Sẵn sàng</p>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Free Hit</p>
              <p className="font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>Sẵn sàng</p>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Triple Cap</p>
              <p className="font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>Sẵn sàng</p>
            </div>
            <div className="p-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Bench Boost</p>
              <p className="font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>Sẵn sàng</p>
            </div>
          </div>
        </div>

        {/* Official FPL squad link for the gameweek in play */}
        <a
          href={`https://fantasy.premierleague.com/en/entry/${playerId}/event/${currentGW}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="interactive flex items-center justify-center gap-2 w-full mb-4 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md border"
          style={{
            backgroundColor: 'rgba(4, 245, 255, 0.12)',
            borderColor: 'rgba(4, 245, 255, 0.4)',
            color: 'var(--accent-secondary)'
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Xem Đội Hình GW{currentGW} Trên FPL
        </a>

        {/* Footer Info */}
        <div className="flex items-center justify-end pt-2 text-xs font-mono">
          <button
            onClick={onClose}
            className="interactive px-4 py-1.5 rounded-xl text-black font-bold transition-all shadow-md"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
