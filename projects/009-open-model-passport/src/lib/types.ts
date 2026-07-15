export type Confidence = "verified" | "reported";
export type Answer = "yes" | "no" | "conditional";
export type WeightsStatus = "open" | "gated" | "api-only";

export interface Sourced {
  note: string;
  source: string;
  asOf: string;
  confidence: Confidence;
}

export interface Weights extends Sourced {
  status: WeightsStatus;
}

export interface Licence extends Sourced {
  id: string;
  name: string;
  commercialUse: Answer;
  redistribution: Answer;
  derivatives: Answer;
}

export interface Training extends Sourced {
  /** Disclosed training compute in FLOP, or null when the provider published none. */
  computeFlop: number | null;
}

export interface Hosting {
  selfHostable: boolean;
  majorClouds: string[];
  note: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  vendor: string;
  params: string;
  weights: Weights;
  licence: Licence;
  training: Training;
  hosting: Hosting;
  headline: string;
}

/** What the user actually wants to do. The verdict is intent x facts. */
export interface Intent {
  commercial: boolean;
  selfHost: boolean;
  fineTune: boolean;
  redistribute: boolean;
  serveEu: boolean;
}

export type Clearance = "clear" | "conditions" | "blocked";

export interface Finding {
  /** Which intent or regime raised this. */
  area: string;
  clearance: Clearance;
  title: string;
  detail: string;
  source: string;
  asOf: string;
  confidence: Confidence;
}

export interface Passport {
  model: ModelRecord;
  clearance: Clearance;
  summary: string;
  findings: Finding[];
}
