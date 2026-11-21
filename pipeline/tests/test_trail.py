import pandas as pd

from pipeline.trail import link_social_posts, post_kind, post_topic, trail_text

LOC = pd.DataFrame({"locality": ["Parel", "Dadar"], "aliases": ["परळ", None]})
ROADS = pd.DataFrame({"road_name": ["Link Road"]})


def issue(i, locality, category, first, **kw):
    base = dict(issue_id=i, locality=locality, category=category, first_reported_at=pd.Timestamp(first), last_reported_at=pd.Timestamp(first), completed_at=pd.NaT, road_name=None)
    return {**base, **kw}


def post(pid, text, when):
    return {"post_id": pid, "text": text, "posted_at": pd.Timestamp(when)}


def test_post_kinds_and_topics():
    assert post_kind("@mybmc thank you for fixing the pothole") == "thanks"
    assert post_kind("Just fixed last week and pothole is BACK on Link Road") == "repeat_claim"
    assert post_kind("Fwd as received: Hindmata all flooded (unverified)") == "forward"
    assert post_kind("Chembur madhe gutter overflow zala aahe") == "complaint"
    assert post_topic("Parel mein paani bhar gaya") == "Waterlogging"
    assert post_topic("bada gaddha on the road") == "Pothole"
    assert post_topic("good morning") is None


def test_posts_link_on_place_topic_and_time():
    issues = pd.DataFrame([
        issue("A", "Parel", "Pothole", "2025-07-01"),
        issue("B", "Parel", "Waterlogging", "2025-07-01"),
        issue("C", "Dadar", "Pothole", "2025-07-01"),
        issue("D", "Parel", "Pothole", "2025-08-20"),
    ])
    posts = pd.DataFrame([
        post("p1", "Parel mein bada gaddha hai", "2025-07-02"),            # place + topic + time -> A
        post("p2", "Parel mein paani bhar gaya", "2025-07-02"),            # waterlogging -> B
        post("p3", "Parel gaddha", "2025-07-30"),                          # too late for A, too early for D
        post("p4", "good morning from Dadar", "2025-07-02"),               # no topic: any issue in place -> C
        post("p5", "परळ मध्ये खड्डा", "2025-07-02"),                       # alias in another script -> A
    ])
    linked, out = link_social_posts(issues, posts, LOC, ROADS)
    assert linked == {"A": ["p1", "p5"], "B": ["p2"], "C": ["p4"]}
    assert out.set_index("post_id").issue_id["p3"] is None


def test_road_name_is_used_only_when_no_locality_is_named():
    issues = pd.DataFrame([issue("A", "Dadar", "Pothole", "2025-07-01", road_name="Link Road")])
    posts = pd.DataFrame([
        post("p1", "pothole on Link Road again", "2025-07-02"),            # no locality -> road path
        post("p2", "Parel pothole on Link Road", "2025-07-02"),            # names Parel, which has no issue -> no link
    ])
    linked, _ = link_social_posts(issues, posts, LOC, ROADS)
    assert linked == {"A": ["p1"]}


def row(**kw):
    base = dict(n_complaints=2, channels=["MyBMC App"], category="Pothole", locality="Parel", status="fixed", disposition=None, work_order_id="WO1",
                contractor_name="Acme (synthetic)", repair_method="Hot mix patch", cost_inr=16100, completed_at=pd.Timestamp("2025-07-05"), days_to_fix=1.5,
                sla_met="Y", sla_hours=72, flag_types=[])
    return pd.Series({**base, **kw})


def test_trail_text_for_each_outcome():
    ok = trail_text(row())
    assert "led to WO1 by Acme" in ok and "within the 72-hour target" in ok and ok.endswith("The repair held.")
    assert "failed within 30 days" in trail_text(row(status="fixed_failed"))
    assert "after the 72-hour target" in trail_text(row(sla_met="N"))
    assert "Flagged for review: over billed" in trail_text(row(flag_types=["over_billed", "reopened"]))
    assert "no work order yet (status: Open)" in trail_text(row(status="never_fixed", disposition="Open"))
    assert "not repaired by BMC (Forwarded to SWM dept)" in trail_text(row(status="not_bmc_scope", disposition="Forwarded to SWM dept"))
