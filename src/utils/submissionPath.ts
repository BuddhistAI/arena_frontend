// The detail page of one Submission: its own URL, so a specific Prompt or
// Skill can be shared. Opened from View Detail on its Leaderboard row.
export const SUBMISSION_DETAIL_ROUTE =
  "/leaderboard/:challengeId/submissions/:submissionId";

export const submissionDetailPath = (challengeId: string, submissionId: string) =>
  `/leaderboard/${challengeId}/submissions/${submissionId}`;
