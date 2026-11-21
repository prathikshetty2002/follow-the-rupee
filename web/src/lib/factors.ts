import type { Factor } from "./planner";

export const FACTOR_INFO: Record<Factor, { label: string; short: string; help: string }> = {
  severity: { label: "How serious", short: "Seriousness", help: "How dangerous this kind of problem is. Cave-ins and open manholes rank above potholes and broken paver blocks." },
  flood: { label: "Flood risk", short: "Flooding", help: "How close the road is to a known flooding spot, plus how flood-prone the whole ward is." },
  history: { label: "Past trouble", short: "History", help: "Earlier complaints and failed repairs on the same road. Roads that keep failing are likely to fail again." },
  traffic: { label: "Traffic", short: "Traffic", help: "Congestion, vehicles in the peak hour, and whether buses use the road. More people are hurt when a busy road fails." },
  accidents: { label: "Accidents", short: "Accidents", help: "Accidents caused by road defects on this road. Fatal ones count more." },
  facilities: { label: "Hospitals and schools", short: "Hospitals, schools", help: "Hospitals with emergency services and schools that use this road as their access." },
};

export const WORK_TYPE_SEVERITY_NOTE = "Severity comes from the time BMC allows to fix each kind of problem: 24 hours for a cave-in, about 5 days for a pothole.";
