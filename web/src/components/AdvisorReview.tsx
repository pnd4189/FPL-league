import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchAiReview } from '../services/fplApi';
import { AiReview } from '../types';

const POLL_MS = 8000;
const MAX_POLLS = 12;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

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
    if (initial?.fresh) {
      setStatus('fresh');
      return;
    }

    const request = ++latest.current;
    setStatus('updating');
    (async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        const result = await fetchAiReview(managerId);
        // Ignore an answer that arrives after the user switched to someone else.
        if (request !== latest.current) return;
        if (result.review) setReview(result.review);
        if (result.state === 'fresh') {
          setStatus('fresh');
          return;
        }
        if (result.state === 'failed') {
          setStatus('failed');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_MS));
        if (request !== latest.current) return;
      }
      setStatus('failed');
    })();
    return () => {
      latest.current++;
    };
  }, [managerId, initial]);

  // Nothing to show and nothing coming: the rest of the tab stands alone.
  if (!review && status === 'failed') return null;

  const written = review ? formatTime(review.at) : '';
  const hint =
    status === 'fresh'
      ? `Cập nhật lúc ${written} theo dữ liệu hiện tại. Hãy đối chiếu thêm với bảng số liệu bên dưới trước khi chốt đội.`
      : status === 'updating'
      ? review
        ? `Số liệu vừa thay đổi, trợ lý AI đang biên tập lại nhận xét. Bản bên dưới ghi lúc ${written}.`
        : 'Trợ lý AI đang tổng hợp nhận xét theo số liệu mới nhất, quá trình này có thể mất tới 1 phút.'
      : `Chưa cập nhật được bản mới. Nhận xét bên dưới ghi lúc ${written}.`;

  return (
    <section className="bezel-shell">
      <div className="bezel-core p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--accent-secondary-soft)',
                color: 'var(--accent-secondary)',
              }}
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.6} />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-display font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                Phân tích chiến thuật từ AI
              </h4>
            </div>
          </div>

          {status === 'updating' && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-mono"
              style={{ backgroundColor: 'var(--bg-card-solid)', color: 'var(--text-muted)' }}
            >
              <Loader2 className="w-3 h-3 animate-spin-smooth" strokeWidth={1.6} />
              <span>Đang viết lại</span>
            </span>
          )}
        </div>

        <p className="text-xs mb-3.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>

        {review && (
          <div className="surface-well p-4">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: status === 'fresh' ? 'var(--text-main)' : 'var(--text-secondary)' }}
            >
              {review.text}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
