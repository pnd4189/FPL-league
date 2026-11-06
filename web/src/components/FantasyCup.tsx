import React from 'react';
import { Award, Crown, Trophy, ArrowLeftRight } from 'lucide-react';
import { INITIAL_CUP_BRACKET } from '../data/initialData';
import { PlayerAvatar } from './PlayerAvatar';
import { Reveal } from './scroll-reveal';

export const FantasyCup: React.FC = () => {
  const qfMatches = INITIAL_CUP_BRACKET.filter((m) => m.round === 'QF');
  const sfMatches = INITIAL_CUP_BRACKET.filter((m) => m.round === 'SF');
  const finalMatch = INITIAL_CUP_BRACKET.find((m) => m.round === 'Final');

  return (
    <div className="space-y-8 md:space-y-10">
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="eyebrow-pill mb-2">
                <Award className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />
                <span>Knockout Stage · GW36-GW38</span>
              </span>
              <h3
                className="text-xl sm:text-2xl font-display font-bold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                Fantasy Cup Top 8
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Sau vòng 35, hệ thống chọn 8 HLV dẫn đầu phân nhánh đấu loại trực tiếp qua Tứ kết GW36, Bán kết GW37 và Chung kết GW38.
              </p>
            </div>

            <div
              className="surface-well px-4 py-2.5 flex items-center gap-2 text-xs font-mono font-semibold flex-shrink-0"
              style={{ color: 'var(--accent-gold)' }}
            >
              <Crown className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Vô địch Cúp: 100.000đ</span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={50}>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-8 overflow-x-auto touch-scroll">
            <div
              className="md:hidden flex items-center justify-between pb-3 mb-4 text-[13px] font-mono"
              style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <span>Sơ đồ phân nhánh Top 8</span>
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                Vuốt sang phải xem Chung kết
              </span>
            </div>

            <div className="min-w-[680px] flex items-center justify-between gap-5 sm:gap-7 py-2">
              {/* Quarter Finals */}
              <div className="flex-1 space-y-4">
                <div className="text-center pb-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Tứ kết · GW36
                  </span>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    8 HLV hạt giống
                  </p>
                </div>

                {qfMatches.map((m, idx) => (
                  <div key={idx} className="surface-well p-3.5">
                    <div
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar name={m.player1.name} size="xs" />
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-main)' }}>
                          {m.player1.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        -
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 mt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar name={m.player2.name} size="xs" />
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-main)' }}>
                          {m.player2.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        -
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Semi Finals */}
              <div className="flex-1 space-y-12">
                <div className="text-center pb-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-secondary)' }}>
                    Bán kết · GW37
                  </span>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    4 đội tranh vé Chung kết
                  </p>
                </div>

                {sfMatches.map((m, idx) => (
                  <div
                    key={idx}
                    className="surface-well p-4"
                    style={{ boxShadow: '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)' }}
                  >
                    <div
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar name={m.player1.name} size="xs" />
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                          {m.player1.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        -
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 mt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar name={m.player2.name} size="xs" />
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                          {m.player2.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-faint)' }}>
                        -
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final */}
              <div className="flex-1 space-y-6">
                <div className="text-center pb-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span
                    className="text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    <Trophy className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>Chung kết · GW38</span>
                  </span>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Trận quyết định danh hiệu Cup
                  </p>
                </div>

                {finalMatch && (
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      backgroundColor: 'var(--bg-card-solid)',
                      boxShadow: '0 0 0 1px var(--accent-gold), inset 0 1px 0 0 var(--inner-highlight)',
                    }}
                  >
                    <div
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar name={finalMatch.player1.name} size="sm" />
                        <span className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                          {finalMatch.player1.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                        -
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 mt-0.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar name={finalMatch.player2.name} size="sm" />
                        <span className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                          {finalMatch.player2.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--accent-gold)' }}>
                        -
                      </span>
                    </div>

                    <div
                      className="mt-4 pt-3 text-center"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold text-[14px]"
                        style={{
                          backgroundColor: 'var(--accent-gold-soft)',
                          color: 'var(--accent-gold)',
                        }}
                      >
                        <Crown className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>Nhà vô địch Fantasy Cup</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
};
