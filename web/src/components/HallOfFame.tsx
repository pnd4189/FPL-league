import React from 'react';
import { Crown, Trophy } from 'lucide-react';
import { INITIAL_PLAYERS } from '../data/initialData';
import { PlayerAvatar } from './PlayerAvatar';
import { Reveal } from './scroll-reveal';

interface SeasonChampion {
  season: string;
  title: string;
  playerId: number;
  totalPoints: number | null;
  note?: string;
}

const CHAMPIONS: SeasonChampion[] = [
  { season: '2025/26', title: 'Shark Tú', playerId: 152158, totalPoints: 2291 },
  { season: '2024/25', title: 'Nerazzurri', playerId: 57214, totalPoints: 2566 },
  {
    season: '2023/24',
    title: 'Shark Tú',
    playerId: 152158,
    totalPoints: null,
    note: 'Vô địch bằng tài khoản FPL cũ nên chưa lưu điểm tổng',
  },
];

export const HallOfFame: React.FC = () => (
  <div className="space-y-8 md:space-y-10">
    <Reveal>
      <div className="bezel-shell">
        <div className="bezel-core p-5 sm:p-6">
          <span className="eyebrow-pill mb-2">
            <Crown className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />
            <span>League Heritage</span>
          </span>
          <h3
            className="text-xl sm:text-2xl font-display font-bold tracking-tight"
            style={{ color: 'var(--text-main)' }}
          >
            Bảng vàng nhà vô địch các mùa
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Lưu danh các HLV đã lên ngôi tại HTCV FPL League cùng tổng điểm cuối mùa ghi nhận từ hệ thống FPL.
          </p>
        </div>
      </div>
    </Reveal>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
      {CHAMPIONS.map((champion, idx) => {
        const player = INITIAL_PLAYERS.find((p) => p.id === champion.playerId);
        const subtitle =
          player && player.manager !== champion.title ? `HLV ${player.manager}` : player?.team || null;

        return (
          <Reveal key={champion.season} delayMs={idx * 60}>
            <div className="bezel-shell h-full flex">
              <div className="bezel-core w-full p-6 sm:p-7 flex flex-col items-center text-center">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-mono font-semibold mb-7"
                  style={{
                    backgroundColor: 'var(--accent-gold-soft)',
                    color: 'var(--accent-gold)',
                    boxShadow: '0 0 0 1px rgba(228, 191, 106, 0.28)',
                  }}
                >
                  <Trophy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Mùa {champion.season}</span>
                </div>

                <PlayerAvatar
                  name={player?.manager || champion.title}
                  avatarUrl={player?.avatarUrl}
                  clubLogoUrl={player?.clubLogoUrl}
                  favoriteClub={player?.favoriteClub}
                  rank={1}
                  size="xl"
                  showCrown
                  showClubBadge
                  className="mb-4"
                />

                <div className="mb-6">
                  <h4
                    className="text-xl sm:text-2xl font-display font-bold tracking-tight"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {champion.title}
                  </h4>
                  {subtitle && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {subtitle}
                    </p>
                  )}
                </div>

                <div
                  className="mt-auto pt-4 w-full"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  {champion.totalPoints !== null ? (
                    <>
                      <p
                        className="text-[13px] font-mono uppercase tracking-[0.16em]"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Tổng điểm cả mùa
                      </p>
                      <p
                        className="text-3xl font-mono font-extrabold tabular-nums mt-1"
                        style={{ color: 'var(--accent-gold)' }}
                      >
                        {champion.totalPoints.toLocaleString('vi-VN')}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs py-2.5 leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                      {champion.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  </div>
);
