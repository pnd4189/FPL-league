import React from 'react';
import { Crown, Trophy } from 'lucide-react';
import { INITIAL_PLAYERS } from '../data/initialData';
import { PlayerAvatar } from './PlayerAvatar';

interface SeasonChampion {
  season: string;
  /** Champion as the league remembers them. */
  title: string;
  /** Current-season entry id, used for the avatar and club badge. */
  playerId: number;
  /** FPL season total from entry/{id}/history (`past`); null when unknown. */
  totalPoints: number | null;
  note?: string;
}

// Past seasons are final, so the totals are recorded once from the FPL api.
const CHAMPIONS: SeasonChampion[] = [
  { season: '2025-2026', title: 'Shark Tú', playerId: 152158, totalPoints: 2291 },
  { season: '2024-2025', title: 'Nerazzurri', playerId: 57214, totalPoints: 2566 },
  {
    season: '2023-2024',
    title: 'Shark Tú',
    playerId: 152158,
    totalPoints: null,
    note: 'Mùa này vô địch bằng nick khác nên không có điểm tổng',
  },
];

export const HallOfFame: React.FC = () => (
  <div className="space-y-8">
    <div className="glass-panel rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 fill-current" style={{ color: 'var(--accent-gold)' }} />
        <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
          Hall of Fame — Vinh Danh Nhà Vô Địch
        </h3>
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Những HLV đã đăng quang HTCV FPL League qua từng mùa giải, kèm tổng điểm FPL của mùa vô địch.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {CHAMPIONS.map(champion => {
        const player = INITIAL_PLAYERS.find(p => p.id === champion.playerId);
        const subtitle = player && player.manager !== champion.title ? `HLV ${player.manager}` : null;

        return (
          <div key={champion.season}
            className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center border"
            style={{ borderColor: 'var(--accent-gold)' }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border mb-7"
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                borderColor: 'var(--accent-gold)',
                color: 'var(--accent-gold)'
              }}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Mùa {champion.season}</span>
            </div>

            <PlayerAvatar
              name={player?.manager || champion.title}
              avatarUrl={player?.avatarUrl}
              clubLogoUrl={player?.clubLogoUrl}
              favoriteClub={player?.favoriteClub}
              rank={1}
              size="xl"
              showCrown={true}
              className="mb-4"
            />

            <div className="mb-5">
              <h4 className="text-xl sm:text-2xl font-display font-black" style={{ color: 'var(--text-main)' }}>
                {champion.title}
              </h4>
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
              )}
            </div>

            <div className="mt-auto pt-4 border-t w-full" style={{ borderColor: 'var(--border-subtle)' }}>
              {champion.totalPoints !== null ? (
                <>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    Tổng điểm mùa giải
                  </p>
                  <p className="text-3xl font-display font-black mt-1" style={{ color: 'var(--accent-gold)' }}>
                    {champion.totalPoints.toLocaleString('vi-VN')}
                  </p>
                </>
              ) : (
                <p className="text-xs italic py-3" style={{ color: 'var(--text-faint)' }}>{champion.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
