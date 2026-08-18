import React from 'react';
import { Award, Crown, Trophy } from 'lucide-react';
import { INITIAL_CUP_BRACKET } from '../data/initialData';
import { PlayerAvatar } from './PlayerAvatar';

export const FantasyCup: React.FC = () => {
  const qfMatches = INITIAL_CUP_BRACKET.filter(m => m.round === 'QF');
  const sfMatches = INITIAL_CUP_BRACKET.filter(m => m.round === 'SF');
  const finalMatch = INITIAL_CUP_BRACKET.find(m => m.round === 'Final');

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Fantasy Cup — Đấu Loại Trực Tiếp (Knockout Top 8)
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Sau vòng 35, trang chủ FPL tự động chọn 8 HLV dẫn đầu phân nhánh đá cúp 3 vòng (Tứ kết GW36 → Bán kết GW37 → Chung kết GW38).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-black border"
          style={{
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderColor: 'var(--accent-gold)',
            color: 'var(--accent-gold)'
          }}
        >
          <Crown className="w-4 h-4 fill-current" />
          <span>Vô Địch Cúp: 100.000đ</span>
        </div>
      </div>

      {/* Interactive Tournament Bracket Tree */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-4 sm:p-8 overflow-x-auto touch-scroll">
        <div className="md:hidden flex items-center justify-between pb-2 mb-2 border-b text-[10px] font-mono"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span>🏆 Sơ đồ Nhánh Đấu Cúp</span>
          <span>👉 Vuốt sang phải xem Chung kết</span>
        </div>
        <div className="min-w-[680px] flex items-center justify-between gap-4 sm:gap-6 py-2 sm:py-4">
          
          {/* Quarter Finals (Tứ Kết - GW36) */}
          <div className="flex-1 space-y-4">
            <div className="text-center pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-mono font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Tứ Kết (GW36)</span>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>8 HLV xuất sắc nhất</p>
            </div>

            {qfMatches.map((m, idx) => (
              <div key={idx} className="rounded-xl p-3 border transition-colors"
                style={{ backgroundColor: 'var(--bg-card-solid)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={m.player1.name} size="xs" />
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>{m.player1.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>-</span>
                </div>
                <div className="flex items-center justify-between py-1 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={m.player2.name} size="xs" />
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>{m.player2.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>-</span>
                </div>
              </div>
            ))}
          </div>

          {/* Semi Finals (Bán Kết - GW37) */}
          <div className="flex-1 space-y-12">
            <div className="text-center pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-mono font-bold uppercase" style={{ color: 'var(--accent-secondary)' }}>Bán Kết (GW37)</span>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>4 HLV tranh vé Chung kết</p>
            </div>

            {sfMatches.map((m, idx) => (
              <div key={idx} className="rounded-xl p-3.5 border shadow-md"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-highlight)'
                }}
              >
                <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={m.player1.name} size="xs" />
                    <span className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>{m.player1.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>-</span>
                </div>
                <div className="flex items-center justify-between py-1 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={m.player2.name} size="xs" />
                    <span className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>{m.player2.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>-</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Final & Champion Trophy (Chung Kết - GW38) */}
          <div className="flex-1 space-y-6">
            <div className="text-center pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-mono font-extrabold uppercase flex items-center justify-center gap-1" style={{ color: 'var(--accent-gold)' }}>
                <Trophy className="w-3.5 h-3.5 fill-current" /> Chung Kết (GW38)
              </span>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Trận chiến định đoạt cúp 100k</p>
            </div>

            {finalMatch && (
              <div className="rounded-2xl p-4 border-2 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-card-solid), var(--bg-card-hover))',
                  borderColor: 'var(--accent-gold)'
                }}
              >
                <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={finalMatch.player1.name} size="sm" />
                    <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-main)' }}>{finalMatch.player1.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-gold)' }}>-</span>
                </div>
                <div className="flex items-center justify-between py-1.5 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={finalMatch.player2.name} size="sm" />
                    <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-main)' }}>{finalMatch.player2.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-gold)' }}>-</span>
                </div>

                <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-black text-xs"
                    style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)', color: 'var(--accent-gold)' }}
                  >
                    <Crown className="w-4 h-4 fill-current" />
                    🏆 NHÀ VÔ ĐỊCH CUP
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
