import numpy as np, pandas as pd
from pipeline import config
from pipeline.issues import prepare_complaints, open_issues
from pipeline.roads import road_table
from pipeline.index import road_factors, road_score, score_issues, severity_by_type
from pipeline.backtest import _outcomes, _rank_corr, _precision_at_k
from pipeline.budget import with_cost_ratio
from pipeline.data import load

sets = {
 "A current":        dict(severity=.30, flood=.25, history=.15, traffic=.10, accidents=.10, facilities=.10),
 "B equal":          dict(severity=1/6, flood=1/6, history=1/6, traffic=1/6, accidents=1/6, facilities=1/6),
 "C likelihood-led": dict(severity=.25, flood=.30, history=.25, traffic=.07, accidents=.07, facilities=.06),
 "D severity-led":   dict(severity=.45, flood=.15, history=.10, traffic=.10, accidents=.10, facilities=.10),
 "E brief-literal":  dict(severity=.20, flood=.20, history=.00, traffic=.20, accidents=.20, facilities=.20),
 "F no impact":      dict(severity=.40, flood=.35, history=.25, traffic=0, accidents=0, facilities=0),
}
c = prepare_complaints(); issues = open_issues(c)
roads_b = road_table(c, as_of=config.BACKTEST_CUTOFF); fb = road_factors(roads_b); out = _outcomes(roads_b, c)
roads = road_table(c); f = road_factors(roads)
sev = severity_by_type(with_cost_ratio(load("work_orders"), load("rate_card")))
base = score_issues(issues, f, roads, sev, sets["A current"])
top = lambda s: {w:set(g.nsmallest(3,"rank_in_ward").issue_id) for w,g in s.groupby("ward_code")}
bt = top(base)
rows=[]
for name,w in sets.items():
    use=[k for k in ("flood","history","traffic","accidents","facilities") if w[k]>0]
    rs = road_score(fb, w, use=tuple(use))
    r = {"set":name}
    for lab,col in [("WO","wo"),("complaints","cmp"),("spend","spend")]:
        city,inw=_rank_corr(rs,out[col],roads_b.ward_code); r[f"{lab} city"]=round(city,3); r[f"{lab} in-ward"]=round(inw,3)
    r["P@3"]=round(_precision_at_k(rs,out.wo,roads_b.ward_code),2)
    s = score_issues(issues, f, roads, sev, w); t = top(s)
    r["top3 overlap vs A"]=round(np.mean([len(t[k]&bt[k])/len(t[k]|bt[k]) for k in bt]),2)
    r["share cave-in/manhole in top3"]=round(s[s.rank_in_ward<=3].work_type.isin(["Road cave-in","Open or broken manhole"]).mean(),2)
    r["share potholes in top3"]=round(s[s.rank_in_ward<=3].work_type.eq("Pothole").mean(),2)
    rows.append(r)
pd.set_option("display.width",250); pd.set_option("display.max_columns",20)
print(pd.DataFrame(rows).set_index("set").to_string())
print("\nissue mix overall:", issues.work_type.value_counts(normalize=True).round(2).to_dict())
print("severity:", sev.round(2).to_dict())
# how much does each factor vary across issues (spread of weighted contribution under A)
print("\nstd of weighted contribution (A):", {k: round(float(base[f'contrib_{k}'].std()),3) for k in ["severity","flood","history","traffic","accidents","facilities"]})
print("share of issues with zero accidents:", round((base.accidents==0).mean(),2), "| zero facilities:", round((base.facilities==0).mean(),2))
