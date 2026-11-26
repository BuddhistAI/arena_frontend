import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import JsonViewer from "./JsonViewer";
import { formatMetric } from "../lib/utils";
import type { SubmissionStatus, UserSubmission } from "../types/challenge";

const BADGE_STYLES: Record<SubmissionStatus, string> = {
  completed:
    "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
  processing:
    "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400",
  pending: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
  failed: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
};

const BADGE_ICONS: Record<SubmissionStatus, typeof Clock> = {
  completed: CheckCircle,
  processing: Clock,
  pending: Clock,
  failed: XCircle,
};

export const SubmissionStatusBadge = ({ status }: { status: SubmissionStatus }) => {
  const { t } = useTranslation();
  const Icon = BADGE_ICONS[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[status]}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {t(`submission.status.${status}`)}
    </span>
  );
};

// The details' top-level numbers (e.g. corpus CER beside the mean), shown
// next to the Headline Metric; nested details stay in the full view.
const scalarDetails = (details: Record<string, unknown>) =>
  Object.entries(details).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );

// A Submission's result: the Headline Metric and details once completed,
// the error once failed, nothing while it is being scored.
export const SubmissionScore = ({ submission }: { submission: UserSubmission }) => {
  const { t } = useTranslation();

  if (submission.status === "failed") {
    return (
      <div className="flex items-start text-sm text-red-700 dark:text-red-400">
        <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 shrink-0" />
        <p>
          <span className="font-medium">{t("submission.scoringFailed")}:</span>{" "}
          {submission.status_message}
        </p>
      </div>
    );
  }
  if (submission.status !== "completed" || submission.headline_metric == null) {
    return null;
  }

  const details = submission.score_details ?? {};
  return (
    <div className="text-sm space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p>
          <span className="text-neutral-500 dark:text-neutral-400">
            {t("submission.headlineMetric")}:
          </span>{" "}
          <span className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {formatMetric(submission.headline_metric)}
          </span>
        </p>
        {scalarDetails(details).map(([name, value]) => (
          <p key={name} className="text-neutral-600 dark:text-neutral-300">
            <span className="text-neutral-500 dark:text-neutral-400">{name}:</span>{" "}
            {formatMetric(value)}
          </p>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-neutral-500 dark:text-neutral-400">
          {t("submission.details")}
        </summary>
        <div className="mt-2 max-h-64 overflow-auto text-xs">
          <JsonViewer json={details} />
        </div>
      </details>
    </div>
  );
};
