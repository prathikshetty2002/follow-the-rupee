import type { Box } from "@/lib/view";

export type StageIssue = { rank: number; road: string; type: string; costInr: number; funded: boolean };

export type StageWard = {
  code: string;
  slug: string;
  name: string;
  zone: string;
  d: string; // outline as an SVG path
  box: Box; // bounding box in drawing units
  cx: number;
  cy: number;
  risk: number; // 0-100, the worst ward is 100
  open: number;
  funded: number; // open issues the remaining budget pays for
  needInr: number;
  leftInr: number;
  over: boolean;
  top: StageIssue[]; // the first few issues to fix
};

export type StageData = {
  width: number;
  height: number;
  wards: StageWard[];
  roads: { d: string; ward: string; hot: boolean; name: string }[]; // hot: has open issues
  dots: { x: number; y: number; ward: string; rank: number; funded: boolean }[];
};
