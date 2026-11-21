import pandas as pd, numpy as np
pd.set_option("display.width",250); pd.set_option("display.max_columns",30)
D="/home/silverfang/claude_lab_hackathon/data/"
wo=pd.read_csv(D+"work_orders.csv",parse_dates=["assigned_at","work_started_at","completed_at"])
wo["re"]=(wo.reopened_within_30d=="Y").astype(int)
print(wo.groupby(["work_type","repair_method"]).agg(n=("re","size"),re=("re","mean"),cost=("cost_inr","mean"),med=("cost_inr","median")).round(3))
# contractor x method full
print(pd.crosstab(wo.contractor_id,wo.repair_method,values=wo.re,aggfunc="mean").round(2).T)
print(pd.crosstab(wo.contractor_id,wo.repair_method).T)
# contractor wards
print(pd.crosstab(wo.ward_code,wo.contractor_id))
rf=pd.read_csv(D+"rainfall_daily.csv",parse_dates=["date"]); print(rf.groupby("station").rainfall_mm.describe())
print(rf.date.min(),rf.date.max())
print(pd.read_csv(D+"wards.csv")[["ward_code","zone","low_lying_index","monsoon_repair_budget_inr_2025","engineering_crews","centroid_lat"]])
fh=pd.read_csv(D+"flood_hotspots.csv"); print(fh)
ti=pd.read_csv(D+"tides.csv"); print(ti.big_tide_flag.value_counts(), ti.height_m.describe())
print(pd.read_csv(D+"contractors.csv"))
