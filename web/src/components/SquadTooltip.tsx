import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { LiveGwData, LiveScore } from '../types';

interface SquadTooltipProps {
  /** The manager's live row carrying the squad. */
  score: LiveScore;
  gw: number;
  /** The element hover/tap attaches to (usually the points cell). */
  children: React.ReactNode;
}

const POS_SHORT = ['', 'GK', 'DEF', 'MID', 'FWD'];
const PANEL_WIDTH = 270;

/** True while the starter has yet to kick off — drives the "Còn X quân" line. */
const isRemaining = (p: { slot: number; mins: number }) => p.slot <= 11 && p.mins === 0;

/**
 * Squad detail popup: starters green, bench grey, captain armband, and a
 * footer counting players still to play — styled after fplgames.com.
 *
 * Two interaction modes picked at mount:
 *   - pointer with hover: a tooltip that follows the cursor through a portal,
 *     pointer-events disabled so it never gets clipped by table scroll
 *     containers and never traps the hover that shows it
 *   - touch devices: no hover exists, so tapping the points opens a
 *     bottom sheet with a backdrop instead (and stops the row's modal click)
 */
export const SquadTooltip: React.FC<SquadTooltipProps> = ({ score, gw, children }) => {
  // Coarse pointers (phones/tablets) have no reliable hover — matchMedia
  // handles hybrid laptops with touchscreens correctly: they report hover.
  const [isTouch] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(hover: none), (pointer: coarse)').matches,
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
      // Prefer showing the panel under the cursor; lift it when out of room.
      const height = Math.min(430, window.innerHeight - 16);
      const y = clientY + 18 + height > window.innerHeight
        ? Math.max(8, window.innerHeight - height - 8)
        : clientY + 18;
      setPos({ x, y });
    });
  }, []);

  // Touch: tap the points to toggle the sheet, and keep the row's own click
  // (manager modal) out of the way.
  const onWrapperClick = useCallback((e: React.MouseEvent) => {
    if (!isTouch) return;
    e.preventDefault();
    e.stopPropagation();
    setSheetOpen(open => !open);
  }, [isTouch]);

  // Escape closes the sheet, matching every other overlay in the app.
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

  const starters = squad.filter(p => p.slot <= 11);
  const bench = squad.filter(p => p.slot > 11);
  const remaining = starters.filter(isRemaining);
  const remainingByPos = [1, 2, 3, 4]
    .map(t => ({ t, n: remaining.filter(p => p.pos === t).length }))
    .filter(g => g.n > 0);
  const captain = score.captain;

  const body = (
    <>
      {/* Header: team + gameweek + running total */}
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1a1a22' }}>
        <div className="min-w-0">
          <p className="text-[12px] font-black truncate" style={{ color: '#00ff87' }}>
            {score.team || score.manager}
          </p>
          <p className="text-[9px] font-mono" style={{ color: '#8b8b96' }}>
            GW{gw} • {score.manager}
            {score.chip ? ` • ${score.chip.toUpperCase()}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-base font-black font-mono leading-none" style={{ color: '#ffffff' }}>
              {score.netPoints}
            </p>
            <p className="text-[8px] font-mono" style={{ color: '#8b8b96' }}>pts</p>
          </div>
          {isTouch && (
            <button
              onClick={(e) => { e.stopPropagation(); setSheetOpen(false); }}
              aria-label="Đóng"
              className="p-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#c8c8d0' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Squad rows: starters then bench, slot order preserved */}
      <div className="py-1">
        {[...starters, ...bench].map(p => {
          const isCap = p.mult >= 2;
          const notPlayed = p.mins === 0;
          return (
            <div key={`${p.id}-${p.slot}`}
              className="flex items-center justify-between px-3 py-[3px] mx-1.5 rounded"
              style={{
                backgroundColor: p.slot <= 11 ? 'rgba(0,255,135,0.09)' : 'rgba(255,255,255,0.05)',
              }}>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] truncate max-w-[150px]"
                  style={{ color: p.slot <= 11 ? '#e8e8ee' : '#9a9aa5' }}>
                  {p.name}
                </span>
                {isCap && (
                  <span className="text-[8px] font-black px-1 rounded"
                    style={{ backgroundColor: '#ff2d55', color: '#fff' }}>
                    {p.mult === 3 ? 'TC' : 'C'}
                  </span>
                )}
                {!isCap && p.vice && (
                  <span className="text-[8px] font-black px-1 rounded"
                    style={{ backgroundColor: '#3d3d48', color: '#c8c8d0' }}>VC</span>
                )}
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[8px] font-mono" style={{ color: '#6d6d78' }}>{p.team}</span>
                <span className="text-[11px] font-bold font-mono w-6 text-right"
                  style={{ color: notPlayed ? '#6d6d78' : p.pts > 0 ? '#00ff87' : p.pts < 0 ? '#ff6b6b' : '#c8c8d0' }}>
                  {p.pts > 0 ? '+' : ''}{p.pts}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer: players yet to play + captain contribution */}
      <div className="px-3 py-2 border-t text-[9px] font-mono leading-relaxed"
        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1a1a22', color: '#8b8b96' }}>
        {remaining.length > 0 ? (
          <p>
            Còn <span style={{ color: '#00ff87' }}>{remaining.length}</span> quân chưa đá
            {' '}({remainingByPos.map(g => `${g.n} ${POS_SHORT[g.t]}`).join(' + ')})
          </p>
        ) : (
          <p>Đã đá đủ 11 quân</p>
        )}
        {captain && (
          <p>
            Captain <span style={{ color: '#e8e8ee' }}>{captain.name}</span>: {captain.pts} × {captain.mult} ={' '}
            <span style={{ color: '#00ff87' }}>{captain.pts * captain.mult}</span> pts
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

      {/* Desktop: cursor-following tooltip */}
      {!isTouch && pos && createPortal(
        <div
          className="fixed z-[120] rounded-xl border shadow-2xl overflow-hidden select-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: PANEL_WIDTH,
            backgroundColor: '#121217',
            borderColor: 'rgba(255,255,255,0.14)',
            pointerEvents: 'none',
          }}
        >
          {body}
        </div>,
        document.body,
      )}

      {/* Touch: bottom sheet with a tap-to-close backdrop */}
      {isTouch && sheetOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[119]"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { e.stopPropagation(); setSheetOpen(false); }}
          />
          <div
            className="fixed z-[120] rounded-t-2xl border shadow-2xl overflow-y-auto touch-scroll"
            onClick={(e) => e.stopPropagation()}
            style={{
              left: Math.max(8, (window.innerWidth - PANEL_WIDTH - 16) / 2),
              bottom: 12,
              maxHeight: '68vh',
              width: PANEL_WIDTH + 16,
              backgroundColor: '#121217',
              borderColor: 'rgba(255,255,255,0.14)',
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


/** A manager's live row when it carries a squad for the given gameweek. */
export function squadOf(
  live: LiveGwData | null | undefined,
  gw: number,
  managerId: number,
): LiveScore | undefined {
  if (!live || live.gw !== gw) return undefined;
  const row = live.scores.find(s => s.id === managerId);
  return row && row.squad && row.squad.length ? row : undefined;
}

/**
 * Wrap any current-gameweek points display with the squad hover popup.
 * Renders the children untouched when no squad data is available (settled
 * gameweeks, pre-season, backend offline).
 */
export const SquadPopupWrap: React.FC<{
  live: LiveGwData | null | undefined;
  gw: number;
  managerId: number;
  children: React.ReactNode;
}> = ({ live, gw, managerId, children }) => {
  const score = squadOf(live, gw, managerId);
  return score ? (
    <SquadTooltip score={score} gw={gw}>{children}</SquadTooltip>
  ) : (
    <>{children}</>
  );
};
