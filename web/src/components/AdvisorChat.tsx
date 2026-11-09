import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Send,
  X,
  Compass,
  Loader2,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { askAdvisorChat } from '../services/fplApi';
import { LiveGwData } from '../types';
import { INITIAL_PLAYERS } from '../data/initialData';
import { isLuckyEligible } from '../services/xsmbService';
import { LuckyNumbers } from './LuckyNumbers';

const MAX_QUESTION = 300;

const SUGGESTIONS = [
  'Tuần này nên chọn ai làm captain?',
  'Làm sao để thắng đối thủ H2H vòng này?',
  'Nên bán ai và mua ai vòng này?',
  'Khi nào nên dùng Wildcard hoặc Free Hit?',
];

interface Turn {
  id: string;
  question: string;
  answer: string;
  failed: boolean;
  factsOnly: boolean;
  at: string;
}

export interface AdvisorChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  managerId: number;
  onManagerChange: (id: number) => void;
  upcomingGW?: number | null;
  /** Same live payload as the H2H tab, for the lucky numbers card. */
  live: LiveGwData | null;
  liveReady: boolean;
  queuedPrompt?: string | null;
  onConsumePrompt?: () => void;
  onOpenAdvisorTab?: () => void;
}

export const AdvisorChat: React.FC<AdvisorChatProps> = ({
  isOpen,
  onOpenChange,
  managerId,
  onManagerChange,
  upcomingGW = null,
  live,
  liveReady,
  queuedPrompt = null,
  onConsumePrompt,
  onOpenAdvisorTab,
}) => {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notice, setNotice] = useState('');
  const [fresh, setFresh] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const streamRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedManager =
    INITIAL_PLAYERS.find((p) => p.id === managerId) || INITIAL_PLAYERS[0];

  // Clear unread indicator & focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      const t = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 180);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  // Global keyboard shortcuts: Cmd/Ctrl + J to toggle, Escape to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onOpenChange(!isOpenRef.current);
      } else if (e.key === 'Escape' && isOpenRef.current) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  // Elapsed timer during AI thinking (backend can take 6-45s)
  useEffect(() => {
    if (!sending) {
      setElapsedSec(0);
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sending]);

  // Auto-scroll to newest turn
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [turns, sending, notice]);

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || sending) return;

      setSending(true);
      setNotice('');

      const reply = await askAdvisorChat(managerId, q, fresh);

      const nowStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (reply.ok) {
        setTurns((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            question: q,
            answer: reply.answer,
            failed: false,
            factsOnly: reply.source === 'facts',
            at: nowStr,
          },
        ]);
        setQuestion('');
        setFresh(false);
        if (!isOpenRef.current) setHasUnread(true);
      } else if (reply.code === 'disabled') {
        setNotice(reply.message);
      } else {
        setTurns((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            question: q,
            answer: reply.message,
            failed: true,
            factsOnly: false,
            at: nowStr,
          },
        ]);
        if (!isOpenRef.current) setHasUnread(true);
      }
      setSending(false);
    },
    [fresh, managerId, sending],
  );

  // Handle prompt sent from other views (e.g. AdvisorView or ManagerModal)
  useEffect(() => {
    if (!queuedPrompt) return;
    onConsumePrompt?.();
    ask(queuedPrompt);
  }, [queuedPrompt, onConsumePrompt, ask]);

  return (
    <>
      {/* FLOATING BOTTOM-RIGHT ROYAL JEWEL TRIGGER (Always Accessible) */}
      <div className="fixed bottom-[5.25rem] right-4 md:bottom-6 md:right-6 z-40">
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Mở trợ lý AI"
          className="pressable group rounded-full p-1 backdrop-blur-2xl transition-[transform,box-shadow,opacity] duration-300 ease-out-strong md:hover:-translate-y-0.5"
          style={{
            backgroundColor: 'rgba(56, 0, 60, 0.14)',
            boxShadow: '0 22px 44px -14px rgba(42, 10, 62, 0.42), 0 0 0 1px rgba(56, 0, 60, 0.22)',
          }}
        >
          <div
            className="relative flex items-center gap-2.5 rounded-full pl-2.5 pr-3.5 py-2 sm:pl-3 sm:pr-4 sm:py-2"
            style={{
              background: 'linear-gradient(145deg, #470a4e 0%, #240429 100%)',
              boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.22)',
            }}
          >
            <span
              className="relative w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ease-out-strong group-hover:scale-105"
              style={{
                backgroundColor: 'rgba(52, 211, 153, 0.18)',
                color: '#34d399',
                boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.36)',
              }}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin-smooth" strokeWidth={1.7} />
              ) : isOpen ? (
                <ChevronDown className="w-4 h-4" strokeWidth={1.7} />
              ) : (
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.7} />
              )}
              {hasUnread && !isOpen && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: '#fb7185',
                    boxShadow: '0 0 0 2px #2b0530',
                  }}
                />
              )}
            </span>

            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-display font-bold text-white">
                  Trợ lý AI
                </span>
                <span
                  className="hidden sm:inline-block text-[12px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#e9d5ff',
                  }}
                >
                  ⌘J
                </span>
              </div>
              <span
                className="hidden sm:block text-[13px] font-mono"
                style={{ color: sending ? '#34d399' : 'rgba(243, 232, 255, 0.78)' }}
              >
                {sending
                  ? `Đang phân tích · ${elapsedSec}s`
                  : upcomingGW
                  ? `Tư vấn GW${upcomingGW}`
                  : 'Tư vấn chiến thuật'}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ORIGIN-AWARE FLOATING POPUP WINDOW (Bottom-Right Anchored) */}
      <aside
        aria-label="Cửa sổ hỏi đáp Trợ lý AI"
        style={{
          transformOrigin: 'bottom right',
          backgroundColor: 'var(--bg-tray)',
          boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)',
        }}
        className={`fixed bottom-[8.5rem] right-3 sm:right-6 md:bottom-[5.25rem] z-40 w-[calc(100vw-1.5rem)] sm:w-[416px] rounded-[1.75rem] p-1.5 backdrop-blur-2xl transition-[transform,opacity] duration-300 ease-fluid ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        }`}
      >
        <div
          className="flex flex-col h-[min(570px,calc(100dvh-10.5rem))] md:h-[min(600px,calc(100dvh-7.5rem))] rounded-[calc(1.75rem-6px)] overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'inset 0 1px 0 0 var(--inner-highlight)',
          }}
        >
          {/* Popup Header */}
          <div
            className="flex items-center justify-between gap-2 px-4 py-3"
            style={{
              backgroundColor: 'var(--table-head-bg)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--accent-primary-soft)',
                  color: 'var(--accent-primary)',
                  boxShadow: '0 0 0 1px var(--border-highlight)',
                }}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <h3 className="text-sm font-display font-bold leading-tight" style={{ color: 'var(--text-main)' }}>
                    Trợ lý chiến thuật AI
                  </h3>
                  <span
                    className="text-[13px] font-mono font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent-secondary-soft)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    {upcomingGW ? `GW${upcomingGW} sắp tới` : 'Mùa 26/27'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onOpenAdvisorTab && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAdvisorTab();
                    onOpenChange(false);
                  }}
                  className="pressable w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    color: 'var(--text-muted)',
                    boxShadow: '0 0 0 1px var(--border-subtle)',
                  }}
                  title="Mở trang Phân tích vòng đấu đầy đủ"
                >
                  <Compass className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
              {turns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTurns([]);
                    setFresh(true);
                  }}
                  disabled={sending}
                  className="pressable w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--bg-card-solid)',
                    color: 'var(--text-muted)',
                    boxShadow: '0 0 0 1px var(--border-subtle)',
                  }}
                  title="Bắt đầu cuộc trò chuyện mới"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="pressable w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 0 0 1px var(--border-subtle)',
                }}
                title="Thu gọn (Esc)"
                aria-label="Thu gọn cửa sổ AI"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            </div>
          </div>

          {/* Context Bar: Manager Selector */}
          <div
            className="px-4 py-2.5 space-y-2"
            style={{
              backgroundColor: 'var(--bg-card-solid)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ai-popup-manager"
                className="text-[14px] font-mono whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                Đội phân tích:
              </label>
              <select
                id="ai-popup-manager"
                value={managerId}
                onChange={(e) => {
                  onManagerChange(Number(e.target.value));
                  setFresh(true);
                }}
                className="flex-1 min-w-0 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  boxShadow: '0 0 0 1px var(--border-outer)',
                }}
              >
                {INITIAL_PLAYERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.manager} · {p.team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation Stream */}
          <div ref={streamRef} className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
            {turns.length === 0 && !sending && (
              <div className="space-y-3">
                <div className="surface-well p-3.5">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                    Xin chào HLV {selectedManager.manager}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Trợ lý đối chiếu trực tiếp đội hình {selectedManager.team}, điểm kỳ vọng xP 5 vòng tới, lịch thi đấu, số lượt chuyển nhượng miễn phí và kèo đối đầu H2H để trả lời ngắn gọn, bám sát số liệu.
                  </p>
                </div>

                {isLuckyEligible(managerId) && (
                  <LuckyNumbers managerId={managerId} compact onAsk={ask} live={live} liveReady={liveReady} />
                )}

                <div>
                  <p
                    className="text-[13px] font-mono uppercase tracking-[0.16em] mb-2 px-0.5"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Gợi ý câu hỏi nhanh
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => ask(s)}
                        disabled={sending}
                        className="pressable text-left px-3 py-2 rounded-xl text-xs transition-[background-color,box-shadow,transform] duration-150 ease-out-strong disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--bg-card-solid)',
                          color: 'var(--text-secondary)',
                          boxShadow: '0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {turns.map((t) => (
              <div key={t.id} className="space-y-2">
                {/* User Bubble */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-xs font-medium leading-relaxed"
                    style={{
                      backgroundColor: 'var(--accent-primary-soft)',
                      color: 'var(--text-main)',
                      boxShadow: '0 0 0 1px var(--border-highlight)',
                    }}
                  >
                    {t.question}
                  </div>
                </div>

                {/* Assistant Bubble */}
                <div className="flex justify-start">
                  <div
                    className="w-full rounded-2xl rounded-tl-md p-3.5 text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-card-solid)',
                      color: t.failed ? 'var(--accent-tertiary)' : 'var(--text-main)',
                      boxShadow: '0 0 0 1px var(--border-subtle), inset 0 1px 0 0 var(--inner-highlight)',
                    }}
                  >
                    {t.factsOnly && (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-mono mb-2"
                        style={{
                          backgroundColor: 'var(--accent-gold-soft)',
                          color: 'var(--accent-gold)',
                        }}
                      >
                        <span>Số liệu gốc đã kiểm chứng</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{t.answer}</p>
                    <p
                      className="text-[13px] font-mono mt-2 text-right"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      {t.at}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div
                className="rounded-2xl rounded-tl-md p-3.5 text-xs flex items-center gap-2.5"
                style={{
                  backgroundColor: 'var(--bg-card-solid)',
                  color: 'var(--text-muted)',
                  boxShadow: '0 0 0 1px var(--border-subtle)',
                }}
              >
                <Loader2
                  className="w-4 h-4 animate-spin-smooth flex-shrink-0"
                  strokeWidth={1.6}
                  style={{ color: 'var(--accent-primary)' }}
                />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                    Đang tổng hợp số liệu đội hình ({elapsedSec}s)
                  </p>
                  <p className="text-[14px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                    Quá trình kiểm chứng số liệu thường mất 6 đến 30 giây.
                  </p>
                </div>
              </div>
            )}

            {notice && (
              <div
                className="rounded-xl p-3 text-xs flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--accent-tertiary-soft)',
                  color: 'var(--accent-tertiary)',
                  boxShadow: '0 0 0 1px rgba(244, 63, 107, 0.25)',
                }}
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{notice}</span>
              </div>
            )}
          </div>

          {/* Sticky Composer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="p-3"
            style={{
              backgroundColor: 'var(--table-head-bg)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="flex items-center gap-2 rounded-full pl-3.5 pr-1.5 py-1"
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                boxShadow: '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)',
              }}
            >
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
                placeholder={`Hỏi cho ${selectedManager.manager} (captain, H2H, mua bán...)`}
                className="flex-1 min-w-0 bg-transparent py-1.5 text-xs focus:outline-none"
                style={{ color: 'var(--text-main)' }}
              />
              {question.length > 220 && (
                <span className="text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  {MAX_QUESTION - question.length}
                </span>
              )}
              <button
                type="submit"
                disabled={sending || !question.trim()}
                aria-label="Gửi câu hỏi"
                className="pressable w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-[transform,opacity,background-color] duration-150 ease-out-strong disabled:opacity-35"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary-ink)',
                }}
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.7} />
              </button>
            </div>
            <p className="text-[13px] text-center mt-1.5" style={{ color: 'var(--text-faint)' }}>
              Câu hỏi lưu ẩn danh 30 ngày. Hãy đối chiếu thêm bảng số liệu trước giờ chốt đội.
            </p>
          </form>
        </div>
      </aside>
    </>
  );
};
