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
  sync_status: "pending" | "synced" | "failed";
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

export type SubmissionType = "model" | "prompt" | "skill";

export type SubmissionStatus = "pending" | "processing" | "completed" | "failed";

// The licenses a Prompt or Skill may carry (SPDX ids); the backend refuses others.
export const SUBMISSION_LICENSES = ["CC-BY-4.0", "CC0-1.0", "MIT", "Apache-2.0"] as const;
export type SubmissionLicense = (typeof SUBMISSION_LICENSES)[number];

// A Submission as GET /submissions/{id} and /submissions/my return it.
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
  score_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
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

export interface Scorer {
  name: string;
  label: string;
  direction: ScorerDirection;
  parameter_schema: {
    type?: "object";
    properties?: Record<string, ScorerParameter>;
  };
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

export interface Model {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface SubmissionDetail {
  id: string;
  user_id: string;
  model_id: string;
  description: string;
  dataset_url: string;
  created_at: string;
  updated_at: string;
  model: Model;
}

export interface LeaderboardResult {
  id: string;
  type: "CER" | "WER" | "BLEU" | "ACCURACY" | string;
  user_id: string;
  submission_id: string;
  score: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  submission: SubmissionDetail;
}

export interface LeaderboardEntry {
  submission_id: string;
  model_name: string;
  user_id: string;
  description: string;
  created_at: string;
  metrics: {
    [key: string]: number; // CER, WER, etc.
  };
  rank?: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;
  success: boolean;
}
