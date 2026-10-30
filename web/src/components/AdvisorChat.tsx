import React, { useState } from 'react';
import { Loader2, MessageCircle, RotateCcw, Send } from 'lucide-react';
import { askAdvisorChat } from '../services/fplApi';

const CODE_KEY = 'htcv_fpl_chat_code';
const MAX_QUESTION = 300;
const SUGGESTIONS = [
  'Tuần này nên chọn ai làm captain?',
  'Làm sao để thắng đối thủ H2H vòng này?',
  'Nên bán ai và mua ai?',
];

interface Turn {
  question: string;
  answer: string;
  failed: boolean;
  factsOnly: boolean;
}

const readSavedCode = (): string => {
  try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; }
};

export const AdvisorChat: React.FC<{ managerId: number; managerName: string }> = ({ managerId, managerName }) => {
  const [code, setCode] = useState(readSavedCode);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  // The backend remembers the last two questions for follow-ups; this starts over.
  const [fresh, setFresh] = useState(false);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    if (!code.trim()) { setNotice('Hãy nhập mã chung của league trước (hỏi người tạo league).'); return; }
    setSending(true);
    setNotice('');
    const reply = await askAdvisorChat(managerId, code.trim(), q, fresh);
    if (reply.remaining !== null) setRemaining(reply.remaining);
    if (reply.limit !== null) setLimit(reply.limit);
    if (reply.ok) {
      try { localStorage.setItem(CODE_KEY, code.trim()); } catch { /* private mode */ }
      setTurns(prev => [...prev, { question: q, answer: reply.answer, failed: false, factsOnly: reply.source === 'facts' }]);
      setQuestion('');
      setFresh(false);
    } else if (reply.code === 'bad_code' || reply.code === 'locked' || reply.code === 'disabled') {
      setNotice(reply.message);
      if (reply.code === 'bad_code') { try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ } }
    } else {
      setTurns(prev => [...prev, { question: q, answer: reply.message, failed: true, factsOnly: false }]);
    }
    setSending(false);
  };

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
        <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>
          Hỏi trợ lý AI
        </h4>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
        Trả lời cho {managerName} dựa trên các số liệu ở trên (có thể nhắc tên cầu thủ trong câu hỏi). AI có thể nhầm, hãy đối chiếu với số liệu.
        {remaining !== null && limit !== null ? ` Còn ${remaining}/${limit} câu hôm nay.` : ' Mỗi người tối đa 10 câu mỗi ngày.'}
        {' '}Câu hỏi được lưu ẩn danh (không kèm tên) trong 30 ngày để cải thiện trợ lý.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Mã chung của league"
          autoComplete="off" className="rounded-lg px-3 py-1.5 text-sm border w-44"
          style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)', borderColor: 'var(--border-subtle)' }} />
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => ask(s)} disabled={sending}
            className="interactive px-2.5 py-1 rounded-full text-[11px] border disabled:opacity-50"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>{s}</button>
        ))}
      </div>

      {turns.length > 0 && (
        <button onClick={() => { setTurns([]); setFresh(true); }} disabled={sending}
          className="interactive mb-3 flex items-center gap-1 text-[11px] font-mono disabled:opacity-50" style={{ color: 'var(--text-muted)' }}>
          <RotateCcw className="w-3 h-3" /> Hỏi lại từ đầu (trợ lý quên các câu trước)
        </button>
      )}

      {turns.map((t, i) => (
        <div key={i} className="mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{t.question}</p>
          {t.factsOnly && (
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--accent-gold)' }}>Số liệu gốc — AI chưa diễn đạt chắc chắn nên không dùng lời của AI</p>
          )}
          <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed rounded-xl p-3 border"
            style={{ color: t.failed ? 'var(--accent-tertiary)' : 'var(--text-main)', borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-solid)' }}>
            {t.answer}
          </p>
        </div>
      ))}

      {sending && (
        <p className="text-sm flex items-center gap-2 mb-3" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Trợ lý đang suy nghĩ, có thể mất tới 1 phút...
        </p>
      )}
      {notice && <p className="text-sm mb-3" style={{ color: 'var(--accent-tertiary)' }}>{notice}</p>}

      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); ask(question); }}>
        <input value={question} onChange={e => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
          placeholder="Hỏi về captain, đối thủ H2H, chuyển nhượng, một cầu thủ cụ thể..."
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm border"
          style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-main)', borderColor: 'var(--border-subtle)' }} />
        <button type="submit" disabled={sending || !question.trim()}
          className="interactive px-4 rounded-lg text-sm font-bold border flex items-center gap-1.5 disabled:opacity-50"
          style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
          <Send className="w-4 h-4" /> Gửi
        </button>
      </form>
    </section>
  );
};
