import type { DisplayFormat } from "../utils/formatMetric";

export interface Category {
  id: string;
  name: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  image_uri: string;
  category_id: string;
  created_by: string;
  ground_truth: string;
  status: "active" | "completed" | "upcoming";
  created_at: string;
  updated_at: string;
  category: Category;
  repo_name: string;
  repo_url: string;
  sync_status: SyncStatus;
  scorer_name?: string;
  scorer_label?: string;
  direction?: ScorerDirection;
  locked?: boolean;
  // Keep some legacy fields for backward compatibility
  name?: string;
  startDate?: string;
  endDate?: string;
  totalSubmissions?: number;
  maxSubmissionsPerTeam?: number;
  evaluationMetric?: string;
}

// Whether the Challenge Repo holds what the arena has published.
export type SyncStatus = "pending" | "synced" | "failed";

export type SubmissionType = "model" | "prompt" | "skill";

export type SubmissionStatus = "pending" | "processing" | "completed" | "failed";

// The licenses a Prompt or Skill may carry (SPDX ids); the backend refuses others.
export const SUBMISSION_LICENSES = ["CC-BY-4.0", "CC0-1.0", "MIT", "Apache-2.0"] as const;
export type SubmissionLicense = (typeof SUBMISSION_LICENSES)[number];

// A Submission as /submissions/my and the admin listing return it.
// `headline_metric` is unrounded; round it only for display.
export interface UserSubmission {
  id: string;
  user_id: string;
  challenge_id: string;
  type: SubmissionType;
  name: string;
  description: string | null;
  model_id: string | null;
  model_link: string | null;
  preferred_model: string | null;
  license: SubmissionLicense | null;
  status: SubmissionStatus;
  status_message: string | null;
  headline_metric: number | null;
  // The Scorer's Public Summary once completed; per-item scores are never sent.
  public_summary: PublicSummaryValue[] | null;
  // The Submission's folder in the Challenge Repo, set once synced.
  repo_path: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

// GET /submissions/{id}: everything public about one Submission, for its
// detail page. A scored one is public; one pending, processing or failed
// reaches only its submitter and admins. Never holds per-item scores.
export interface SubmissionDetailView {
  id: string;
  challenge_id: string;
  // Its Rank on the Challenge's Leaderboard; null until scored.
  rank: number | null;
  type: SubmissionType;
  name: string;
  submitter: string;
  created_at: string;
  description: string | null;
  status: SubmissionStatus;
  status_message: string | null;
  scorer: LeaderboardScorer;
  headline_metric: number | null;
  public_summary: PublicSummaryValue[] | null;
  model_link: string | null;
  preferred_model: string | null;
  license: SubmissionLicense | null;
  sync_status: SyncStatus;
  // The Submission's folder in the Challenge Repo on GitHub; null until synced.
  repo_url: string | null;
  // Prompt only: the prompt's text.
  prompt_text: string | null;
  // Prompt and Skill: where to download it, relative to the API root; null for a Model.
  download_url: string | null;
}

// Legacy submission interface (keeping for compatibility)
export interface Submission {
  id: string;
  challengeId: string;
  modelName: string;
  teamName: string;
  cer: number;
  accuracy?: number;
  f1Score?: number;
  submissionDate: string;
  rank: number;
  status: "processing" | "evaluated" | "failed";
  fileName: string;
  fileSize: number;
}

export interface SubmissionRequest {
  challenge_id: string;
  type: SubmissionType;
  name: string;
  description: string;
  model_link?: string;
  // Prompt and Skill only.
  preferred_model?: string;
  license?: SubmissionLicense;
  // Prompt only. Send the prompt as `prompt_text` or `prompt_file`, not both.
  prompt_text?: string;
  prompt_file?: File;
  // Skill only: the skill folder as a zip.
  skill_file?: File;
  predictions_file: File;
}

// POST /submissions/create-submission answers 202 with this.
export interface SubmissionCreatedResponse {
  id: string;
  status: SubmissionStatus;
  message: string;
}

export interface ChallengeCreateRequest {
  title: string;
  category_id: string;
  image_uri: string;
  description: string;
  status: "active" | "completed" | "upcoming";
  scorer_name: string;
  scorer_params: Record<string, unknown>;
  inputs_file: File;
  ground_truth_file: File;
  media_archive_file?: File;
}

// A Scorer from buddhist-eval, as listed by GET /scorers.
export type ScorerDirection = "lower_is_better" | "higher_is_better";

export interface ScorerParameter {
  type?: "string" | "number" | "integer" | "boolean";
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  enum?: unknown[];
}

// One aggregate number a Scorer declares safe to show beside the Headline Metric.
export interface PublicSummaryEntry {
  key: string;
  label: string;
  format: DisplayFormat;
}

// A Public Summary entry of a scored Submission, with its value.
export interface PublicSummaryValue extends PublicSummaryEntry {
  value: number;
}

export interface Scorer {
  name: string;
  label: string;
  direction: ScorerDirection;
  display_format: DisplayFormat;
  public_summary: PublicSummaryEntry[];
  parameter_schema: {
    type?: "object";
    properties?: Record<string, ScorerParameter>;
  };
}

// GET /challenges/{id}/leaderboard: one page of a Challenge's Leaderboard,
// ranked on the server. A row's `rank` is its Rank on the whole Leaderboard, whatever the filter.
export interface LeaderboardScorer {
  name: string;
  label: string;
  direction: ScorerDirection;
  display_format: DisplayFormat;
  public_summary: PublicSummaryEntry[];
}

export interface LeaderboardRow {
  submission_id: string;
  rank: number;
  type: SubmissionType;
  name: string;
  submitter: string;
  created_at: string;
  headline_metric: number;
  preferred_model: string | null;
  // Prompt and Skill: where to download, relative to the API root; null for a Model.
  download_url: string | null;
}

// How many rows the whole Leaderboard holds, in all and per Submission Type,
// whatever the type filter, search and page.
export interface LeaderboardCounts {
  all: number;
  model: number;
  prompt: number;
  skill: number;
}

// Which rows of a Leaderboard to show. Neither changes a row's Rank.
export interface LeaderboardFilter {
  type?: SubmissionType; // omitted for All
  q?: string; // matches name, submitter or Preferred Model, ignoring case
}

export interface RankedLeaderboard {
  scorer: LeaderboardScorer;
  counts: LeaderboardCounts;
  // Rows the type filter and search show, on all pages together.
  total: number;
  page: number;
  limit: number;
  rows: LeaderboardRow[];
}

// One problem the backend found in uploaded Challenge or Submission data
// (422 `errors`).
export interface ChallengeDataError {
  field: string;
  message: string;
  line?: number | null;
  id?: string | null;
}

export interface ChallengeUpdateRequest {
  title?: string;
  category_id?: string;
  image_uri?: string;
  description?: string;
  status?: "active" | "completed" | "upcoming";
  ground_truth_file?: File;
}

export interface CategoryCreateRequest {
  name: string;
}

export interface SubmissionResponse {
  id: string;
  user_id: string;
  model_name: string;
  challenge_id: string;
  description: string;
  file_path: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

