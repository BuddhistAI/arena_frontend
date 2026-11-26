import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { cn } from "../lib/utils";
import { apiUrl } from "../api/challenge";

// Downloads a Prompt or Skill from the `download_url` the API gives it
// (relative to the API root). The API redirects to our storage, which serves
// it as an attachment named `<slug>-<id>.md` or `.zip`, so the page stays.
const DownloadButton = ({ path, className }: { path: string; className?: string }) => {
  const { t } = useTranslation();
  return (
    <a
      href={apiUrl(path)}
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs font-medium rounded text-primary-700 dark:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20",
        className
      )}
    >
      <Download className="w-3 h-3 mr-1" />
      {t("submission.download")}
    </a>
  );
};

export default DownloadButton;
