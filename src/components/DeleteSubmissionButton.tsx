import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeleteSubmission } from "../hooks/useChallenges";
import { useToast } from "./use-toast";
import { cn, submissionActionClass } from "../lib/utils";
import type { UserSubmission } from "../types/challenge";

// Render only for the submitter or an admin; the backend refuses anyone else.
const DeleteSubmissionButton = ({
  submission,
  className = "",
}: {
  submission: UserSubmission;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const deleteSubmission = useDeleteSubmission();

  const handleDelete = () => {
    if (!window.confirm(t("submission.deleteConfirm", { name: submission.name }))) {
      return;
    }
    deleteSubmission.mutate(
      { submissionId: submission.id, challengeId: submission.challenge_id },
      {
        onSuccess: () => success(t("submission.deleted")),
        onError: (error) => showError(t("submission.deleteFailed"), error.message),
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleteSubmission.isPending}
      className={cn(
        submissionActionClass,
        "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
        className
      )}
    >
      <Trash2 className="w-3 h-3 mr-1" />
      {deleteSubmission.isPending ? t("submission.deleting") : t("submission.delete")}
    </button>
  );
};

export default DeleteSubmissionButton;
