import pandas as pd, numpy as np
D="/home/silverfang/claude_lab_hackathon/data/"
wo=pd.read_csv(D+"work_orders.csv",parse_dates=["assigned_at","work_started_at","completed_at"])
rc=pd.read_csv(D+"rate_card.csv"); print(rc)
roads=pd.read_csv(D+"roads.csv"); tr=pd.read_csv(D+"traffic.csv")
wo["re"]=(wo.reopened_within_30d=="Y").astype(int)
print("overall",wo.re.mean(),wo.re.sum(),len(wo))
print(pd.crosstab(wo.work_type,wo.repair_method))
def g(c):
    t=wo.groupby(c).agg(n=("re","size"),reopen=("re","mean"),cost=("cost_inr","mean"),area=("area_sqm","mean")).sort_values("reopen")
    print("\n",t.round(3))
for c in ["repair_method","work_type","contractor_id","ward_code","sla_hours","sla_met"]: g(c)
m=wo.merge(roads,on="road_id",how="left",suffixes=("","_r")).merge(tr,on="road_id",how="left")
for c in ["surface","under_dlp","bus_route","road_type","lanes"]:
    print(m.groupby(c).re.agg(["size","mean"]).round(3))
m["month"]=m.completed_at.dt.month
print(m.groupby("month").re.agg(["size","mean"]).round(3))
print(pd.crosstab(m.repair_method,m.surface,values=m.re,aggfunc="mean").round(2))
print(pd.crosstab(m.contractor_id,m.repair_method,values=m.re,aggfunc="mean").round(2))
print(wo.engineer_remark.value_counts().head(30))
print(wo.groupby("engineer_remark").re.mean().round(2))
print(wo.ward_code.ne(m.ward_code_r).sum(),"ward mismatch WO vs road")
