import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { fetchAiReview } from '../services/fplApi';
import { AiReview } from '../types';

const POLL_MS = 8000;
const MAX_POLLS = 12;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * The AI comment. It is loaded after the advice is on screen: a comment that
 * no longer matches the numbers is rewritten by the backend, which can take up
 * to a minute, and the rest of the tab must not wait for it.
 */
export const AdvisorReview: React.FC<{ managerId: number; initial: AiReview | null }> = ({ managerId, initial }) => {
  const [review, setReview] = useState<AiReview | null>(initial);
  const [status, setStatus] = useState<'fresh' | 'updating' | 'failed'>(initial?.fresh ? 'fresh' : 'updating');
  const latest = useRef(0);

  useEffect(() => {
    setReview(initial);
    if (initial?.fresh) { setStatus('fresh'); return; }

    const request = ++latest.current;
    setStatus('updating');
    (async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        const result = await fetchAiReview(managerId);
        // Ignore an answer that arrives after the user switched to someone else.
        if (request !== latest.current) return;
        if (result.review) setReview(result.review);
        if (result.state === 'fresh') { setStatus('fresh'); return; }
        if (result.state === 'failed') { setStatus('failed'); return; }
        await new Promise(resolve => setTimeout(resolve, POLL_MS));
        if (request !== latest.current) return;
      }
      setStatus('failed');
    })();
    return () => { latest.current++; };
  }, [managerId, initial]);

  // Nothing to show and nothing coming: the rest of the tab stands alone.
  if (!review && status === 'failed') return null;

  const written = review ? formatTime(review.at) : '';
  const hint = status === 'fresh'
    ? `Viết lúc ${written} theo số liệu hiện tại. AI có thể nhầm, hãy đối chiếu với số liệu bên dưới.`
    : status === 'updating'
      ? (review ? `Số liệu đã đổi nên trợ lý đang viết lại. Bản bên dưới viết lúc ${written}, có thể đã cũ.` : 'Trợ lý đang viết nhận xét theo số liệu mới nhất, có thể mất tới 1 phút.')
      : `Chưa cập nhật được. Bản bên dưới viết lúc ${written} và có thể đã cũ.`;

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
        <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>
          Nhận xét của trợ lý AI
        </h4>
        {status === 'updating' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />}
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      {review && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: status === 'fresh' ? 'var(--text-main)' : 'var(--text-muted)' }}>{review.text}</p>
      )}
    </section>
  );
};
