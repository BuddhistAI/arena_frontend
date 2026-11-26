import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChallengeDataError } from "../types/challenge";

export const FieldErrors = ({ errors }: { errors: ChallengeDataError[] }) => {
  const { t } = useTranslation();
  if (errors.length === 0) return null;
  return (
    <ul role="alert" className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400">
      {errors.map((err, index) => (
        <li key={index} className="flex items-start">
          <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 shrink-0" />
          <span>
            {err.line != null && `${t("submission.line", { line: err.line })}: `}
            {err.id != null && `${t("submission.inputId", { id: err.id })}: `}
            {err.message}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const DailyLimitNotice = ({ resetAt }: { resetAt: Date }) => {
  const { t, i18n } = useTranslation();
  const known = !Number.isNaN(resetAt.getTime());
  const format = (options: Intl.DateTimeFormatOptions) =>
    resetAt.toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
      ...options,
    });
  return (
    <div
      role="alert"
      className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
    >
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 shrink-0" />
        <div className="text-yellow-800 dark:text-yellow-300">
          <p className="font-medium">{t("submission.limitReached")}</p>
          {known && (
            <p className="text-sm mt-1">
              {t("submission.limitResetsAt", {
                local: format({}),
                utc: format({ timeZone: "UTC" }),
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// The summary of a refused Submission, with the errors of fields that have
// no place of their own in the form.
export const RejectionNotice = ({
  message,
  errors,
}: {
  message: string;
  errors: ChallengeDataError[];
}) => (
  <div
    role="alert"
    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
  >
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 shrink-0" />
      <p className="text-red-800 dark:text-red-400">{message}</p>
    </div>
    <FieldErrors errors={errors} />
  </div>
);
