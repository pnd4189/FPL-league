/**
 * AutoSubs.gs — FPL automatic substitutions, applied locally
 * HTCV FPL 2026-2027
 *
 * FPL only applies automatic substitutions (and hands the armband to the vice
 * captain) 1-2 hours after the last match of a gameweek. The live scores apply
 * the same rules as soon as every match has finished, so the standings settle
 * at the final whistle; once FPL publishes its own effective lineups, those
 * replace this provisional result.
 *
 * Pure logic with no FPL or spreadsheet access, so it can be replayed against
 * past gameweeks.
 */

/**
 * Apply FPL's automatic substitution and vice-captain rules to a lineup.
 *
 *   - A starter who did not play is replaced by the first bench player, in
 *     bench order, who played and keeps the formation legal (at least 3
 *     defenders and 1 forward). The goalkeeper is only replaced by the bench
 *     goalkeeper.
 *   - If the captain did not play, the vice captain takes the captain's
 *     multiplier; if neither played, nobody does.
 *   - Bench Boost scores all 15 players, so nobody is substituted.
 *
 * @param {Array<{el: number, slot: number, pos: number, cap: boolean, vice: boolean}>} picks
 *   the manager's 15 picks: slots 1-11 start, 12 is the bench goalkeeper and
 *   13-15 the outfield bench in priority order
 * @param {function(number): boolean} played element id → appeared in the gameweek
 * @param {string} chip active chip ("bboost", "3xc", ...) or ""
 * @return {{picks: Array<Object>, subs: Array<{in: number, out: number}>}}
 *   copies of the picks with their effective slot and multiplier (`mult`),
 *   plus the substitutions in the order they were made
 */
function applyAutoSubs_(picks, played, chip) {
  const lineup = picks.map(function (pick) { return Object.assign({}, pick); });
  const benchBoost = chip === "bboost";
  const subs = [];

  if (!benchBoost) {
    const bySlot = function (a, b) { return a.slot - b.slot; };
    const starters = lineup.filter(function (p) { return p.slot <= 11; }).sort(bySlot);
    const bench = lineup.filter(function (p) { return p.slot > 11; }).sort(bySlot);
    const used = {};

    for (const out of starters.slice()) {
      if (played(out.el)) continue;
      for (const sub of bench) {
        if (used[sub.el] || !played(sub.el)) continue;
        if ((out.pos === 1) !== (sub.pos === 1)) continue;
        if (!formationHolds_(starters, out, sub)) continue;

        const slot = out.slot;
        out.slot = sub.slot;
        sub.slot = slot;
        used[sub.el] = true;
        starters[starters.indexOf(out)] = sub;
        subs.push({ in: sub.el, out: out.el });
        break;
      }
    }
  }

  // Multipliers follow the effective lineup, so a lineup FPL has already
  // substituted comes out unchanged.
  for (const pick of lineup) pick.mult = benchBoost || pick.slot <= 11 ? 1 : 0;
  const captainMult = chip === "3xc" ? 3 : 2;
  const captain = lineup.filter(function (p) { return p.cap; })[0];
  const vice = lineup.filter(function (p) { return p.vice; })[0];
  if (captain && played(captain.el)) captain.mult = captainMult;
  else if (vice && vice.mult > 0 && played(vice.el)) vice.mult = captainMult;

  lineup.sort(function (a, b) { return a.slot - b.slot; });
  return { picks: lineup, subs: subs };
}

/** Whether swapping `out` for `sub` keeps at least 3 defenders and 1 forward. */
function formationHolds_(starters, out, sub) {
  let defenders = 0;
  let forwards = 0;
  for (const pick of starters) {
    const pos = pick === out ? sub.pos : pick.pos;
    if (pos === 2) defenders++;
    else if (pos === 4) forwards++;
  }
  return defenders >= 3 && forwards >= 1;
}
