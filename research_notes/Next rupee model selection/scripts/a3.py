import pandas as pd, numpy as np
pd.set_option("display.width",250); pd.set_option("display.max_columns",40)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
roads=pd.read_pickle(S+"roads.pkl"); fh=pd.read_pickle(S+"fh.pkl")
print(fh[["hotspot_id","name","ward_code","near_road","near_road_m"]])
print(roads.hs_dist_m.describe()); print((roads.hs_dist_m<500).sum(),"roads within 500m of hotspot")
c=pd.read_csv(D+"complaints.csv",parse_dates=["received_at"]); rf=pd.read_csv(D+"rainfall_daily.csv",parse_dates=["date"])
r=rf.pivot(index="date",columns="station",values="rainfall_mm"); print("station corr",r.corr().iloc[0,1])
c["date"]=c.received_at.dt.normalize()
dc=c.groupby(["date","ward_code"]).size().unstack(fill_value=0).reindex(r.index,fill_value=0)
out=[]
for w in dc.columns:
    out.append((w,np.corrcoef(dc[w],r.Colaba)[0,1],np.corrcoef(dc[w],r.Santacruz)[0,1],np.corrcoef(dc[w],r.Colaba.shift(1).fillna(0))[0,1],np.corrcoef(dc[w],r.Santacruz.shift(1).fillna(0))[0,1]))
o=pd.DataFrame(out,columns=["ward","colaba","scz","colaba_lag1","scz_lag1"]).merge(pd.read_csv(D+"wards.csv")[["ward_code","centroid_lat","zone"]],left_on="ward",right_on="ward_code")
o["better"]=np.where(o.colaba>o.scz,"Colaba","Santacruz"); print(o.sort_values("centroid_lat").round(3))
print("complaints by status\n",c.status.value_counts())
print(c.received_at.min(),c.received_at.max())
print(r.describe()); print((r>100).sum(), (r>=204.5).sum())
print(rf.groupby(["station","imd_category"]).rainfall_mm.agg(["min","max","size"]))
