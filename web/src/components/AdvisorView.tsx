import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  ArrowUpRight,
  Compass,
  Crown,
  HeartPulse,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Swords,
} from 'lucide-react';
import { INITIAL_PLAYERS } from '../data/initialData';
import { fetchAdvisor, fetchAdvisorHunt } from '../services/fplApi';
import { AdvisorData, AdvisorFixture, AdvisorPlayer, LiveGwData } from '../types';
import { currentRoundH2H } from '../services/liveStandings';
import { AdvisorReview } from './AdvisorReview';
import { LuckyNumbers } from './LuckyNumbers';
import { isLuckyEligible } from '../services/xsmbService';
import { Reveal } from './scroll-reveal';

const STORAGE_KEY = 'htcv_fpl_advisor_manager';
const POSITIONS = [
  { value: 1, label: 'Thủ môn' },
  { value: 2, label: 'Hậu vệ' },
  { value: 3, label: 'Tiền vệ' },
  { value: 4, label: 'Tiền đạo' },
];
const BUDGETS = [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];
const POS_SHORT: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

const QUICK_PROMPTS = [
  'Tuần này nên chọn ai làm captain?',
  'Làm sao để thắng đối thủ H2H vòng này?',
  'Nên bán ai và mua ai vòng này?',
  'Khi nào nên dùng Wildcard hoặc Free Hit?',
];

// FPL fixture difficulty: 1-2 favorable, 3 neutral, 4 tough, 5 severe.
const FDR_STYLES: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#16a34a', fg: '#ffffff' },
  2: { bg: '#2ee59d', fg: '#041f14' },
  3: { bg: 'rgba(138, 146, 160, 0.22)', fg: 'var(--text-main)' },
  4: { bg: '#ea580c', fg: '#ffffff' },
  5: { bg: '#be123c', fg: '#ffffff' },
};

const readSavedManager = (): number => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return INITIAL_PLAYERS.some(p => p.id === saved) ? saved : INITIAL_PLAYERS[0].id;
  } catch {
    return INITIAL_PLAYERS[0].id;
  }
};

const FixtureChips: React.FC<{ fixtures: AdvisorFixture[] }> = ({ fixtures }) => {
  if (!fixtures.length) {
    return (
      <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--accent-tertiary)' }}>
        Trống lịch (Blank GW)
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {fixtures.map((f, i) => {
        const tone = FDR_STYLES[f.fdr] || FDR_STYLES[3];
        return (
          <span
            key={i}
            className="text-[13px] font-mono font-semibold px-1.5 py-0.5 rounded tabular-nums"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {f.opp} ({f.home ? 'H' : 'A'})
          </span>
        );
      })}
    </span>
  );
};

const PlayerLine: React.FC<{ p: AdvisorPlayer; showCost?: boolean }> = ({ p, showCost }) => (
  <div
    className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0"
    style={{ borderColor: 'var(--border-subtle)' }}
  >
    <div className="min-w-0">
      <p className="text-sm font-semibold truncate font-display" style={{ color: 'var(--text-main)' }}>
        {p.name}{' '}
        <span className="text-[13px] font-mono font-normal" style={{ color: 'var(--text-faint)' }}>
          {p.team} · {POS_SHORT[p.pos]}
        </span>
      </p>
      <div className="mt-1">
        <FixtureChips fixtures={p.fixtures} />
      </div>
      {p.reasons && p.reasons.length > 0 && (
        <p className="text-[14px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
          {p.reasons.join(' · ')}
        </p>
      )}
    </div>
    <div className="text-right flex-shrink-0 tabular-nums">
      <p className="text-sm font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
        {p.ep.toFixed(1)}{' '}
        <span className="text-[13px] font-normal" style={{ color: 'var(--text-faint)' }}>
          xPts
        </span>
      </p>
      <p className="text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>
        Form {p.form.toFixed(1)}
        {showCost ? ` · £${p.cost.toFixed(1)}m` : ''}
        {p.ep5 !== undefined && showCost ? ` · 5GW ${p.ep5.toFixed(1)}đ` : ''}
        {p.difficulty !== undefined ? ` · FDR ${p.difficulty.toFixed(1)}` : ''}
      </p>
    </div>
  </div>
);

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ icon, title, hint, children }) => (
  <section className="bezel-shell">
    <div className="bezel-core p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-1.5">
        {icon}
        <h4 className="text-sm sm:text-base font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
          {title}
        </h4>
      </div>
      {hint && (
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  </section>
);

export interface AdvisorViewProps {
  managerId?: number;
  upcomingGW?: number | null;
  /** Live payload shared with the H2H tab, so this tab shows the same score for the current round. */
  live?: LiveGwData | null;
  /** The first live load has finished, successfully or not. */
  liveReady?: boolean;
  onManagerChange?: (id: number) => void;
  onOpenAiChat?: (prompt?: string) => void;
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  managerId: controlledManagerId,
  upcomingGW = null,
  live = null,
  liveReady = false,
  onManagerChange,
  onOpenAiChat,
}) => {
  const [internalManagerId, setInternalManagerId] = useState<number>(readSavedManager);
  const managerId = controlledManagerId ?? internalManagerId;

  const [advice, setAdvice] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [huntPos, setHuntPos] = useState(3);
  const [huntBudget, setHuntBudget] = useState(7.5);
  const [hunting, setHunting] = useState(false);
  const [huntResult, setHuntResult] = useState<AdvisorPlayer[] | null>(null);
  const [huntMessage, setHuntMessage] = useState('');
  const latestRequest = useRef(0);

  const load = useCallback(async (id: number) => {
    const request = ++latestRequest.current;
    setLoading(true);
    setMessage('');
    setAdvice(null);
    const result = await fetchAdvisor(id);
    // Ignore an answer that arrives after the user switched to someone else.
    if (request !== latestRequest.current) return;
    setAdvice(result.data);
    setMessage(result.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(managerId);
  }, [managerId, load]);

  const chooseManager = (id: number) => {
    setInternalManagerId(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* private mode */
    }
    onManagerChange?.(id);
  };

  const hunt = async () => {
    setHunting(true);
    setHuntMessage('');
    const result = await fetchAdvisorHunt(huntPos, huntBudget);
    setHuntResult(result.players);
    setHuntMessage(result.message);
    setHunting(false);
  };

  const deadline = advice?.deadline
    ? new Date(advice.deadline).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const selectedManagerName = INITIAL_PLAYERS.find(p => p.id === managerId)?.manager || 'HLV';
  const targetGw = advice?.gw ?? upcomingGW;
  const round = currentRoundH2H(managerId, live);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Control Bar */}
      <Reveal>
        <div className="bezel-shell">
          <div className="bezel-core p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="eyebrow-pill">
                <Compass className="w-3 h-3" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />
                <span>Mô hình dự phóng 3 mùa · {targetGw ? `Gameweek ${targetGw} sắp tới` : 'Phân tích chuyên sâu'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Trợ lý chiến thuật{targetGw ? ` · GW${targetGw}` : ''}
              </h3>
              <p className="text-xs sm:text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Gợi ý băng đội trưởng, phân tích kèo H2H và phương án chuyển nhượng dựa trên điểm kỳ vọng tính từ phong độ, xG+xA, số phút thi đấu, độ khó lịch và lợi thế sân bãi.
                {deadline ? ` Hạn chốt đội lúc ${deadline}.` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <label className="surface-well px-3.5 py-2 flex items-center gap-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>HLV</span>
                <select
                  value={managerId}
                  onChange={e => chooseManager(Number(e.target.value))}
                  className="bg-transparent text-sm font-sans font-semibold focus:outline-none cursor-pointer"
                  style={{ color: 'var(--text-main)' }}
                >
                  {INITIAL_PLAYERS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.manager}
                    </option>
                  ))}
                </select>
              </label>

              {onOpenAiChat && (
                <button type="button" onClick={() => onOpenAiChat()} className="btn-island">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.7} />
                  <span>Hỏi đáp AI</span>
                  <span className="btn-island-icon">
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {loading && (
        <div className="bezel-shell">
          <div className="bezel-core p-8 flex items-center justify-center gap-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin-smooth" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />
            <span>Đang phân tích đội hình {selectedManagerName}, vui lòng chờ trong giây lát...</span>
          </div>
        </div>
      )}

      {!loading && message && (
        <div className="bezel-shell">
          <div className="bezel-core p-5 text-sm flex items-center justify-between gap-4" style={{ color: 'var(--accent-tertiary)' }}>
            <span>{message}</span>
            <button
              type="button"
              onClick={() => load(managerId)}
              className="pressable surface-well px-3.5 py-1.5 text-xs font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {advice && (
        <Reveal delayMs={50} className="space-y-6">
          <p className="text-xs font-mono px-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Đội hình tham chiếu từ GW{advice.basedOnGw}
            {advice.savedTransfers > 0 ? ` · Cộng ${advice.savedTransfers} lượt chuyển nhượng tích lũy` : ''}
            {' · '}Ngân sách dự kiến trong kho: £{advice.bank.toFixed(1)}m.
          </p>

          <AdvisorReview managerId={managerId} initial={advice.aiReview ?? null} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SectionCard
              icon={<Crown className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-gold)' }} />}
              title="Ứng viên Đội trưởng (Captain)"
              hint="Lọc các tiền vệ và tiền đạo đá chính khỏe mạnh, xếp từ cao xuống thấp theo điểm dự kiến vòng tới."
            >
              {advice.captains.length ? (
                <div className="surface-well px-4 py-1.5">
                  {advice.captains.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3.5">
                      <span
                        className="text-sm font-mono font-bold w-5 text-center tabular-nums"
                        style={{ color: i === 0 ? 'var(--accent-gold)' : 'var(--text-faint)' }}
                      >
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <PlayerLine p={p} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Chưa có ứng viên phù hợp trong đội hình hiện tại.
                </p>
              )}
            </SectionCard>

            <SectionCard
              icon={<HeartPulse className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-tertiary)' }} />}
              title="Tình trạng nhân sự"
              hint="Cảnh báo cầu thủ chấn thương, treo giò hoặc không có lịch thi đấu ở vòng kế tiếp."
            >
              {advice.health.length ? (
                <div className="surface-well p-4 space-y-2.5">
                  {advice.health.map(h => (
                    <div
                      key={h.name}
                      className="text-sm pb-2.5 last:pb-0 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold font-display">{h.name}</span>
                        <span className="text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
                          {h.team} · {h.starter ? 'Đá chính' : 'Dự bị'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--accent-tertiary)' }}>
                        {h.why}
                        {h.news ? (
                          <span style={{ color: 'var(--text-muted)' }}> ({h.news})</span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-well p-4 text-sm" style={{ color: 'var(--accent-primary)' }}>
                  Toàn bộ 15 cầu thủ đều sung sức và có lịch thi đấu.
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            icon={<Swords className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-secondary)' }} />}
            title={advice.opponent ? `Tương quan đối đầu H2H GW${advice.gw} trước ${advice.opponent.manager}` : 'Tương quan đối đầu H2H'}
            hint="So sánh các nhân tố khác biệt (differentials) giữa hai đội. Cầu thủ trùng nhau ở cả hai đội hình đã được lược bỏ."
          >
            {round && (
              <div className="surface-well px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono tabular-nums">
                <span style={{ color: 'var(--text-muted)' }}>
                  Tỉ số H2H GW{round.gw} · {round.isLive ? 'đang đá, tạm tính' : 'đã chốt'}
                </span>
                <div>
                  <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {selectedManagerName} {round.mine}
                  </span>
                  <span className="mx-2" style={{ color: 'var(--text-faint)' }}>
                    –
                  </span>
                  <span className="font-bold" style={{ color: 'var(--accent-tertiary)' }}>
                    {round.opp} {round.oppName}
                  </span>
                </div>
              </div>
            )}
            {advice.opponent ? (
              <div className="space-y-4">
                <div className="surface-well px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono tabular-nums">
                  <span style={{ color: 'var(--text-muted)' }}>Điểm dự phóng GW{advice.gw} (vòng tới)</span>
                  <div>
                    <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {advice.manager} {advice.opponent.myProjected}
                    </span>
                    <span className="mx-2" style={{ color: 'var(--text-faint)' }}>
                      vs
                    </span>
                    <span className="font-bold" style={{ color: 'var(--accent-tertiary)' }}>
                      {advice.opponent.manager} {advice.opponent.theirProjected}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="surface-well p-4">
                    <p className="text-[14px] font-mono font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-primary)' }}>
                      Quân bài tạo khác biệt của bạn
                    </p>
                    {advice.opponent.edge.length ? (
                      advice.opponent.edge.map(p => <PlayerLine key={p.id} p={p} />)
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Không có cầu thủ khác biệt nổi bật.
                      </p>
                    )}
                  </div>
                  <div className="surface-well p-4">
                    <p className="text-[14px] font-mono font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-tertiary)' }}>
                      Mối đe dọa từ đối thủ
                    </p>
                    {advice.opponent.threat.length ? (
                      advice.opponent.threat.map(p => <PlayerLine key={p.id} p={p} />)
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Không có mối đe dọa đáng kể.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Vòng này không có lịch đối đầu H2H hoặc chưa tải được dữ liệu đội hình đối thủ.
              </p>
            )}
          </SectionCard>

          {isLuckyEligible(managerId) && (
            <Reveal delayMs={70}>
              <LuckyNumbers managerId={managerId} live={live} liveReady={liveReady} />
            </Reveal>
          )}

          <SectionCard
            icon={<ArrowRightLeft className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />}
            title="Phương án chuyển nhượng đề xuất"
            hint="Xác định mắt xích yếu trong 5 vòng tới và gợi ý mục tiêu thay thế cùng tuyến nằm trong ngân sách khả dụng."
          >
            {advice.transfers.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {advice.transfers.map(t => (
                  <div key={t.out.id} className="surface-well p-4">
                    <p className="text-[13px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-tertiary)' }}>
                      Cân nhắc bán ra
                    </p>
                    <PlayerLine p={{ ...t.out, difficulty: t.outDifficulty }} showCost />
                    <p className="text-[13px] font-mono font-semibold uppercase tracking-wider mt-3 mb-1" style={{ color: 'var(--accent-primary)' }}>
                      Mục tiêu mua thay thế
                    </p>
                    {t.ins.map(p => (
                      <PlayerLine key={p.id} p={p} showCost />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Cấu trúc đội hình hiện tại ổn định, chưa cần chuyển nhượng gấp.
              </p>
            )}
          </SectionCard>
        </Reveal>
      )}

      {/* AI Tactical Prompt Launcher (Connects directly to the global bottom-right AI Popup) */}
      <Reveal delayMs={90}>
        <section className="bezel-shell">
          <div className="bezel-core p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-primary)' }} />
                <h4 className="text-sm sm:text-base font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                  Đối thoại trực tiếp cùng Trợ lý AI
                </h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Cửa sổ Trợ lý AI luôn túc trực ở góc dưới bên phải màn hình (phím tắt ⌘J / Ctrl+J) để bạn vừa tra cứu bảng điểm vừa đặt câu hỏi chiến thuật cho đội {selectedManagerName}.
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onOpenAiChat?.(prompt)}
                    className="pressable surface-well surface-well-hover px-3 py-1.5 text-xs text-left"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {onOpenAiChat && (
              <button type="button" onClick={() => onOpenAiChat()} className="btn-island self-start md:self-center flex-shrink-0">
                <span>Mở cửa sổ hỏi đáp AI</span>
                <span className="btn-island-icon">
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </span>
              </button>
            )}
          </div>
        </section>
      </Reveal>

      {/* Quick Player Hunter */}
      <Reveal delayMs={120}>
        <SectionCard
          icon={<Search className="w-4 h-4" strokeWidth={1.6} style={{ color: 'var(--accent-secondary)' }} />}
          title="Bộ lọc săn cầu thủ theo tầm giá"
          hint="Chọn tuyến thi đấu và mức trần ngân sách để lọc nhanh các cầu thủ có điểm kỳ vọng 5 vòng tới cao nhất."
        >
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <select
              value={huntPos}
              onChange={e => setHuntPos(Number(e.target.value))}
              className="surface-well px-3.5 py-2 text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              {POSITIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <select
              value={huntBudget}
              onChange={e => setHuntBudget(Number(e.target.value))}
              className="surface-well px-3.5 py-2 text-xs sm:text-sm font-mono tabular-nums focus:outline-none cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              {BUDGETS.map(b => (
                <option key={b} value={b}>
                  Tối đa £{b.toFixed(1)}m
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={hunt}
              disabled={hunting}
              className="btn-island disabled:opacity-60"
            >
              <span>{hunting ? 'Đang lọc...' : 'Lọc cầu thủ'}</span>
              <span className="btn-island-icon">
                <Search className="w-3.5 h-3.5" strokeWidth={1.8} />
              </span>
            </button>
          </div>

          {huntMessage && (
            <p className="text-sm mb-2" style={{ color: 'var(--accent-tertiary)' }}>
              {huntMessage}
            </p>
          )}
          {huntResult &&
            (huntResult.length ? (
              <div className="surface-well px-4 py-1.5">
                {huntResult.map(p => (
                  <PlayerLine key={p.id} p={p} showCost />
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Không tìm thấy cầu thủ phù hợp trong tầm giá này.
              </p>
            ))}
        </SectionCard>
      </Reveal>
    </div>
  );
};
