import pandas as pd, numpy as np, re
pd.set_option("display.width",250); pd.set_option("display.max_columns",40); pd.set_option("display.max_colwidth",120)
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl"); c=pd.read_csv(D+"complaints.csv",parse_dates=["received_at","resolved_at"])
roads=pd.read_pickle(S+"roads.pkl")
lk=m[["work_order_id","road_id","sla_hours","work_type","linked_complaint_ids","completed_at"]].dropna(subset=["linked_complaint_ids"]).copy()
lk["cid"]=lk.linked_complaint_ids.str.split("|"); lk=lk.explode("cid")
print("linked complaint ids",len(lk),"unique",lk.cid.nunique(), "linked to >1 WO", (lk.cid.value_counts()>1).sum())
cc=c.merge(lk[["cid","work_order_id","road_id","sla_hours","work_type"]],left_on="complaint_id",right_on="cid",how="left")
print(pd.crosstab(cc.status,cc.work_order_id.notna()))
# severity words
kw={"knee":r"knee|ghutne|गुडघ|घुटने|waist|kamar","accident":r"accident|fell|gir|अपघात|दुर्घटना|injur","school":r"school|शाळ|स्कूल","hospital":r"hospital|ambulance|रुग्णाल|अस्पताल","deep":r"deep|gehra|bada|huge|big|मोठ","danger":r"danger|khatra|धोका|tragedy","bike":r"bike|two.?wheeler|scooter"}
t=cc[cc.sla_hours.notna()].copy(); txt=(t.description.fillna("")+" "+t.photo_description.fillna("")).str.lower()
for k,p in kw.items(): t[k]=txt.str.contains(p)
print(t.groupby(["work_type","sla_hours"])[list(kw)+["upvotes"]].mean().round(2))
print(t.groupby("sla_hours").upvotes.describe())
# category & description patterns
print(c.category_reported.value_counts())
print(c.description.sample(15,random_state=1).tolist())
# road names mention
names=roads.road_name.unique(); print(len(names),"road names")
c["road_name_hit"]=c.description.fillna("").apply(lambda s: next((n for n in names if n.lower() in s.lower()),None))
print("complaints mentioning a road name:",c.road_name_hit.notna().mean())
cc["road_name_hit"]=c.road_name_hit
x=cc[cc.road_id.notna()&cc.road_name_hit.notna()]; x=x.merge(roads[["road_id","road_name"]],on="road_id")
print("name-hit == WO road_name:",(x.road_name_hit==x.road_name).mean(), len(x))
