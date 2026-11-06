import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clover, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import {
  analyzeLuckyNumbers,
  FrequencyEntry,
  isLuckyEligible,
  LuckyAnalysis,
} from '../services/xsmbService';
import { fetchH2HSchedule } from '../services/fplApi';
import { INITIAL_PLAYERS } from '../data/initialData';

interface LuckyNumbersProps {
  managerId: number;
  /** Compact mode for the chat popup (less padding, smaller text). */
  compact?: boolean;
  /** Sends a question to the league chat; the question box shows only when this is given. */
  onAsk?: (question: string) => void;
}

// ─── Chart period options ────────────────────────────────────────────────────

type ChartPeriod = '1w' | '2w' | '3w' | '1m';

const PERIOD_OPTIONS: { key: ChartPeriod; label: string }[] = [
  { key: '1w', label: '1 tuần' },
  { key: '2w', label: '2 tuần' },
  { key: '3w', label: '3 tuần' },
  { key: '1m', label: '1 tháng' },
];

function getCountForPeriod(entry: FrequencyEntry, period: ChartPeriod): number {
  switch (period) {
    case '1w': return entry.count1w;
    case '2w': return entry.count2w;
    case '3w': return entry.count3w;
    case '1m': return entry.count1m;
  }
}

// ─── Seed / related colors ───────────────────────────────────────────────────

const SEED_GRADIENT = ['#eab308', '#f59e0b'] as const;
const RELATED_PALETTE = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f43f5e', '#ec4899', '#6366f1', '#14b8a6',
];

// ─── Frequency chart ─────────────────────────────────────────────────────────

const FrequencyChart: React.FC<{
  entries: FrequencyEntry[];
  seedCount: number;
  compact?: boolean;
}> = ({ entries, seedCount, compact }) => {
  const [period, setPeriod] = useState<ChartPeriod>('1w');

  const counts = useMemo(
    () => entries.map((e) => getCountForPeriod(e, period)),
    [entries, period],
  );
  const maxCount = Math.max(...counts, 1);

  // Sort by count descending for the chart (keep original for reference)
  const ranked = useMemo(() => {
    const indexed = entries.map((e, i) => ({ entry: e, idx: i }));
    indexed.sort(
      (a, b) =>
        getCountForPeriod(b.entry, period) - getCountForPeriod(a.entry, period),
    );
    return indexed;
  }, [entries, period]);

  return (
    <div className="space-y-2.5">
      {/* Chart header: title + period toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p
          className="text-[13px] font-mono uppercase tracking-[0.12em] px-0.5"
          style={{ color: 'var(--text-faint)' }}
        >
          Biểu đồ tần suất xuất hiện
        </p>

        {/* Pill toggle */}
        <div
          className="inline-flex items-center rounded-full p-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 0 0 1px var(--border-subtle)',
          }}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = opt.key === period;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`px-2.5 py-1 rounded-full text-[13px] font-mono font-semibold transition-all duration-200 ${
                  active ? '' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                  color: active ? 'var(--accent-primary-ink)' : 'var(--text-faint)',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart body */}
      <div
        className={`${compact ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden`}
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 0 0 1px var(--border-subtle), 0 2px 8px -2px rgba(0,0,0,0.06)',
        }}
      >
        <div className={compact ? 'px-3 pt-3 pb-2' : 'px-4 pt-4 pb-3'}>
          {ranked.map(({ entry, idx }) => {
            const isSeed = idx < seedCount;
            const count = getCountForPeriod(entry, period);
            const pct = (count / maxCount) * 100;
            const color = isSeed
              ? SEED_GRADIENT[idx % 2]
              : RELATED_PALETTE[(idx - seedCount) % RELATED_PALETTE.length];

            return (
              <div
                key={`bar-${entry.number}-${idx}`}
                className={`group flex items-center gap-2 ${compact ? 'h-6 mb-1 last:mb-0' : 'h-7 mb-1.5 last:mb-0'}`}
              >
                {/* Number pill */}
                <span
                  className={`${compact ? 'text-[13px] min-w-[26px]' : 'text-[14px] min-w-[30px]'} font-mono font-bold text-center px-1 py-0.5 rounded-md flex-shrink-0`}
                  style={{
                    backgroundColor: isSeed ? `${color}18` : 'transparent',
                    color: isSeed ? color : 'var(--text-main)',
                    boxShadow: isSeed ? `0 0 0 1px ${color}30` : 'none',
                  }}
                >
                  {String(entry.number).padStart(2, '0')}
                </span>

                {/* Bar track */}
                <div
                  className="flex-1 h-full rounded-lg overflow-hidden relative"
                  style={{
                    backgroundColor: 'var(--bg-tray)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Animated filled bar */}
                  <div
                    className="h-full rounded-lg flex items-center transition-[width] duration-700 ease-out"
                    style={{
                      width: `${Math.max(pct, count > 0 ? 6 : 2)}%`,
                      background: isSeed
                        ? `linear-gradient(90deg, ${color}20 0%, ${color}55 40%, ${color}90 100%)`
                        : `linear-gradient(90deg, ${color}10 0%, ${color}35 40%, ${color}70 100%)`,
                      boxShadow: `inset 0 -1px 0 0 ${color}20, inset 0 1px 0 0 ${color}30`,
                    }}
                  >
                    {/* Shine highlight on top */}
                    <div
                      className="absolute inset-x-0 top-0 h-[40%] rounded-lg pointer-events-none"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)`,
                        width: `${Math.max(pct, count > 0 ? 6 : 2)}%`,
                      }}
                    />
                  </div>

                  {/* Dot marker at the end of bar */}
                  {count > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-[left] duration-700 ease-out"
                      style={{
                        left: `calc(${Math.max(pct, 6)}% - 4px)`,
                        backgroundColor: color,
                        boxShadow: `0 0 6px 1px ${color}55`,
                      }}
                    />
                  )}
                </div>

                {/* Count badge */}
                <span
                  className={`${compact ? 'text-[13px] min-w-[18px]' : 'text-[14px] min-w-[22px]'} font-mono font-bold text-center flex-shrink-0 tabular-nums`}
                  style={{
                    color: count > 0 ? color : 'var(--text-faint)',
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend + period label footer */}
        <div
          className={`flex items-center justify-between gap-3 flex-wrap border-t ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--table-head-bg)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
              <span
                className="w-3 h-2.5 rounded-sm"
                style={{
                  background: `linear-gradient(90deg, ${SEED_GRADIENT[0]}40, ${SEED_GRADIENT[0]}90)`,
                  boxShadow: `inset 0 0 0 1px ${SEED_GRADIENT[0]}40`,
                }}
              />
              Seed H2H
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
              <span
                className="w-3 h-2.5 rounded-sm"
                style={{
                  background: `linear-gradient(90deg, ${RELATED_PALETTE[0]}30, ${RELATED_PALETTE[0]}70)`,
                  boxShadow: `inset 0 0 0 1px ${RELATED_PALETTE[0]}30`,
                }}
              />
              Liên quan
            </span>
          </div>
          <span className="text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
            Xếp giảm dần theo số lần xuất hiện
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export const LuckyNumbers: React.FC<LuckyNumbersProps> = ({
  managerId,
  compact = false,
  onAsk,
}) => {
  const [analysis, setAnalysis] = useState<LuckyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [h2hLabel, setH2hLabel] = useState('');
  const [question, setQuestion] = useState('');

  const manager = INITIAL_PLAYERS.find((p) => p.id === managerId);

  const load = useCallback(async () => {
    if (!isLuckyEligible(managerId)) return;
    setLoading(true);
    setError('');
    try {
      const schedule = await fetchH2HSchedule();
      if (!schedule) throw new Error('no_h2h');

      const played = schedule
        .filter(
          (m) =>
            m.played &&
            (m.homeId === managerId || m.awayId === managerId),
        )
        .sort((a, b) => b.gw - a.gw);

      if (!played.length) {
        setError('Chưa có kết quả H2H nào để phân tích.');
        setLoading(false);
        return;
      }

      const latest = played[0];
      const isHome = latest.homeId === managerId;
      const myScore = isHome ? latest.homePts : latest.awayPts;
      const oppScore = isHome ? latest.awayPts : latest.homePts;
      const oppId = isHome ? latest.awayId : latest.homeId;
      const oppName =
        INITIAL_PLAYERS.find((p) => p.id === oppId)?.manager || 'Đối thủ';

      setH2hLabel(
        `GW${latest.gw}: ${manager?.manager ?? '?'} ${myScore} – ${oppScore} ${oppName}`,
      );

      const result = await analyzeLuckyNumbers(myScore, oppScore);
      setAnalysis(result);
    } catch (err) {
      console.warn('Lucky numbers error:', err);
      setError('Không thể tải dữ liệu. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [managerId, manager?.manager]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isLuckyEligible(managerId)) return null;

  // ─── Table column config ──────────────────────────────────────────────────
  const COL_HEADERS = ['Hôm qua', '1 tuần', '2 tuần', '3 tuần', '1 tháng'];

  const getRowCells = (entry: FrequencyEntry) => [
    entry.countYesterday,
    entry.count1w,
    entry.count2w,
    entry.count3w,
    entry.count1m,
  ];

  // ─── Frequency table row ─────────────────────────────────────────────────
  const FreqRow: React.FC<{ entry: FrequencyEntry; highlight?: boolean }> = ({
    entry,
    highlight = false,
  }) => (
    <tr
      style={{
        backgroundColor: highlight
          ? 'var(--accent-gold-soft)'
          : 'transparent',
      }}
    >
      <td
        className={`${compact ? 'px-2 py-1' : 'px-3 py-1.5'} font-mono font-bold text-center`}
        style={{ color: highlight ? 'var(--accent-gold)' : 'var(--text-main)' }}
      >
        {String(entry.number).padStart(2, '0')}
      </td>
      {getRowCells(entry).map((c, i) => (
        <td
          key={i}
          className={`${compact ? 'px-2 py-1' : 'px-3 py-1.5'} text-center font-mono`}
          style={{ color: c > 0 ? 'var(--text-main)' : 'var(--text-faint)' }}
        >
          {c}
        </td>
      ))}
    </tr>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  const allEntries = analysis
    ? [...analysis.seedFrequency, ...analysis.related]
    : [];

  return (
    <div
      className={`${compact ? 'rounded-xl' : 'rounded-2xl'}`}
      style={{
        backgroundColor: 'var(--bg-card-solid)',
        boxShadow:
          '0 0 0 1px var(--border-outer), inset 0 1px 0 0 var(--inner-highlight)',
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(234, 179, 8, 0.18) 0%, rgba(249, 115, 22, 0.14) 100%)',
              color: 'var(--accent-gold)',
              boxShadow: '0 0 0 1px rgba(234, 179, 8, 0.3)',
            }}
          >
            <Clover className="w-3.5 h-3.5" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <h4
              className={`${compact ? 'text-xs' : 'text-sm'} font-display font-bold truncate`}
              style={{ color: 'var(--text-main)' }}
            >
              Con số may mắn
            </h4>
            {h2hLabel && (
              <p
                className="text-[13px] font-mono truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {h2hLabel}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="pressable w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-muted)',
            boxShadow: '0 0 0 1px var(--border-subtle)',
          }}
          title="Tải lại"
        >
          <RefreshCw
            className={`w-3 h-3 ${loading ? 'animate-spin-smooth' : ''}`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Body */}
      <div className={compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}>
        {loading && !analysis && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2
              className="w-4 h-4 animate-spin-smooth"
              strokeWidth={1.6}
              style={{ color: 'var(--accent-primary)' }}
            />
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Đang phân tích XSMB...
            </span>
          </div>
        )}

        {error && (
          <p
            className="text-xs py-2 text-center"
            style={{ color: 'var(--accent-tertiary)' }}
          >
            {error}
          </p>
        )}

        {analysis && (
          <div className="space-y-3">
            {/* Seed pair display */}
            <div className="flex items-center justify-center gap-3">
              {analysis.seedPair.map((n, i) => (
                <div
                  key={i}
                  className="relative flex items-center justify-center"
                  style={{ width: compact ? 48 : 56, height: compact ? 48 : 56 }}
                >
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(145deg, rgba(234, 179, 8, 0.22) 0%, rgba(249, 115, 22, 0.12) 100%)',
                      boxShadow:
                        '0 0 0 1.5px rgba(234, 179, 8, 0.35), 0 4px 12px -4px rgba(234, 179, 8, 0.2)',
                    }}
                  />
                  <span
                    className={`relative ${compact ? 'text-lg' : 'text-xl'} font-display font-black`}
                    style={{ color: 'var(--accent-gold)' }}
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <TrendingUp
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  style={{ color: 'var(--text-faint)' }}
                />
                <span
                  className="text-[13px] font-mono"
                  style={{ color: 'var(--text-faint)' }}
                >
                  H2H seed
                </span>
              </div>
            </div>

            {/* Seed hit summary */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { label: '7 ngày', hit: analysis.seedHit1w },
                { label: '14 ngày', hit: analysis.seedHit2w },
                { label: '30 ngày', hit: analysis.seedHit1m },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-mono"
                  style={{
                    backgroundColor: item.hit
                      ? 'var(--accent-primary-soft)'
                      : 'var(--bg-card)',
                    color: item.hit
                      ? 'var(--accent-primary)'
                      : 'var(--text-faint)',
                    boxShadow: `0 0 0 1px ${item.hit ? 'var(--border-highlight)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: item.hit
                        ? 'var(--accent-primary)'
                        : 'var(--text-faint)',
                    }}
                  />
                  {item.label}: {item.hit ? 'Có' : 'Không'}
                </span>
              ))}
            </div>

            {/* Frequency table */}
            <div>
              <p
                className="text-[13px] font-mono uppercase tracking-[0.12em] mb-1.5 px-0.5"
                style={{ color: 'var(--text-faint)' }}
              >
                Bảng tần suất xuất hiện — XSMB 2 số cuối
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ boxShadow: '0 0 0 1px var(--border-subtle)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--table-head-bg)' }}>
                        <th
                          className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} text-center font-mono font-semibold whitespace-nowrap`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Số
                        </th>
                        {COL_HEADERS.map((h) => (
                          <th
                            key={h}
                            className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} text-center font-mono font-semibold whitespace-nowrap`}
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.seedFrequency.map((f) => (
                        <FreqRow key={`s-${f.number}`} entry={f} highlight />
                      ))}
                      {analysis.related.map((f) => (
                        <FreqRow key={`r-${f.number}`} entry={f} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table footnotes */}
                <div
                  className={`${compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'} border-t space-y-0.5`}
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
                >
                  <p className="text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    Tần suất xuất hiện = số lần con số xuất hiện trong kết quả XSMB (2 số cuối các giải).
                  </p>
                  <p className="text-[13px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    Các mốc thời gian được tính ngược từ ngày bạn mở trang web ({new Date().toLocaleDateString('vi-VN')}).
                  </p>
                </div>
              </div>
            </div>

            {/* Frequency chart */}
            <FrequencyChart
              entries={allEntries}
              seedCount={analysis.seedFrequency.length}
              compact={compact}
            />

            {/* Data range footer */}
            <p
              className="text-[13px] font-mono text-center"
              style={{ color: 'var(--text-faint)' }}
            >
              Dữ liệu XSMB: {analysis.dataFrom} → {analysis.dataTo} ({analysis.totalDays} ngày)
              {' · '}Chỉ mang tính chất tham khảo
            </p>
          </div>
        )}

        {onAsk && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = question.trim();
              if (!q) return;
              onAsk(q);
              setQuestion('');
            }}
            className="mt-3 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Hỏi thêm về con số may mắn..."
              maxLength={300}
              className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                boxShadow: '0 0 0 1px var(--border-highlight)',
              }}
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className="pressable px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-primary-ink)',
              }}
            >
              Hỏi
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
