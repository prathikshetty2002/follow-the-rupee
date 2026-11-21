import pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
pd.set_option("display.width",250)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
roads=pd.read_pickle(S+"roads.pkl")
wo=pd.read_csv(D+"work_orders.csv",parse_dates=["assigned_at","work_started_at","completed_at"])
wo["re"]=(wo.reopened_within_30d=="Y").astype(int)
rf=pd.read_csv(D+"rainfall_daily.csv",parse_dates=["date"]); r=rf.pivot(index="date",columns="station",values="rainfall_mm")
r=r.reindex(pd.date_range("2025-05-01","2025-11-30"),fill_value=0)
ti=pd.read_csv(D+"tides.csv",parse_dates=["date"]); tmax=ti.groupby("date").height_m.max().reindex(r.index,fill_value=0)
island={"A","B","C","D","E","F/S","F/N","G/S","G/N"}
wo["station"]=np.where(wo.ward_code.isin(island),"Colaba","Santacruz")
def after(row,days,f):
    d=row.completed_at.normalize(); s=r[row.station].loc[d+pd.Timedelta(days=1):d+pd.Timedelta(days=days)]; return f(s)
for k in [3,7,14,30]: wo[f"rain_next{k}"]=wo.apply(lambda x: after(x,k,np.sum),axis=1)
wo["max_rain_next7"]=wo.apply(lambda x: after(x,7,np.max),axis=1)
wo["heavy_days_next14"]=wo.apply(lambda x: after(x,14,lambda s:(s>=64.5).sum()),axis=1)
wo["rain_prev3"]=wo.apply(lambda x: r[x.station].loc[x.completed_at.normalize()-pd.Timedelta(days=2):x.completed_at.normalize()].sum(),axis=1)
wo["rain_on_day"]=wo.apply(lambda x: r[x.station].loc[x.completed_at.normalize()],axis=1)
wo["bigtide_next14"]=wo.completed_at.apply(lambda d: (tmax.loc[d.normalize()+pd.Timedelta(days=1):d.normalize()+pd.Timedelta(days=14)]>=4.5).sum())
wo["dur_h"]=(wo.completed_at-wo.work_started_at).dt.total_seconds()/3600
wo["resp_h"]=(wo.completed_at-wo.assigned_at).dt.total_seconds()/3600
wo["n_links"]=wo.linked_complaint_ids.fillna("").apply(lambda s: len([x for x in s.split("|") if x]))
rc=pd.read_csv(D+"rate_card.csv").set_index("repair_method")
exp=np.where(wo.repair_method.map(rc.unit)=="per sqm",wo.area_sqm*wo.repair_method.map(rc.standard_rate_inr),wo.repair_method.map(rc.standard_rate_inr))
wo["cost_ratio"]=wo.cost_inr/exp
wo["month"]=wo.completed_at.dt.month; wo["doy"]=wo.completed_at.dt.dayofyear
m=wo.merge(roads.drop(columns=["ward_code"]),on="road_id",how="left")
m["road_age_y"]=(m.completed_at-m.last_resurfaced).dt.days/365
# prior reopen on same road (leak-free): count of earlier WOs on road
m=m.sort_values("completed_at"); m["prior_wo_road"]=m.groupby("road_id").cumcount()
m["prior_re_road"]=m.groupby("road_id").re.cumsum()-m.re
m.to_pickle(S+"wo_feat.pkl")
for c in ["rain_next7","rain_next14","max_rain_next7","heavy_days_next14","bigtide_next14","rain_on_day","hs_dist_m","congestion_index_0_10","road_age_y","cost_ratio","dur_h","low_lying_index","area_sqm","prior_wo_road","acc_road","n_school","n_hosp"]:
    q=pd.qcut(m[c].rank(method="first"),5,labels=False); print(c, m.groupby(q).re.mean().round(3).tolist(), "AUC=%.3f"%roc_auc_score(m.re,m[c]))
num=["rain_next3","rain_next7","rain_next14","rain_next30","max_rain_next7","heavy_days_next14","rain_prev3","rain_on_day","bigtide_next14","dur_h","resp_h","n_links","cost_ratio","area_sqm","doy","hs_dist_m","hs_within500","hs_within1000","n_hosp","n_school","acc_all","acc_road","peak_hour_vehicles","avg_peak_speed_kmph","congestion_index_0_10","bus_routes_count","two_wheeler_share_pct","lanes","length_m","road_age_y","low_lying_index","sla_hours","prior_wo_road","prior_re_road"]
cat=["contractor_id","repair_method","surface","under_dlp","bus_route","road_type","ward_code","sla_met","engineer_remark"]
X=pd.get_dummies(m[num+cat],columns=cat,drop_first=False).astype(float).fillna(0); y=m.re.values
cv=StratifiedKFold(5,shuffle=True,random_state=0)
def auc(cols,name,model="lr"):
    Xs=X[[c for c in X.columns if any(c==k or c.startswith(k+"_") for k in cols)]]
    mdl=make_pipeline(StandardScaler(),LogisticRegression(C=0.5,max_iter=2000)) if model=="lr" else HistGradientBoostingClassifier(max_depth=3,learning_rate=0.05,max_iter=300,random_state=0)
    p=cross_val_predict(mdl,Xs,y,cv=cv,method="predict_proba")[:,1]; a=roc_auc_score(y,p); print(f"{model} {name:45s} AUC={a:.3f} nfeat={Xs.shape[1]}"); return a
for mdl in ["lr","gb"]:
    auc(["contractor_id"],"contractor only",mdl)
    auc(["repair_method"],"method only",mdl)
    auc(["contractor_id","repair_method"],"contractor+method",mdl)
    auc(["contractor_id","repair_method","surface"],"contractor+method+surface",mdl)
    auc(["contractor_id","repair_method","surface","rain_next7","rain_next14","max_rain_next7","heavy_days_next14"],"+rain after",mdl)
    auc(num+cat,"ALL",mdl)
    auc([c for c in num+cat if c not in ("contractor_id","repair_method","surface")],"ALL minus contractor/method/surface",mdl)
    auc(["rain_next3","rain_next7","rain_next14","rain_next30","max_rain_next7","heavy_days_next14","bigtide_next14","hs_dist_m","hs_within500","low_lying_index","congestion_index_0_10","peak_hour_vehicles","acc_road","n_school","n_hosp","road_age_y","under_dlp","bus_route"],"risk-context only (no who/how)",mdl)
# LR coefficients on compact model
Xs=X[[c for c in X.columns if c.startswith(("contractor_id_","repair_method_","surface_"))]+["rain_next7","max_rain_next7","heavy_days_next14","hs_dist_m","congestion_index_0_10","road_age_y","low_lying_index"]]
lr=make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=3000)).fit(Xs,y)
print(pd.Series(lr[-1].coef_[0],index=Xs.columns).sort_values().round(3))
