"""Fit the final per-position coefficients on 2023-24 + 2024-25, then test them on the current season's
finished gameweeks 5+ (never used in fitting). Needs fit_model.py and the season CSVs beside it."""
import sys; sys.path.insert(0, ".")
import json, collections, statistics as st, urllib.request
import fit_model as F
from fit_model import SEASONS, samples, evaluate, corr

_base = F.feats
def feats_p(s): return _base(s) + [s['val'], s['val'] * (3 - s['fdr'])]
F.feats = feats_p
data = {s: samples(s) for s in SEASONS}
final = [r for s in ['2023-24', '2024-25'] for r in data[s]]
coef = {p: F.fit([r for r in final if r['pos'] == p]) for p in (1, 2, 3, 4)}
json.dump({str(p): [round(c, 5) for c in coef[p]] for p in coef}, open('final_coef_price.json', 'w'))
names = ['const','ppg','form','xgi90','minShare','(3-fdr)','home','ppg*(3-fdr)','ppg*home','price','price*(3-fdr)']
for p in (1, 2, 3, 4): print('pos', p, {n: round(v, 4) for n, v in zip(names, coef[p])})

# ---- fresh out-of-sample test: this season (2026-27) GW5-8, never seen in fitting
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request('https://fantasy.premierleague.com/api/' + u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60))
boot = get('bootstrap-static/')
LAST = sum(1 for e in boot['events'] if e['finished'])   # finished gameweeks so far
fixtures = get('fixtures/')
live = {g: {e['id']: e['stats'] for e in get(f'event/{g}/live/')['elements']} for g in range(1, LAST + 1)}
pos = {p['id']: p['element_type'] for p in boot['elements']}
price = {p['id']: p['now_cost'] / 10 for p in boot['elements']}
team = {p['id']: p['team'] for p in boot['elements']}
fx = collections.defaultdict(list)
for f in fixtures:
    if f['event'] and f['event'] <= LAST:
        fx[(f['team_h'], f['event'])].append((f['team_h_difficulty'], 1))
        fx[(f['team_a'], f['event'])].append((f['team_a_difficulty'], 0))
rows = []
for pid in pos:
    for g in range(5, LAST + 1):
        fl = fx.get((team[pid], g), [])
        if len(fl) != 1 or pid not in live[g]: continue
        prior = range(1, g)
        st_ = [live[k].get(pid) for k in prior]
        pts = [(s['total_points'] if s else 0) for s in st_]
        mins = sum((s['minutes'] if s else 0) for s in st_)
        apps = sum(1 for s in st_ if s and s['minutes'] > 0)
        if apps < 3 or mins == 0: continue
        xg = sum(float(s.get('expected_goal_involvements') or 0) for s in st_ if s)
        rows.append(dict(season='2026-27', g=g, pos=pos[pid], y=live[g][pid]['total_points'], ppg=sum(pts) / apps, form=sum(pts[-3:]) / 3,
                         xgi=xg / mins * 90, ms=mins / (90 * (g - 1)), fdr=fl[0][0], home=fl[0][1], val=price[pid]))
reg = [r for r in rows if r['ms'] >= 0.5 and r['pos'] >= 3]
print(f'\nthis season GW5-{LAST}: regular MID/FWD samples', len(reg), '| xGI>0 share', round(sum(1 for r in reg if r['xgi'] > 0) / len(reg), 2))
base = lambda r: 0.5 * r['ppg'] + 0.5 * r['form']
preds = {'A form (= FPL ep_next now)': lambda r: r['form'], 'B season ppg': lambda r: r['ppg'], 'C blend 50/50': base,
         'E fitted + price': lambda r: sum(c * x for c, x in zip(coef[r['pos']], feats_p(r)))}
res = evaluate(reg, preds)
print(f"{'predictor':30}{'corr':>7}{'RMSE':>7}{'top1':>7}{'top3':>7}{'top10':>7}{'haul%':>7}")
for n, m in res.items(): print(f"{n:30}{m['r']:7.3f}{m['rmse']:7.2f}{m['top1']:7.2f}{m['top3']:7.2f}{m['top10']:7.2f}{100*m['haul10']:7.1f}")
