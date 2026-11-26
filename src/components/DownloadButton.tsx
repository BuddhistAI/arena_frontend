import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { cn } from "../lib/utils";

// Downloads a Prompt or Skill. The API redirects to our storage, which serves
// it as an attachment named `<slug>-<id>.md` or `.zip`, so the page stays.
const DownloadButton = ({ href, className }: { href: string; className?: string }) => {
  const { t } = useTranslation();
  return (
    <a
      href={href}
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
