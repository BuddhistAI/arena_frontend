import { useTranslation } from "react-i18next";
import type { SubmissionType } from "../types/challenge";

const CLASSES: Record<SubmissionType, string> = {
  model: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  prompt: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  skill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// Tells a Model, a Prompt and a Skill Submission apart at a glance.
const SubmissionTypeBadge = ({ type }: { type: SubmissionType }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CLASSES[type]}`}
    >
      {t(`submissionType.${type}`)}
    </span>
  );
};

export default SubmissionTypeBadge;
