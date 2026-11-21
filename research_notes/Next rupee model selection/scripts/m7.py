import pandas as pd, numpy as np
from scipy.stats import spearmanr, chi2_contingency
pd.set_option("display.width",250); pd.set_option("display.max_columns",40)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl"); R=pd.read_pickle(S+"R.pkl"); c=pd.read_pickle(S+"c.pkl")
print("cost_ratio quantiles",m.cost_ratio.quantile([0,.01,.05,.25,.5,.75,.95,.99,1]).round(3).to_dict())
print("cost_ratio>1.4:",(m.cost_ratio>1.4).sum()," >1.35:",(m.cost_ratio>1.35).sum(), " <0.7:",(m.cost_ratio<0.7).sum())
print(pd.cut(m.cost_ratio,[0,.7,.8,.9,1,1.1,1.2,1.3,1.4,1.6,2,5]).value_counts().sort_index().to_dict())
print("reopen by overbilled", m.groupby(m.cost_ratio>1.4).re.agg(["size","mean"]).round(3).to_dict())
print("unlinked WOs",m.linked_complaint_ids.isna().sum(), "reopen", m[m.linked_complaint_ids.isna()].re.mean())
ids=m.work_order_id.str[-5:].astype(int).sort_values(); print("WO id range",ids.min(),ids.max(),"missing",ids.max()-ids.min()+1-len(ids))
ci=c.complaint_id.str[-6:].astype(int); print("complaint id range",ci.min(),ci.max(),"missing",ci.max()-ci.min()+1-len(ci))
print("cost multiples of 1000:",(m.cost_inr%1000==0).mean().round(3)," of 100:",(m.cost_inr%100==0).mean().round(3))
print("area decimals", m.area_sqm.apply(lambda x: round(x*10)%10==0).mean().round(3))
# DLP check and reopen
print("DLP WOs",(m.under_dlp=="Y").sum(), "reopen", m[m.under_dlp=="Y"].re.mean().round(3))
# accidents placement drivers
print("acc per road spearman", {f:round(spearmanr(R[f],R.acc_road).correlation,3) for f in ["hs_near","low_lying_index","congestion_index_0_10","peak_hour_vehicles","two_wheeler_share_pct","population_est","wo_all","n_school","n_hosp","bus"]})
# chi2 independence tests
for col in ["contractor_id","repair_method","surface","under_dlp","bus_route","road_type","ward_code","engineer_remark","sla_hours","month"]:
    ct=pd.crosstab(m[col],m.re); ch=chi2_contingency(ct); print(f"chi2 {col:18s} p={ch[1]:.2e} dof={ch[2]}")
# durability economics per work_type x method
g=m.groupby(["work_type","repair_method"]).agg(n=("re","size"),reopen=("re","mean"),cost=("cost_inr","mean"))
g["cost_per_durable_fix"]=g.cost/(1-g.reopen); g["expected_cost_incl_1_redo"]=g.cost*(1+g.reopen)
print(g.round(3))
# pothole by surface
p=m[m.work_type=="Pothole"]; print(pd.crosstab(p.surface,p.repair_method,values=p.re,aggfunc="mean").round(3)); print(pd.crosstab(p.surface,p.repair_method))
w=m[m.work_type=="Waterlogging"]; print(pd.crosstab(w.hs_dist_m<500,w.repair_method,values=w.re,aggfunc="mean").round(3))
# method choice correlation with context? is method choice random?
print(pd.crosstab(p.contractor_id,p.repair_method,normalize="index").round(2))
# contractor x DLP: DLP contractor? roads don't have contractor column
print("WOs on DLP roads by contractor",m[m.under_dlp=="Y"].contractor_id.value_counts().to_dict())
# contractor assignment vs active_wards
ctr=pd.read_csv(D+"contractors.csv"); aw={r.contractor_id:set(x.strip() for x in r.active_wards.split(";")) for r in ctr.itertuples()}
m["in_active"]=[w in aw[cid] for w,cid in zip(m.ward_code,m.contractor_id)]; print("WO in contractor's listed active wards",m.in_active.mean().round(3), m.groupby("in_active").re.mean().round(3).to_dict())
