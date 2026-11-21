import pandas as pd, numpy as np, warnings; warnings.filterwarnings("ignore")
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict, KFold
from sklearn.metrics import roc_auc_score, accuracy_score
pd.set_option("display.width",250); pd.set_option("display.max_columns",40)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl")
# multiplicative check
ct=m.groupby("contractor_id").re.mean(); me=m.groupby("repair_method").re.mean(); base=m.re.mean()
obs=pd.crosstab(m.contractor_id,m.repair_method,values=m.re,aggfunc="mean"); n=pd.crosstab(m.contractor_id,m.repair_method)
pred=np.outer(ct,me)/base; resid=(obs-pred); print("mult model weighted MAE",(abs(resid)*n).sum().sum()/n.sum().sum())
# surface within contractor
print(pd.crosstab(m.contractor_id,m.surface,values=m.re,aggfunc="mean").round(3))
print(pd.crosstab(m.surface,m.contractor_id,normalize="index").round(2))
# logistic on contractor+method+surface: LR test via deviance
from sklearn.metrics import log_loss
def dev(cols):
    X=pd.get_dummies(m[cols].astype(str)).astype(float); l=LogisticRegression(C=1e6,max_iter=5000).fit(X,m.re); return 2*log_loss(m.re,l.predict_proba(X)[:,1],normalize=False),X.shape[1]
for cs in [["contractor_id"],["contractor_id","repair_method"],["contractor_id","repair_method","surface"],["contractor_id","repair_method","surface","under_dlp"],["contractor_id","repair_method","surface","month"],["contractor_id","repair_method","surface","ward_code"]]:
    print(cs,dev(cs))
# SLA / severity
print(pd.crosstab(m.work_type,m.sla_hours))
print(m.groupby("sla_hours")[["n_links","hs_dist_m","n_hosp","n_school","congestion_index_0_10","acc_road","low_lying_index","rain_prev3","rain_on_day","bus_routes_count"]].mean().round(2))
print(pd.crosstab(m.bus_route,m.sla_hours,normalize="index").round(2))
print(pd.crosstab(m.road_type,m.sla_hours,normalize="index").round(2))
# sla_met vs delay
m["resp_vs_sla"]=m.resp_h/m.sla_hours; print(m.groupby("sla_met").resp_vs_sla.describe())
