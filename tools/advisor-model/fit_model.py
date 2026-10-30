"""Walk-forward backtest of next-gameweek point predictors on past seasons (pure python, no deps).

Data: github.com/vaastav/Fantasy-Premier-League, data/<season>/{gws/merged_gw.csv,fixtures.csv} for
2022-23, 2023-24, 2024-25, saved into <season>/ next to this script. Run: python3 fit_model.py
Features (all computable from the live FPL bootstrap): ppg = points / appearances, form = points of
the last 3 gameweeks / 3 (identical to FPL's `form`), xgi90, minutes share, fixture difficulty,
venue, price. The coefficients printed by validate_model.py go into ADVISOR_XP_COEF.
"""
import csv, collections, statistics as st, sys, json

SEASONS = ['2022-23', '2023-24', '2024-25']
POS = {'GK': 1, 'GKP': 1, 'DEF': 2, 'MID': 3, 'AM': 3, 'FWD': 4}


def load(season):
    fx = {}
    for r in csv.DictReader(open(f'{season}/fixtures.csv', encoding='utf-8')):
        if r['id']:
            fx[int(r['id'])] = (int(r['team_h_difficulty'] or 3), int(r['team_a_difficulty'] or 3))
    per = collections.defaultdict(dict)
    pos = {}
    for r in csv.DictReader(open(f'{season}/merged_gw.csv', encoding='utf-8', errors='replace')):
        e, g = int(r['element']), int(r['GW'])
        d = per[e].setdefault(g, {'pts': 0, 'min': 0, 'xgi': 0.0, 'n': 0, 'home': 0, 'fdr': 3, 'val': 5.0})
        d['pts'] += int(r['total_points'])
        d['min'] += int(r['minutes'])
        d['xgi'] += float(r['expected_goal_involvements'] or 0)
        d['n'] += 1
        d['val'] = int(r['value'] or 50) / 10
        home = r['was_home'] == 'True'
        d['home'] = 1 if home else 0
        f = fx.get(int(r['fixture'])) if r['fixture'] else None
        d['fdr'] = (f[0] if home else f[1]) if f else 3
        pos[e] = POS.get(r['position'], 0)
    return per, pos


def samples(season):
    per, pos = load(season)
    out = []
    for e, gs in per.items():
        for g, d in gs.items():
            if g < 5 or d['n'] != 1:          # single-fixture target gameweeks only
                continue
            prior = range(1, g)
            pts = [gs[k]['pts'] if k in gs else 0 for k in prior]
            mins = sum(gs[k]['min'] for k in prior if k in gs)
            apps = sum(1 for k in prior if k in gs and gs[k]['min'] > 0)
            if apps < 3:
                continue
            out.append(dict(
                season=season, e=e, g=g, pos=pos[e], y=d['pts'], played=d['min'] > 0,
                ppg=sum(pts) / apps,                       # season points per appearance
                form=sum(pts[-3:]) / 3,                    # == FPL `form`: last 3 gameweeks / 3
                xgi=sum(gs[k]['xgi'] for k in prior if k in gs) / mins * 90 if mins else 0.0,
                ms=mins / (90 * (g - 1)),                  # share of possible minutes played
                fdr=d['fdr'], home=d['home'], val=d['val']))
    return out


def feats(s):
    a = 3 - s['fdr']
    return [1.0, s['ppg'], s['form'], s['xgi'], s['ms'], a, s['home'], s['ppg'] * a, s['ppg'] * s['home']]


def solve(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]
                for c in range(i, n + 1):
                    M[r][c] -= f * M[i][c]
    return [M[i][n] / M[i][i] for i in range(n)]


def fit(rows, ridge=1e-3):
    k = len(feats(rows[0]))
    XtX = [[0.0] * k for _ in range(k)]
    Xty = [0.0] * k
    for s in rows:
        x = feats(s)
        for i in range(k):
            Xty[i] += x[i] * s['y']
            for j in range(k):
                XtX[i][j] += x[i] * x[j]
    for i in range(1, k):
        XtX[i][i] += ridge * len(rows)
    return solve(XtX, Xty)


def corr(a, b):
    ma, mb = st.mean(a), st.mean(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (
        sum((x - ma) ** 2 for x in a) ** .5 * sum((y - mb) ** 2 for y in b) ** .5)


def evaluate(test, predictors):
    """test: regular MID/FWD samples. Returns metrics per predictor."""
    res = {}
    for name, fn in predictors.items():
        preds = [fn(s) for s in test]
        ys = [s['y'] for s in test]
        rmse = (sum((p - y) ** 2 for p, y in zip(preds, ys)) / len(ys)) ** .5
        by_gw = collections.defaultdict(list)
        for s, p in zip(test, preds):
            by_gw[(s['season'], s['g'])].append((p, s['y']))
        top1, top3, top10, haul10 = [], [], [], []
        for lst in by_gw.values():
            lst.sort(key=lambda t: -t[0])
            top1.append(lst[0][1])
            top3.append(st.mean(y for _, y in lst[:3]))
            top10.append(st.mean(y for _, y in lst[:10]))
            haul10.append(sum(1 for _, y in lst[:10] if y >= 8) / 10)
        res[name] = dict(r=corr(preds, ys), rmse=rmse, top1=st.mean(top1), top3=st.mean(top3),
                         top10=st.mean(top10), haul10=st.mean(haul10), n=len(ys), gws=len(by_gw))
    return res


def show(title, res):
    print(f'\n== {title}')
    print(f"{'predictor':34}{'corr':>7}{'RMSE':>7}{'top1':>7}{'top3':>7}{'top10':>7}{'haul%top10':>11}")
    for n, m in res.items():
        print(f"{n:34}{m['r']:7.3f}{m['rmse']:7.2f}{m['top1']:7.2f}{m['top3']:7.2f}{m['top10']:7.2f}{100*m['haul10']:10.1f}%")


if __name__ == '__main__':
    data = {s: samples(s) for s in SEASONS}
    for s in SEASONS:
        xgi_cov = sum(1 for r in data[s] if r['xgi'] > 0) / len(data[s])
        print(s, 'samples', len(data[s]), f'| share with xGI>0: {100*xgi_cov:.0f}%')
    regular = lambda r: r['ms'] >= 0.5 and r['pos'] >= 3
    allsamples = [r for s in SEASONS for r in data[s]]

    # Empirical fixture effect among regular MID/FWD (all seasons), relative to the blended baseline
    base = lambda r: 0.5 * r['ppg'] + 0.5 * r['form']
    reg = [r for r in allsamples if regular(r)]
    print('\nEmpirical effect (regular MID/FWD, actual pts / blended baseline), n =', len(reg))
    for fdr in (2, 3, 4, 5):
        g = [r for r in reg if r['fdr'] == fdr]
        if g: print(f'  FDR {fdr}: ratio {sum(r["y"] for r in g)/sum(base(r) for r in g):.3f}  n={len(g)}')
    for h in (1, 0):
        g = [r for r in reg if r['home'] == h]
        print(f'  {"home" if h else "away"}: ratio {sum(r["y"] for r in g)/sum(base(r) for r in g):.3f}  n={len(g)}')

    folds = [(['2022-23', '2023-24'], '2024-25'), (['2022-23', '2024-25'], '2023-24'), (['2023-24', '2024-25'], '2022-23')]
    agg = collections.defaultdict(lambda: collections.defaultdict(list))
    for train_s, test_s in folds:
        train = [r for s in train_s for r in data[s]]
        models = {p: fit([r for r in train if r['pos'] == p]) for p in (1, 2, 3, 4)}
        predictors = {
            'A form (3GW, = FPL form/ep_next)': lambda r: r['form'],
            'B season ppg': lambda r: r['ppg'],
            'C blend 50/50': base,
            'D blend x fixture (k.20,h.10)': lambda r: base(r) * max(0.2, 1 + .2 * (3 - r['fdr']) + .1 * r['home']),
            'E fitted regression (per position)': lambda r: sum(c * x for c, x in zip(models[r['pos']], feats(r))),
        }
        test = [r for r in data[test_s] if regular(r)]
        res = evaluate(test, predictors)
        show(f'train {train_s} -> test {test_s} (regular MID/FWD, n={len(test)}, GWs={res[next(iter(res))]["gws"]})', res)
        for n, m in res.items():
            for k, v in m.items():
                agg[n][k].append(v)
        if test_s == '2024-25':
            json.dump({str(p): models[p] for p in models}, open('coef_train_2223_2324.json', 'w'))
    print('\n== AVERAGE over 3 folds')
    print(f"{'predictor':34}{'corr':>7}{'RMSE':>7}{'top1':>7}{'top3':>7}{'top10':>7}{'haul%top10':>11}")
    for n, m in agg.items():
        print(f"{n:34}{st.mean(m['r']):7.3f}{st.mean(m['rmse']):7.2f}{st.mean(m['top1']):7.2f}{st.mean(m['top3']):7.2f}{st.mean(m['top10']):7.2f}{100*st.mean(m['haul10']):10.1f}%")
    # coefficients fitted on all three seasons, for inspection
    names = ['const', 'ppg', 'form', 'xgi90', 'minShare', '(3-fdr)', 'home', 'ppg*(3-fdr)', 'ppg*home']
    for p in (2, 3, 4):
        c = fit([r for r in allsamples if r['pos'] == p])
        print(f'\nall-seasons fit, position {p}:', {n: round(v, 3) for n, v in zip(names, c)})
