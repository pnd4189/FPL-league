import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type RankTone = 'primary' | 'secondary' | 'tertiary' | 'gold' | 'muted';

const TONE_COLOR: Record<RankTone, string> = {
  primary: 'var(--accent-primary)',
  secondary: 'var(--accent-secondary)',
  tertiary: 'var(--accent-tertiary)',
  gold: 'var(--accent-gold)',
  muted: 'var(--text-muted)',
};

const TINT: Record<'gold' | 'primary' | 'secondary', string> = {
  gold: 'var(--accent-gold-soft)',
  primary: 'var(--accent-primary-soft)',
  secondary: 'var(--accent-secondary-soft)',
};

export interface RankStat {
  label: string;
  value: React.ReactNode;
  tone?: RankTone;
}

interface RankCardProps {
  rank: number | string;
  /** Tints the whole card, for the leader or the prize winner. */
  highlight?: keyof typeof TINT;
  avatar: React.ReactNode;
  name: string;
  team: string;
  /** The one number the ranking is about, shown large on the right. */
  primary: React.ReactNode;
  primaryUnit?: string;
  primaryTone?: RankTone;
  /** Small labelled values under the name; they wrap instead of scrolling sideways. */
  stats?: RankStat[];
  /** Extra detail revealed on tap. Without it, a tap opens the manager profile. */
  detail?: React.ReactNode;
  onOpen: () => void;
}

const rankColor = (rank: number | string): string => {
  const n = Number(rank);
  if (n === 1) return 'var(--accent-gold)';
  if (n === 2) return 'var(--accent-silver)';
  if (n === 3) return 'var(--accent-bronze)';
  return 'var(--text-muted)';
};

/**
 * One manager in a ranking, for phone widths. The wide tables push the numbers that matter off to the
 * right of the screen; here the rank, the name and the key number always fit side by side.
 */
export const RankCard: React.FC<RankCardProps> = ({
  rank,
  highlight,
  avatar,
  name,
  team,
  primary,
  primaryUnit,
  primaryTone = 'primary',
  stats,
  detail,
  onOpen,
}) => {
  const [open, setOpen] = useState(false);
  const toggle = () => (detail ? setOpen((v) => !v) : onOpen());
  const top3 = Number(rank) >= 1 && Number(rank) <= 3;

  return (
    <div
      className="rounded-2xl"
      style={{
        backgroundColor: highlight ? TINT[highlight] : 'var(--bg-card-solid)',
        boxShadow: '0 0 0 1px var(--border-subtle), inset 0 1px 0 0 var(--inner-highlight)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={detail ? open : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className="pressable flex items-center gap-3 px-3.5 pt-3 pb-2.5 cursor-pointer select-none"
      >
        <span
          className="w-7 flex-shrink-0 text-center font-mono font-bold text-[16px] tabular-nums"
          style={{ color: rankColor(rank) }}
        >
          {top3 ? rank : String(rank).padStart(2, '0')}
        </span>
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[16px] leading-tight truncate" style={{ color: 'var(--text-main)' }}>
            {name}
          </p>
          <p className="text-[13px] leading-snug truncate" style={{ color: 'var(--text-muted)' }}>
            {team}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="font-mono font-bold text-[24px] leading-none tabular-nums"
            style={{ color: TONE_COLOR[primaryTone] }}
          >
            {primary}
          </p>
          {primaryUnit && (
            <p className="mt-1 text-[12px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              {primaryUnit}
            </p>
          )}
        </div>
        {detail && (
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-300 ease-fluid"
            strokeWidth={1.8}
            style={{ color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-mono tabular-nums"
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: '0 0 0 1px var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {s.label}
              <b className="font-bold" style={{ color: s.tone && s.tone !== 'muted' ? TONE_COLOR[s.tone] : 'var(--text-main)' }}>
                {s.value}
              </b>
            </span>
          ))}
        </div>
      )}

      {detail && open && (
        <div className="rank-detail px-3.5 pb-3.5 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {detail}
          <button
            type="button"
            onClick={onOpen}
            className="pressable w-full rounded-full py-2 text-[14px] font-semibold"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              boxShadow: '0 0 0 1px var(--border-outer)',
            }}
          >
            Xem hồ sơ {name}
          </button>
        </div>
      )}
    </div>
  );
};

/** Phone-only list of cards; the table it replaces stays for wider screens. */
export const RankCardList: React.FC<{ children: React.ReactNode; caption?: string; padded?: boolean }> = ({
  children,
  caption,
  padded = true,
}) => (
  <div className={padded ? 'md:hidden p-2.5' : 'md:hidden'}>
    {caption && (
      <p className={`${padded ? 'px-2' : 'px-1'} pb-2.5 text-[13px] font-mono`} style={{ color: 'var(--text-muted)' }}>
        {caption}
      </p>
    )}
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);

/** A small block of labelled numbers inside a card's detail. */
export const DetailGrid: React.FC<{ items: { label: string; value: React.ReactNode; tone?: RankTone }[]; columns?: number }> = ({
  items,
  columns = 4,
}) => (
  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map((it) => (
      <div
        key={it.label}
        className="rounded-xl px-1.5 py-1.5 text-center"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 0 0 1px var(--border-subtle)' }}
      >
        <p className="text-[11px] font-mono uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
          {it.label}
        </p>
        <p className="font-mono font-bold text-[15px] tabular-nums" style={{ color: it.tone ? TONE_COLOR[it.tone] : 'var(--text-main)' }}>
          {it.value}
        </p>
      </div>
    ))}
  </div>
);
