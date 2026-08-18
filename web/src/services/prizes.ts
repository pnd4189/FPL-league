/**
 * Prize sharing rules.
 *
 * When managers tie on points the pot is split evenly between them, so the
 * backend records every tied name in one cell ("Dũng & Hải") and the amount
 * stays the full pot. Anything reading a winner cell must go through here or
 * it will simply fail to match a shared win.
 */

export const WINNER_SEPARATOR = ' & ';

/** Names recorded in a winner cell, one entry for a solo win. */
export function winnersOf(field: string | undefined): string[] {
  if (!field) return [];
  return field
    .split(WINNER_SEPARATOR)
    .map(name => name.trim())
    .filter(Boolean);
}

export function isWinner(field: string | undefined, manager: string): boolean {
  return winnersOf(field).includes(manager);
}

/** Even split of a pot, rounded down so the payout never exceeds the pot. */
export function shareAmount(pot: number, winnerCount: number): number {
  if (winnerCount <= 0) return 0;
  return Math.floor(pot / winnerCount);
}

/** What one manager takes home from a winner cell; 0 when they did not win. */
export function prizeShare(field: string | undefined, manager: string, pot: number): number {
  const winners = winnersOf(field);
  if (!winners.includes(manager)) return 0;
  return shareAmount(pot, winners.length);
}
