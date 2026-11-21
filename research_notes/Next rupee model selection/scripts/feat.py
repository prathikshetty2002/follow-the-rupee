import pandas as pd, numpy as np
D="/home/silverfang/claude_lab_hackathon/data/"
def hav(lat1,lon1,lat2,lon2):
    R=6371000; p=np.pi/180
    a=np.sin((lat2-lat1)*p/2)**2+np.cos(lat1*p)*np.cos(lat2*p)*np.sin((lon2-lon1)*p/2)**2
    return 2*R*np.arcsin(np.sqrt(a))
wo=pd.read_csv(D+"work_orders.csv",parse_dates=["assigned_at","work_started_at","completed_at"])
wo["re"]=(wo.reopened_within_30d=="Y").astype(int)
roads=pd.read_csv(D+"roads.csv",parse_dates=["last_resurfaced"]); tr=pd.read_csv(D+"traffic.csv")
wards=pd.read_csv(D+"wards.csv"); fh=pd.read_csv(D+"flood_hotspots.csv"); fac=pd.read_csv(D+"facilities.csv")
acc=pd.read_csv(D+"accidents.csv",parse_dates=["occurred_at"]); rf=pd.read_csv(D+"rainfall_daily.csv",parse_dates=["date"])
ti=pd.read_csv(D+"tides.csv",parse_dates=["date"])
roads["mlat"]=(roads.start_lat+roads.end_lat)/2; roads["mlon"]=(roads.start_lon+roads.end_lon)/2
# nearest hotspot per road (point-to-midpoint & endpoints min)
dist=np.stack([np.minimum.reduce([hav(roads[a].values[:,None],roads[b].values[:,None],fh.lat.values[None],fh.lon.values[None]) for a,b in [("mlat","mlon"),("start_lat","start_lon"),("end_lat","end_lon")]])])[0]
roads["hs_dist_m"]=dist.min(1); roads["hs_id"]=fh.hotspot_id.values[dist.argmin(1)]
roads["hs_within500"]=(dist<500).sum(1); roads["hs_within1000"]=(dist<1000).sum(1)
h=fh.set_index("hotspot_id"); roads["hs_tide"]=roads.hs_id.map(h.tide_sensitive); roads["hs_thresh"]=roads.hs_id.map(h.flood_threshold_mm_per_day)
roads["hs_years"]=roads.hs_id.map(h.years_flagged_last_5); roads["hs_depth"]=roads.hs_id.map(h.avg_water_depth_cm)
# nearest road per hotspot
dh=hav(fh.lat.values[:,None],fh.lon.values[:,None],roads.mlat.values[None],roads.mlon.values[None])
fh["near_road"]=roads.road_id.values[dh.argmin(1)]; fh["near_road_m"]=dh.min(1).round(0)
roads["hotspot_nearest_of"]=roads.road_id.map(fh.groupby("near_road").size()).fillna(0)
f=fac.groupby(["ambulance_entry_road","type"]).size().unstack(fill_value=0)
roads["n_hosp"]=roads.road_id.map(f.get("Hospital")).fillna(0); roads["n_school"]=roads.road_id.map(f.get("School")).fillna(0)
fe=fac[fac.emergency_services=="Y"].groupby("ambulance_entry_road").size(); roads["n_emerg"]=roads.road_id.map(fe).fillna(0)
roads["beds_students"]=roads.road_id.map(fac.groupby("ambulance_entry_road").beds_or_students.sum()).fillna(0)
roads["acc_all"]=roads.road_id.map(acc.groupby("road_id").size()).fillna(0)
pc=acc.probable_cause.isin(["Pothole","Waterlogged road","Uneven road / open chamber"])
roads["acc_road"]=roads.road_id.map(acc[pc].groupby("road_id").size()).fillna(0)
roads["acc_fatal"]=roads.road_id.map(acc[acc.severity=="Fatal"].groupby("road_id").size()).fillna(0)
roads=roads.merge(tr,on="road_id",how="left").merge(wards[["ward_code","low_lying_index","zone","centroid_lat","monsoon_repair_budget_inr_2025","engineering_crews","population_est"]],on="ward_code",how="left")
roads["station"]=np.where(roads.centroid_lat<19.03,"Colaba","Santacruz")  # placeholder, validated in a3
roads.to_pickle("/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/roads.pkl")
fh.to_pickle("/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/fh.pkl")
