import pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
from scipy.stats import spearmanr
from sklearn.linear_model import PoissonRegressor
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.ensemble import HistGradientBoostingRegressor
pd.set_option("display.width",250); pd.set_option("display.max_columns",40)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl"); roads=pd.read_pickle(S+"roads.pkl"); c=pd.read_pickle(S+"c.pkl"); op=pd.read_pickle(S+"open.pkl")
acc=pd.read_csv(D+"accidents.csv",parse_dates=["occurred_at"])
print(acc.occurred_at.dt.year.value_counts().to_dict(), acc.probable_cause.value_counts().to_dict(), acc.severity.value_counts().to_dict())
acc["mon"]=acc.occurred_at.dt.month; print("acc by month", acc.groupby("mon").size().to_dict())
print("acc road-cause by month", acc[acc.probable_cause.isin(["Pothole","Waterlogged road","Uneven road / open chamber"])].groupby("mon").size().to_dict())
R=roads.set_index("road_id").copy()
R["hs_near"]=np.exp(-R.hs_dist_m/500)
R["wo_all"]=m.groupby("road_id").size(); R["re_all"]=m.groupby("road_id").re.sum()
R["cmp_all"]=c[c.road_id.notna()].groupby("road_id").size()
R["open_cmp"]=op.groupby("road_est").size()
for k in ["wo_all","re_all","cmp_all","open_cmp"]: R[k]=R[k].fillna(0)
R["wo_per_km"]=R.wo_all/(R.length_m/1000)
R["surface_cc"]=(R.surface=="Concrete (CC)").astype(int); R["dlp"]=(R.under_dlp=="Y").astype(int); R["bus"]=(R.bus_route=="Y").astype(int)
R["age"]=(pd.Timestamp("2025-06-01")-R.last_resurfaced).dt.days/365
R["hs_tide_y"]=((R.hs_tide=="Y")&(R.hs_dist_m<1000)).astype(int)
feats=["hs_near","hs_dist_m","hs_within500","hs_within1000","hs_tide_y","hs_years","low_lying_index","peak_hour_vehicles","congestion_index_0_10","bus_routes_count","two_wheeler_share_pct","lanes","length_m","n_hosp","n_school","n_emerg","beds_students","acc_all","acc_road","acc_fatal","age","dlp","bus","surface_cc","population_est","engineering_crews"]
print("\nSpearman of static road features vs per-road outcomes (n=291)")
out={}
for t in ["wo_all","re_all","cmp_all","open_cmp","wo_per_km"]:
    out[t]={f:spearmanr(R[f],R[t]).correlation for f in feats}
print(pd.DataFrame(out).round(3).sort_values("wo_all"))
# types of WO per road vs hotspot
wt=pd.crosstab(m.road_id,m.work_type).reindex(R.index,fill_value=0)
print("\nSpearman hs_near vs counts by work type", {k:round(spearmanr(R.hs_near,wt[k]).correlation,3) for k in wt.columns})
print("Spearman low_lying vs by type", {k:round(spearmanr(R.low_lying_index,wt[k]).correlation,3) for k in wt.columns})
print("Spearman surface_cc / paver vs by type", {k:round(spearmanr((R.surface=="Paver blocks"),wt[k]).correlation,3) for k in wt.columns})
print(pd.crosstab(m.surface,m.work_type,normalize="index").round(3))
# Poisson CV: how predictable is WO count per road from static features?
X=R[feats].fillna(0).values; y=R.wo_all.values
p=cross_val_predict(make_pipeline(StandardScaler(),PoissonRegressor(alpha=0.1,max_iter=3000)),X,y,cv=KFold(5,shuffle=True,random_state=0))
print("\nPoisson CV spearman wo_all:",round(spearmanr(p,y).correlation,3))
pm=make_pipeline(StandardScaler(),PoissonRegressor(alpha=0.1,max_iter=3000)).fit(X,y); print(pd.Series(pm[-1].coef_,index=feats).sort_values().round(3))
R.to_pickle(S+"R.pkl")
