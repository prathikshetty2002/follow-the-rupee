import pandas as pd, numpy as np
from sklearn.metrics import roc_auc_score
D="/home/silverfang/claude_lab_hackathon/data/"; S="/tmp/claude-1000/-home-silverfang--claude-spares-spare-oXCl2v/9e0b699d-3ed9-4a00-886b-70c8a9bdbddb/scratchpad/"
m=pd.read_pickle(S+"wo_feat.pkl").sort_values("completed_at"); c=pd.read_pickle(S+"c.pkl")
# follow-up WO on same road & work_type within 30d of completion
nxt=[]
for (r,w),g in m.groupby(["road_id","work_type"]):
    t=g.completed_at.values; a=g.assigned_at.values
    for i in range(len(g)):
        later=a[(a>t[i])&(a<=t[i]+np.timedelta64(30,"D"))]; nxt.append((g.index[i],len(later)>0))
m["followup30"]=pd.Series(dict(nxt)); print("followup WO within 30d, by reopen:",m.groupby("re").followup30.mean().round(3).to_dict())
# reopened-complaint text
rt=c.description.fillna("").str.contains("reopen|phir se|again|wahi gadda|पुन्हा|फिर से",case=False)
print("complaints with reopen wording",rt.sum(), c[rt].status.value_counts().to_dict())
# in-sample oracle AUC from contractor x method cell rates and contractor x method x surface
for keys in [["contractor_id"],["contractor_id","repair_method"],["contractor_id","repair_method","surface"]]:
    p=m.groupby(keys).re.transform("mean"); print(keys,"in-sample cell AUC",round(roc_auc_score(m.re,p),3))
# multiplicative fit: p = a_method * b_contractor * s_surface via log-binomial-ish iterative
import itertools
ct=m.groupby("contractor_id").re.mean()/m.re.mean(); me=m.groupby("repair_method").re.mean(); su=m.groupby("surface").re.mean()/m.re.mean()
print("contractor multipliers",ct.round(2).to_dict()); print("surface multipliers",su.round(2).to_dict())
# remaining budget vs open issue cost estimate
op=pd.read_pickle(S+"open.pkl"); b=pd.read_pickle(S+"budget.pkl")
costmap={"Pothole":16812,"Waterlogging":64420,"Choked drain / nullah overflow":77690,"Broken paver blocks":65547,"Road cave-in":194494,"Open or broken manhole":49045,"Road related":16812,"Other":16812}
iss=op.groupby("issue_id").agg(ward=("ward_fill","first"),cat=("category_reported","first")); iss["est_cost"]=iss.cat.map(costmap)
need=iss.groupby("ward").est_cost.sum(); b["open_issue_cost_est"]=need; b["cover_ratio"]=(b.remaining/need).round(2)
print(b[["remaining","open_issues","open_issue_cost_est","cover_ratio"]].sort_values("cover_ratio").to_string())
print("total open issue cost est",need.sum())
