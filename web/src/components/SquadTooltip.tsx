import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LiveGwData, LiveScore } from '../types';

interface SquadTooltipProps {
  score: LiveScore;
  gw: number;
  children: React.ReactNode;
}

const POS_SHORT = ['', 'GK', 'DEF', 'MID', 'FWD'];
const PANEL_WIDTH = 282;

const isRemaining = (p: { slot: number; mins: number }) => p.slot <= 11 && p.mins === 0;

export const SquadTooltip: React.FC<SquadTooltipProps> = ({ score, gw, children }) => {
  const [isTouch] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches,
  );

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const raf = useRef<number | null>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (raf.current) return;
    const { clientX, clientY } = e;
    raf.current = window.requestAnimationFrame(() => {
      raf.current = null;
      const x = Math.min(clientX + 14, window.innerWidth - PANEL_WIDTH - 8);
      const height = Math.min(440, window.innerHeight - 16);
      const y =
        clientY + 18 + height > window.innerHeight
          ? Math.max(8, window.innerHeight - height - 8)
          : clientY + 18;
      setPos({ x, y });
    });
  }, []);

  const onWrapperClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isTouch) return;
      e.preventDefault();
      e.stopPropagation();
      setSheetOpen((open) => !open);
    },
    [isTouch],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const squad = score.squad || [];
  if (!squad.length) return <>{children}</>;

  const starters = squad.filter((p) => p.slot <= 11);
  const bench = squad.filter((p) => p.slot > 11);
  const remaining = starters.filter(isRemaining);
  const remainingByPos = [1, 2, 3, 4]
    .map((t) => ({ t, n: remaining.filter((p) => p.pos === t).length }))
    .filter((g) => g.n > 0);
  const captain = score.captain;

  const body = (
    <>
      <div
        className="px-3.5 py-2.5 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--table-head-bg)',
        }}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: 'var(--accent-primary)' }}>
            {score.team || score.manager}
          </p>
          <p className="text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>
            GW{gw} · {score.manager}
            {score.chip ? ` · ${score.chip.toUpperCase()}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-base font-bold font-mono tabular-nums leading-none" style={{ color: 'var(--text-main)' }}>
              {score.netPoints}
            </p>
            <p className="text-[12px] font-mono" style={{ color: 'var(--text-faint)' }}>
              pts
            </p>
          </div>
          {isTouch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(false);
              }}
              aria-label="Đóng"
              className="p-1 rounded-full"
              style={{
                backgroundColor: 'var(--bg-card-solid)',
                color: 'var(--text-secondary)',
              }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.6} />
            </button>
          )}
        </div>
      </div>

      <div className="py-1.5 space-y-0.5">
        {[...starters, ...bench].map((p) => {
          const isCap = p.mult >= 2;
          const notPlayed = p.mins === 0;
          return (
            <div
              key={`${p.id}-${p.slot}`}
              className="flex items-center justify-between px-3 py-1 mx-1.5 rounded-lg"
              style={{
                backgroundColor:
                  p.slot <= 11 ? 'var(--accent-primary-soft)' : 'var(--bg-card-solid)',
              }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-[14px] truncate max-w-[150px]"
                  style={{
                    color: p.slot <= 11 ? 'var(--text-main)' : 'var(--text-muted)',
                  }}
                >
                  {p.name}
                </span>
                {p.sub && (
                  <span
                    className="text-[12px] font-bold"
                    title={
                      p.sub === 'in'
                        ? 'Vào sân từ ghế dự bị tự động'
                        : 'Bị thay ra do không thi đấu'
                    }
                    style={{
                      color:
                        p.sub === 'in' ? 'var(--accent-primary)' : 'var(--accent-tertiary)',
                    }}
                  >
                    {p.sub === 'in' ? '▲' : '▼'}
                  </span>
                )}
                {isCap && (
                  <span
                    className="text-[12px] font-bold font-mono px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--accent-tertiary)',
                      color: '#ffffff',
                    }}
                  >
                    {p.mult === 3 ? 'TC' : 'C'}
                  </span>
                )}
                {!isCap && p.vice && (
                  <span
                    className="text-[12px] font-bold font-mono px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    VC
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0 tabular-nums">
                <span className="text-[12px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  {p.team}
                </span>
                <span
                  className="text-[14px] font-semibold font-mono w-6 text-right"
                  style={{
                    color: notPlayed
                      ? 'var(--text-faint)'
                      : p.pts > 0
                      ? 'var(--accent-primary)'
                      : p.pts < 0
                      ? 'var(--accent-tertiary)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {p.pts > 0 ? '+' : ''}
                  {p.pts}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="px-3.5 py-2 text-[13px] font-mono leading-relaxed tabular-nums"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--table-head-bg)',
          color: 'var(--text-muted)',
        }}
      >
        {remaining.length > 0 ? (
          <p>
            Còn <span style={{ color: 'var(--accent-primary)' }}>{remaining.length}</span> cầu thủ chưa ra sân (
            {remainingByPos.map((g) => `${g.n} ${POS_SHORT[g.t]}`).join(' + ')})
          </p>
        ) : (
          <p>Đã ra sân đủ 11 cầu thủ đá chính</p>
        )}
        {captain && (
          <p>
            Captain <span style={{ color: 'var(--text-main)' }}>{captain.name}</span>: {captain.pts} × {captain.mult} ={' '}
            <span style={{ color: 'var(--accent-primary)' }}>{captain.pts * captain.mult}</span> pts
          </p>
        )}
      </div>
    </>
  );

  return (
    <span
      className="inline-block"
      onMouseEnter={isTouch ? undefined : onMove}
      onMouseMove={isTouch ? undefined : onMove}
      onMouseLeave={isTouch ? undefined : () => setPos(null)}
      onClick={onWrapperClick}
    >
      {children}

      {!isTouch &&
        pos &&
        createPortal(
          <div
            className="fixed z-50 rounded-2xl overflow-hidden select-none"
            style={{
              left: pos.x,
              top: pos.y,
              width: PANEL_WIDTH,
              backgroundColor: 'var(--bg-card)',
              boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)',
              pointerEvents: 'none',
            }}
          >
            {body}
          </div>,
          document.body,
        )}

      {isTouch &&
        sheetOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50 backdrop-blur-md"
              style={{ backgroundColor: 'var(--bg-overlay)' }}
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(false);
              }}
            />
            <div
              className="fixed z-50 rounded-2xl overflow-y-auto touch-scroll"
              onClick={(e) => e.stopPropagation()}
              style={{
                left: Math.max(8, (window.innerWidth - PANEL_WIDTH - 16) / 2),
                bottom: 16,
                maxHeight: '70dvh',
                width: PANEL_WIDTH + 16,
                backgroundColor: 'var(--bg-card)',
                boxShadow: '0 0 0 1px var(--border-outer), var(--shadow-float)',
              }}
            >
              {body}
            </div>
          </>,
          document.body,
        )}
    </span>
  );
};

export function squadOf(
  live: LiveGwData | null | undefined,
  gw: number,
  managerId: number,
): LiveScore | undefined {
  if (!live || live.gw !== gw) return undefined;
  const row = live.scores.find((s) => s.id === managerId);
  return row && row.squad && row.squad.length ? row : undefined;
}

export const SquadPopupWrap: React.FC<{
  live: LiveGwData | null | undefined;
  gw: number;
  managerId: number;
  children: React.ReactNode;
}> = ({ live, gw, managerId, children }) => {
  const score = squadOf(live, gw, managerId);
  return score ? (
    <SquadTooltip score={score} gw={gw}>
      {children}
    </SquadTooltip>
  ) : (
    <>{children}</>
  );
};
