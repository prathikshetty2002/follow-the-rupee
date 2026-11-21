import pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
from scipy.stats import spearmanr
from sklearn.linear_model import PoissonRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.ensemble import HistGradientBoostingRegressor
pd.set_option("display.width",250)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl"); R=pd.read_pickle(S+"R.pkl"); c=pd.read_pickle(S+"c.pkl"); op=pd.read_pickle(S+"open.pkl")
acc=pd.read_csv(D+"accidents.csv",parse_dates=["occurred_at"]); rc_=acc.probable_cause.isin(["Pothole","Waterlogged road","Uneven road / open chamber"])
cut=pd.Timestamp("2025-08-01"); end=pd.Timestamp("2025-10-01")
# complaint -> road: WO road if linked else open mapping
c2=c.copy(); c2=c2.merge(op[["complaint_id","road_est"]],on="complaint_id",how="left"); c2["road"]=c2.road_id.fillna(c2.road_est)
def cnt(df,col,mask): return df[mask].groupby(col).size().reindex(R.index,fill_value=0)
T=pd.DataFrame(index=R.index)
T["wo_tr"]=cnt(m,"road_id",m.assigned_at<cut); T["re_tr"]=m[m.assigned_at<cut].groupby("road_id").re.sum().reindex(R.index,fill_value=0)
T["cmp_tr"]=cnt(c2,"road",c2.received_at<cut); T["spend_tr"]=m[m.assigned_at<cut].groupby("road_id").cost_inr.sum().reindex(R.index,fill_value=0)
T["acc_tr"]=cnt(acc,"road_id",(acc.occurred_at<cut)&rc_)
T["wo_te"]=cnt(m,"road_id",(m.assigned_at>=cut)&(m.assigned_at<end)); T["re_te"]=m[(m.assigned_at>=cut)&(m.assigned_at<end)].groupby("road_id").re.sum().reindex(R.index,fill_value=0)
T["cmp_te"]=cnt(c2,"road",(c2.received_at>=cut)&(c2.received_at<end)); T["acc_te"]=cnt(acc,"road_id",(acc.occurred_at>=cut)&(acc.occurred_at<end)&rc_)
T["spend_te"]=m[(m.assigned_at>=cut)&(m.assigned_at<end)].groupby("road_id").cost_inr.sum().reindex(R.index,fill_value=0)
T["ward"]=R.ward_code
z=lambda s:(s-s.mean())/s.std()
cands={
 "past_wo_count":T.wo_tr,"past_complaints":T.cmp_tr,"past_reopens":T.re_tr,"past_spend":T.spend_tr,
 "hotspot_near":R.hs_near,"low_lying":R.low_lying_index,"population":R.population_est,
 "traffic_congestion":R.congestion_index_0_10,"facilities":R.n_hosp+R.n_school,"acc_road_hist":T.acc_tr,
 "risk_index_static(eq wt: hs,lowlying,traffic,acc,fac,bus)":z(R.hs_near)+z(R.low_lying_index)+z(R.congestion_index_0_10)+z(T.acc_tr)+z(R.n_hosp+R.n_school)+z(R.bus),
 "risk_index_static_exposure(+pop)":z(R.hs_near)+z(R.low_lying_index)+z(np.log(R.population_est))+z(T.acc_tr),
 "history+static":z(np.log1p(T.cmp_tr))+z(R.hs_near)+z(R.low_lying_index),
}
# Poisson trained on Jun-Jul counts with static feats -> predict
feats=["hs_near","hs_within500","hs_tide_y","hs_years","low_lying_index","congestion_index_0_10","peak_hour_vehicles","bus","n_hosp","n_school","surface_cc","dlp","age","lanes","length_m","population_est"]
X=R[feats].fillna(0).copy(); X["log_wo_tr"]=np.log1p(T.wo_tr); X["acc_tr"]=T.acc_tr
pm=make_pipeline(StandardScaler(),PoissonRegressor(alpha=0.1,max_iter=3000)).fit(X,T.wo_tr) # fit on train window target with features incl. own past (leaky for in-sample, but test is future)
X2=R[feats].fillna(0).copy(); pm2=make_pipeline(StandardScaler(),PoissonRegressor(alpha=0.1,max_iter=3000)).fit(X2,T.wo_tr)
cands["poisson_static_fit_on_JunJul"]=pd.Series(pm2.predict(X2),index=R.index)
gb=HistGradientBoostingRegressor(loss="poisson",max_depth=3,max_iter=200,learning_rate=0.05).fit(X2,T.wo_tr); cands["gbm_static_fit_on_JunJul"]=pd.Series(gb.predict(X2),index=R.index)
rows=[]
for k,v in cands.items():
    r={"score":k}
    for t in ["wo_te","cmp_te","re_te","acc_te","spend_te"]:
        r[t]=spearmanr(v,T[t]).correlation
        ww=[spearmanr(v[T.ward==w],T[t][T.ward==w]).correlation for w in T.ward.unique() if (T.ward==w).sum()>=5]
        r[t+"_inward"]=np.nanmean(ww)
    rows.append(r)
res=pd.DataFrame(rows).set_index("score").round(3); print(res.to_string())
print("roads per ward",T.ward.value_counts().describe().to_dict())
# reopen persistence: road reopen rate Jun-Jul vs Aug-Sep
a=T[(T.wo_tr>=3)&(T.wo_te>=3)]; print("road reopen-rate persistence spearman",spearmanr(a.re_tr/a.wo_tr,a.re_te/a.wo_te).correlation,len(a))
# contractor reopen persistence
for k,dfx in [("JunJul",m[m.assigned_at<cut]),("AugSep",m[m.assigned_at>=cut])]: print(k,dfx.groupby("contractor_id").re.mean().round(3).to_dict())
for k,dfx in [("JunJul",m[m.assigned_at<cut]),("AugSep",m[m.assigned_at>=cut])]: print(k,dfx.groupby("repair_method").re.mean().round(3).to_dict())
T.to_pickle(S+"T.pkl")
