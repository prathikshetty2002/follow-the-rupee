import pandas as pd, numpy as np
pd.set_option("display.width",250); pd.set_option("display.max_columns",40); pd.set_option("display.max_rows",100)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
def hav(lat1,lon1,lat2,lon2):
    R=6371000; p=np.pi/180
    a=np.sin((lat2-lat1)*p/2)**2+np.cos(lat1*p)*np.cos(lat2*p)*np.sin((lon2-lon1)*p/2)**2
    return 2*R*np.arcsin(np.sqrt(a))
m=pd.read_pickle(S+"wo_feat.pkl"); c=pd.read_csv(D+"complaints.csv",parse_dates=["received_at","resolved_at"])
roads=pd.read_pickle(S+"roads.pkl"); loc=pd.read_csv(D+"localities.csv"); wards=pd.read_csv(D+"wards.csv")
lk=m[["work_order_id","road_id","linked_complaint_ids","ward_code"]].dropna(subset=["linked_complaint_ids"]).copy()
lk["cid"]=lk.linked_complaint_ids.str.split("|"); lk=lk.explode("cid")
c=c.merge(lk[["cid","work_order_id","road_id"]].rename(columns={"cid":"complaint_id"}),on="complaint_id",how="left")
# nearest segment test (point to segment distance approx using midpoint+endpoints sampling)
pts=np.linspace(0,1,11)
segs=[(roads.start_lat.values*(1-t)+roads.end_lat.values*t, roads.start_lon.values*(1-t)+roads.end_lon.values*t) for t in pts]
def nearest(lat,lon):
    d=np.min([hav(lat[:,None],lon[:,None],a[None],b[None]) for a,b in segs],axis=0); return roads.road_id.values[d.argmin(1)],d.min(1)
g=c[c.lat.notna()].copy(); g["nr"],g["nd"]=nearest(g.lat.values,g.lon.values)
t=g[g.road_id.notna()]; print("GPS nearest-seg == WO road:",(t.nr==t.road_id).mean(),len(t)); print(t.nd.describe())
# ward fill
la={}
for _,r in loc.iterrows():
    la[r.locality.lower()]=r.ward_code
    for a in str(r.aliases).split(";") if pd.notna(r.aliases) else []: la[a.strip().lower()]=r.ward_code
c["ward_fill"]=c.ward_code.fillna(c.locality_text.str.lower().str.strip().map(la))
print("ward missing",c.ward_code.isna().sum(),"after fill",c.ward_fill.isna().sum())
op=c[c.status.isin(["Open","In Progress"])].copy()
print("open+inprog",len(op), op.status.value_counts().to_dict())
print(op.category_reported.value_counts())
print("received month",op.received_at.dt.month.value_counts().sort_index().to_dict())
# map to road: GPS nearest within 300m, else road-name within ward
names=sorted(roads.road_name.unique(),key=len,reverse=True)
op["rname"]=op.description.fillna("").apply(lambda s: next((n for n in names if n.lower() in s.lower()),None))
def pick(r):
    if pd.notna(r.lat):
        rid,d=nearest(np.array([r.lat]),np.array([r.lon]))
        if d[0]<400: return rid[0]
    if r.rname:
        cand=roads[(roads.road_name==r.rname)&(roads.ward_code==r.ward_fill)]
        if len(cand)==0: cand=roads[roads.road_name==r.rname]
        if len(cand):
            l=loc[loc.locality.str.lower()==str(r.locality_text).lower()]
            if len(l): return cand.iloc[np.argmin(hav(l.lat.values[0],l.lon.values[0],cand.mlat.values,cand.mlon.values))].road_id
            return cand.iloc[0].road_id
    return None
op["road_est"]=op.apply(pick,axis=1); print("open mapped to road",op.road_est.notna().mean())
# dedup: same road + category within 7 days -> one issue
op=op.sort_values("received_at"); op["key"]=op.road_est.fillna(op.ward_fill.fillna("?")+"|"+op.locality_text.fillna(""))+"|"+op.category_reported
op["issue"]=(op.groupby("key").received_at.diff().dt.days.fillna(999)>14).groupby(op.key).cumsum()
op["issue_id"]=op.key+"#"+op.issue.astype(str)
print("open issues after dedup",op.issue_id.nunique())
w=op.groupby("ward_fill").agg(open_complaints=("complaint_id","size"),open_issues=("issue_id","nunique"),roads=("road_est","nunique"),upvotes=("upvotes","sum"))
sp=m.groupby("ward_code").agg(spend=("cost_inr","sum"),n_wo=("work_order_id","size"),reopened=("re","sum"),reopen_spend=("cost_inr",lambda s: s[m.loc[s.index,"re"]==1].sum()))
dlp=m[m.under_dlp=="Y"].groupby("ward_code").cost_inr.sum().rename("dlp_spend")
b=wards.set_index("ward_code")[["monsoon_repair_budget_inr_2025","low_lying_index","engineering_crews","population_est"]].join(sp).join(dlp).join(w)
b["remaining"]=b.monsoon_repair_budget_inr_2025-b.spend; b["util_pct"]=(100*b.spend/b.monsoon_repair_budget_inr_2025).round(1)
b["budget_per_spend"]=(b.monsoon_repair_budget_inr_2025/b.spend).round(3)
print(b.sort_values("remaining")); print("total budget",b.monsoon_repair_budget_inr_2025.sum(),"spend",b.spend.sum())
print("corr budget~spend",np.corrcoef(b.monsoon_repair_budget_inr_2025,b.spend)[0,1])
op.to_pickle(S+"open.pkl"); c.to_pickle(S+"c.pkl"); b.to_pickle(S+"budget.pkl")
# repeat-reopen roads
rr=m.groupby("road_id").agg(n_wo=("re","size"),n_re=("re","sum")); print("roads with >=3 reopens",(rr.n_re>=3).sum(),"; >=2",(rr.n_re>=2).sum()); print(rr.n_wo.describe())
print("roads with any WO",len(rr),"of",len(roads))
