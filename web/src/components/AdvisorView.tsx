import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Crown, HeartPulse, Lightbulb, Loader2, Search, Swords } from 'lucide-react';
import { INITIAL_PLAYERS } from '../data/initialData';
import { fetchAdvisor, fetchAdvisorHunt } from '../services/fplApi';
import { AdvisorData, AdvisorFixture, AdvisorPlayer } from '../types';

const STORAGE_KEY = 'htcv_fpl_advisor_manager';
const POSITIONS = [
  { value: 1, label: 'Thủ môn' },
  { value: 2, label: 'Hậu vệ' },
  { value: 3, label: 'Tiền vệ' },
  { value: 4, label: 'Tiền đạo' },
];
const BUDGETS = [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];
const POS_SHORT: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

// FPL fixture difficulty: 1-2 easy, 3 neutral, 4 hard, 5 very hard.
const FDR_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#00ff87', fg: '#000' },
  2: { bg: '#01c26b', fg: '#000' },
  3: { bg: '#8b8b96', fg: '#000' },
  4: { bg: '#ff7a45', fg: '#000' },
  5: { bg: '#e90052', fg: '#fff' },
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
    return <span className="text-[10px] font-mono" style={{ color: 'var(--accent-tertiary)' }}>Không có trận</span>;
  }
  return (
    <span className="inline-flex gap-1">
      {fixtures.map((f, i) => (
        <span key={i} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: FDR_COLORS[f.fdr]?.bg, color: FDR_COLORS[f.fdr]?.fg }}>
          {f.opp} ({f.home ? 'H' : 'A'})
        </span>
      ))}
    </span>
  );
};

const PlayerLine: React.FC<{ p: AdvisorPlayer; showCost?: boolean }> = ({ p, showCost }) => (
  <div className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0"
    style={{ borderColor: 'var(--border-subtle)' }}>
    <div className="min-w-0">
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
        {p.name} <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{p.team} · {POS_SHORT[p.pos]}</span>
      </p>
      <div className="mt-0.5"><FixtureChips fixtures={p.fixtures} /></div>
      {p.reasons && p.reasons.length > 0 && (
        <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{p.reasons.join(' · ')}</p>
      )}
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-mono font-black" style={{ color: 'var(--accent-primary)' }}>{p.ep.toFixed(1)} <span className="text-[9px] font-normal" style={{ color: 'var(--text-faint)' }}>điểm dự kiến</span></p>
      <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
        Form {p.form.toFixed(1)}{showCost ? ` · £${p.cost.toFixed(1)}m` : ''}{p.ep5 !== undefined && showCost ? ` · 5 vòng ${p.ep5.toFixed(1)}đ` : ''}{p.difficulty !== undefined ? ` · Lịch ${p.difficulty.toFixed(1)}` : ''}
      </p>
    </div>
  </div>
);

const Card: React.FC<{ icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }> = ({ icon, title, hint, children }) => (
  <section className="glass-panel rounded-2xl p-4 sm:p-5">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>{title}</h4>
    </div>
    {hint && <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    {children}
  </section>
);

export const AdvisorView: React.FC = () => {
  const [managerId, setManagerId] = useState<number>(readSavedManager);
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

  useEffect(() => { load(managerId); }, [managerId, load]);

  const chooseManager = (id: number) => {
    setManagerId(id);
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* private mode */ }
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
    ? new Date(advice.deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Trợ Lý Vòng Đấu{advice ? ` — GW${advice.gw}` : ''}
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Gợi ý captain, đối đầu H2H và chuyển nhượng dựa trên điểm dự kiến do trợ lý tự tính từ điểm trung bình mùa, phong độ, xG+xA, số phút thi đấu, độ khó trận, sân nhà và giá (khớp trên dữ liệu 3 mùa trước), không phải con số của FPL.
            {deadline ? ` Hạn chốt đội: ${deadline}.` : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          Bạn là
          <select value={managerId} onChange={e => chooseManager(Number(e.target.value))}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold border"
            style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)', borderColor: 'var(--border-highlight)' }}>
            {INITIAL_PLAYERS.map(p => <option key={p.id} value={p.id}>{p.manager}</option>)}
          </select>
        </label>
      </div>

      {loading && (
        <div className="glass-panel rounded-2xl p-8 flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích đội hình, có thể mất vài giây...
        </div>
      )}

      {!loading && message && (
        <div className="glass-panel rounded-2xl p-5 text-sm flex items-center justify-between gap-3" style={{ color: 'var(--accent-tertiary)' }}>
          <span>{message}</span>
          <button onClick={() => load(managerId)} className="interactive px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: 'var(--border-highlight)', color: 'var(--text-main)' }}>Thử lại</button>
        </div>
      )}

      {advice && (
        <>
          <p className="text-[11px] px-1" style={{ color: 'var(--text-faint)' }}>
            Đội hình tính từ GW{advice.basedOnGw}{advice.savedTransfers > 0 ? ` cộng ${advice.savedTransfers} chuyển nhượng đã lưu` : ''} · tiền trong túi ước tính £{advice.bank.toFixed(1)}m.
            Gợi ý chỉ mang tính tham khảo.
          </p>

          <Card icon={<Crown className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />} title="Captain nên chọn"
            hint="Chỉ xét tiền vệ và tiền đạo đá chính, xếp theo điểm dự kiến của trợ lý. Người nghi ngờ chấn thương hoặc không có trận bị loại.">
            {advice.captains.length ? advice.captains.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-lg font-black w-5 text-center" style={{ color: i === 0 ? 'var(--accent-gold)' : 'var(--text-faint)' }}>{i + 1}</span>
                <div className="flex-1"><PlayerLine p={p} /></div>
              </div>
            )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có ứng viên phù hợp trong đội hình này.</p>}
          </Card>

          <Card icon={<Swords className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />}
            title={advice.opponent ? `Đối đầu H2H: ${advice.opponent.manager}` : 'Đối đầu H2H'}
            hint="So đội hình gần nhất của hai bên. Cầu thủ cả hai cùng có thì triệt tiêu nhau nên không tính.">
            {advice.opponent ? (
              <>
                <p className="text-sm font-mono mb-3" style={{ color: 'var(--text-main)' }}>
                  Điểm dự kiến (ước tính): <span style={{ color: 'var(--accent-primary)' }}>{advice.manager} {advice.opponent.myProjected}</span>
                  {' '}vs <span style={{ color: 'var(--accent-tertiary)' }}>{advice.opponent.manager} {advice.opponent.theirProjected}</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase mb-1" style={{ color: 'var(--accent-primary)' }}>Con bài của bạn (đối thủ không có)</p>
                    {advice.opponent.edge.length ? advice.opponent.edge.map(p => <PlayerLine key={p.id} p={p} />)
                      : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Không có.</p>}
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase mb-1" style={{ color: 'var(--accent-tertiary)' }}>Mối đe doạ (bạn không có)</p>
                    {advice.opponent.threat.length ? advice.opponent.threat.map(p => <PlayerLine key={p.id} p={p} />)
                      : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Không có.</p>}
                  </div>
                </div>
              </>
            ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Vòng này bạn không có đối thủ H2H, hoặc chưa tải được đội hình đối thủ.</p>}
          </Card>

          <Card icon={<ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />} title="Gợi ý chuyển nhượng"
            hint="Những người yếu nhất trong đội (chấn thương, ít điểm dự kiến, lịch 5 vòng tới khó) và người thay thế cùng vị trí, vừa túi tiền. Giá bán thật có thể lệch chút so với giá hiện tại.">
            {advice.transfers.length ? advice.transfers.map(t => (
              <div key={t.out.id} className="mb-4 last:mb-0 rounded-xl p-3 border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}>
                <p className="text-[11px] font-mono font-bold uppercase mb-1" style={{ color: 'var(--accent-tertiary)' }}>Bán</p>
                <PlayerLine p={{ ...t.out, difficulty: t.outDifficulty }} showCost />
                <p className="text-[11px] font-mono font-bold uppercase mt-2 mb-1" style={{ color: 'var(--accent-primary)' }}>Mua thay</p>
                {t.ins.map(p => <PlayerLine key={p.id} p={p} showCost />)}
              </div>
            )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Đội hình ổn, chưa thấy ai đáng thay.</p>}
          </Card>

          <Card icon={<HeartPulse className="w-4 h-4" style={{ color: 'var(--accent-tertiary)' }} />} title="Sức khoẻ đội hình">
            {advice.health.length ? advice.health.map(h => (
              <p key={h.name} className="text-sm py-1" style={{ color: 'var(--text-main)' }}>
                <span className="font-semibold">{h.name}</span> <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{h.team} · {h.starter ? 'đá chính' : 'dự bị'}</span>
                {' — '}<span style={{ color: 'var(--accent-tertiary)' }}>{h.why}</span>
                {h.news ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}> ({h.news})</span> : null}
              </p>
            )) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cả 15 cầu thủ đều khoẻ và có trận.</p>}
          </Card>
        </>
      )}

      <Card icon={<Search className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />} title="Tìm nhanh cầu thủ"
        hint="Chọn vị trí và ngân sách tối đa, trợ lý tìm người đáng mua nhất theo điểm dự kiến và lịch thi đấu.">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select value={huntPos} onChange={e => setHuntPos(Number(e.target.value))}
            className="rounded-lg px-3 py-1.5 text-sm border" style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)', borderColor: 'var(--border-subtle)' }}>
            {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={huntBudget} onChange={e => setHuntBudget(Number(e.target.value))}
            className="rounded-lg px-3 py-1.5 text-sm border" style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)', borderColor: 'var(--border-subtle)' }}>
            {BUDGETS.map(b => <option key={b} value={b}>Tối đa £{b.toFixed(1)}m</option>)}
          </select>
          <button onClick={hunt} disabled={hunting}
            className="interactive px-4 py-1.5 rounded-lg text-sm font-bold border disabled:opacity-60"
            style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
            {hunting ? 'Đang tìm...' : 'Tìm'}
          </button>
        </div>
        {huntMessage && <p className="text-sm" style={{ color: 'var(--accent-tertiary)' }}>{huntMessage}</p>}
        {huntResult && (huntResult.length
          ? huntResult.map(p => <PlayerLine key={p.id} p={p} showCost />)
          : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Không có cầu thủ phù hợp.</p>)}
      </Card>
    </div>
  );
};
