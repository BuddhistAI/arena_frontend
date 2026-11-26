import { useTranslation } from "react-i18next";
import DeleteSubmissionButton from "./DeleteSubmissionButton";
import {
  SubmissionRepoLink,
  SubmissionScore,
  SubmissionStatusBadge,
} from "./SubmissionSummary";
import type { UserSubmission } from "../types/challenge";

// The participant's own Submissions to one Challenge, newest first as given.
const OwnSubmissionsList = ({
  submissions,
  repoUrl,
  scorerName,
}: {
  submissions: UserSubmission[];
  repoUrl?: string;
  scorerName?: string;
}) => {
  const { t } = useTranslation();
  return (
    <section className="mt-8 mb-8">
      <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
        {t("submission.yourSubmissions")}
      </h2>
      {submissions.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          {t("submission.noneYet")}
        </p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-neutral-700 dark:text-neutral-100">
                  {submission.name}
                </span>
                <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t(`submission.types.${submission.type}.title`)}
                </span>
                <SubmissionStatusBadge status={submission.status} />
                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(submission.created_at).toLocaleString()}
                </span>
              </div>
              <SubmissionScore submission={submission} scorerName={scorerName} />
              <div className="flex flex-wrap items-center gap-3">
                <SubmissionRepoLink submission={submission} repoUrl={repoUrl} />
                <DeleteSubmissionButton submission={submission} className="ml-auto" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OwnSubmissionsList;
