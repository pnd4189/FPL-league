"""Calibrate transfer gains: when the model says a swap adds D expected points over 5 gameweeks, how many did it add?

Walk-forward on the three season folders next to this script (see fit_model.py): coefficients are fitted on two
seasons and the swaps are generated on the third. A swap sells a below-average regular and buys the best predicted
player in the same price band, as suggestTransfers_ does. The two tables it prints are the evidence behind
FREE_MIN_GAIN, WORTH_GAIN, DEAD_EP5 and DEAD_BUYER_MIN in apps-script/PlanLogic.gs:
  - swaps of a player who still plays realize ~4.7 points over 5 gameweeks whatever the predicted gain (slope ~0.5),
    about the price of one -4 hit;
  - when the seller will not play, the swap realizes the buyer's own points (15-20, above 4 in 92% of cases).
Run: python3 calibrate_transfers.py
"""
import sys; sys.path.insert(0, ".")
import statistics as st, random, collections
import fit_model as F

_base = F.feats
def feats_p(s): return _base(s) + [s['val'], s['val'] * (3 - s['fdr'])]
F.feats = feats_p
SEASONS = ['2022-23', '2023-24', '2024-25']
data = {s: F.load(s) for s in SEASONS}          # (per, pos)
samples = {s: F.samples(s) for s in SEASONS}
random.seed(7)

def features_at(per_e, g):
    """Features of one player using only gameweeks before g (same definitions as F.samples)."""
    prior = range(1, g)
    pts = [per_e[k]['pts'] if k in per_e else 0 for k in prior]
    mins = sum(per_e[k]['min'] for k in prior if k in per_e)
    apps = sum(1 for k in prior if k in per_e and per_e[k]['min'] > 0)
    if apps < 3 or mins < 0.5 * 90 * (g - 1): return None
    xgi = sum(per_e[k]['xgi'] for k in prior if k in per_e) / mins * 90 if mins else 0.0
    xgi = min(xgi, 1.5) if mins >= 180 else 0.0
    last = per_e.get(g - 1)
    if not last or last['min'] < 60: return None           # proxy for "fit and starting" (status a, chance >= 75)
    val = per_e[g]['val'] if g in per_e else last['val']
    return dict(ppg=sum(pts) / apps, form=sum(pts[-3:]) / 3, xgi=xgi, ms=min(1, mins / (90 * (g - 1))), val=val)

def predict5(model, base, per_e, g):
    total = 0.0
    for k in range(g, g + 5):
        row = per_e.get(k)
        if not row or row['n'] < 1: continue                # blank gameweek
        s = dict(base, fdr=row['fdr'], home=row['home'])
        total += max(0.0, sum(c * x for c, x in zip(model, feats_p(s))))
    return total

def actual5(per_e, g):
    return sum(per_e[k]['pts'] for k in range(g, g + 5) if k in per_e)

pairs = []   # (D, R, season, pred_in, actual_in)
buys = []
for test in SEASONS:
    train = [r for s in SEASONS if s != test for r in samples[s]]
    models = {p: F.fit([r for r in train if r['pos'] == p]) for p in (2, 3, 4)}
    per, pos = data[test]
    last_gw = max(max(gs) for gs in per.values())
    for g in range(6, last_gw - 4):
        for p in (2, 3, 4):
            pool = []
            for e, gs in per.items():
                if pos[e] != p or g not in gs: continue
                b = features_at(gs, g)
                if not b: continue
                pool.append((e, b, predict5(models[p], b, gs, g), actual5(gs, g)))
            if len(pool) < 40: continue
            pool.sort(key=lambda x: x[2])
            lo, hi = int(len(pool) * 0.15), int(len(pool) * 0.60)     # sellers: below-average starters, the ones a manager looks to replace
            for out in random.sample(pool[lo:hi], min(12, hi - lo)):
                cands = [c for c in pool if c[0] != out[0] and c[1]['val'] <= out[1]['val'] + 1]    # same price band (bank ~0.1m)
                if not cands: continue
                best = max(cands, key=lambda c: c[2])                  # the tool buys the best predicted affordable player
                pairs.append((best[2] - out[2], best[3] - out[3], test, best[2], best[3]))
                buys.append((best[2], best[3], test))

print('swaps simulated:', len(pairs), '| by season:', dict(collections.Counter(p[2] for p in pairs)))
bins = [(-99, 0), (0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 14), (14, 99)]
print(f"\n{'predicted gain D':>18} {'n':>6} {'mean realized':>14} {'median':>8} {'P(realized>4)':>14} {'P(realized>0)':>14}")
for lo, hi in bins:
    r = [p[1] for p in pairs if lo <= p[0] < hi]
    if not r: continue
    print(f"{f'[{lo},{hi})':>18} {len(r):>6} {st.mean(r):>14.2f} {st.median(r):>8.1f} {sum(1 for x in r if x > 4)/len(r):>14.2f} {sum(1 for x in r if x > 0)/len(r):>14.2f}")
D = [p[0] for p in pairs]; R = [p[1] for p in pairs]
beta = sum(d * r for d, r in zip(D, R)) / sum(d * d for d in D)
print(f"\nslope of realized on predicted (through the origin): {beta:.2f}  (1.0 would mean the model is calibrated)")
for s in SEASONS:
    sub = [p for p in pairs if p[2] == s and p[0] >= 6]
    print(f"  {s}: swaps with D>=6: n={len(sub)} mean realized {st.mean(x[1] for x in sub):.2f}")

print("\n=== seller who will not play (injured): realized gain is the buyer's own points ===")
print(f"{'predicted buyer 5-GW pts':>26} {'n':>6} {'mean actual':>12} {'median':>8} {'P(actual>4)':>12} {'P(actual>8)':>12}")
for lo, hi in [(0, 8), (8, 12), (12, 16), (16, 20), (20, 25), (25, 99)]:
    a = [b[1] for b in buys if lo <= b[0] < hi]
    if not a: continue
    print(f"{f'[{lo},{hi})':>26} {len(a):>6} {st.mean(a):>12.2f} {st.median(a):>8.1f} {sum(1 for x in a if x>4)/len(a):>12.2f} {sum(1 for x in a if x>8)/len(a):>12.2f}")
for sname in SEASONS:
    a = [b[1] for b in buys if b[2] == sname and b[0] >= 16]
    print(f"  {sname}: buyers predicted >=16: n={len(a)} mean actual {st.mean(a):.2f}")
