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
  // Keep some legacy fields for backward compatibility
  name?: string;
  startDate?: string;
  endDate?: string;
  totalSubmissions?: number;
  maxSubmissionsPerTeam?: number;
  evaluationMetric?: string;
}

// API response structure for user submissions
export interface UserSubmission {
  user_id: string;
  model_id: string;
  challenge_id: string;
  description: string;
  dataset_url: string;
  status: "pending" | "processing" | "completed" | "failed";
  status_message: string;
  id: string;
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
  file: File;
  model_name: string;
  challenge_id: string;
  description: string;
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

// One problem the backend found in the Challenge data (422 `errors`).
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
