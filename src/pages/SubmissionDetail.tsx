import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { SubmissionReadError, apiUrl } from "../api/challenge";
import { useResyncSubmission, useSubmissionDetail } from "../hooks/useChallenges";
import { useCurrentUser } from "../hooks/useUsers";
import SubmissionTypeBadge from "../components/SubmissionTypeBadge";
import DownloadButton from "../components/DownloadButton";
import { SubmissionStatusBadge } from "../components/SubmissionSummary";
import { useToast } from "../components/use-toast";
import { cn, submissionActionClass } from "../lib/utils";
import { formatMetric } from "../utils/formatMetric";
import type { SubmissionDetailView } from "../types/challenge";

const panelClass =
  "bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-5";
const headingClass =
  "text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3";

// One Submission's own page, opened from View Detail on its Leaderboard row:
// everything public about it, per Submission Type (RFC 3, View Detail).
const SubmissionDetail = () => {
  const { t } = useTranslation();
  const { challengeId = "", submissionId = "" } = useParams<{
    challengeId: string;
    submissionId: string;
  }>();
  const { data: submission, isLoading, error } = useSubmissionDetail(submissionId);

  if (isLoading) {
    return <Centered>{t("submissionDetail.loading")}</Centered>;
  }
  // A shared link to a deleted Submission says so, and nothing else.
  if (error instanceof SubmissionReadError && error.status === 410) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
          {t("submissionDetail.deleted")}
        </h1>
      </Centered>
    );
  }

  const backLink = (
    <Link
      to={`/leaderboard/${submission?.challenge_id ?? challengeId}`}
      className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {t("submissionDetail.back")}
    </Link>
  );

  if (error || !submission) {
    const notFound = error instanceof SubmissionReadError && error.status === 404;
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">{backLink}</div>
        <div className="text-center bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
            {notFound ? t("submissionDetail.notFound") : t("submissionDetail.loadFailed")}
          </h1>
          {notFound && (
            <p className="text-neutral-500 dark:text-neutral-400">
              {t("submissionDetail.notFoundDesc")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <div>{backLink}</div>
      <Header submission={submission} />
      {submission.status === "completed" ? (
        <Score submission={submission} />
      ) : (
        <Status submission={submission} />
      )}
      <section className={panelClass}>
        <h2 className={headingClass}>{t("submissionDetail.description")}</h2>
        <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
          {submission.description || t("submissionDetail.noDescription")}
        </p>
      </section>
      <Details submission={submission} />
      {submission.type === "prompt" && submission.prompt_text != null && (
        <PromptText text={submission.prompt_text} />
      )}
    </div>
  );
};

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="max-w-4xl mx-auto px-4 py-16 text-center text-neutral-600 dark:text-neutral-400">
    {children}
  </div>
);

// Rank, type, name, submitter and date.
const Header = ({ submission }: { submission: SubmissionDetailView }) => {
  const { t } = useTranslation();
  return (
    <header className="flex items-start gap-4">
      {submission.rank != null && (
        <div className="shrink-0 text-center">
          <div className="text-3xl font-bold text-neutral-700 dark:text-neutral-100">
            #{submission.rank}
          </div>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t("submissionDetail.rank")}
          </div>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <SubmissionTypeBadge type={submission.type} />
          <h1 className="text-2xl font-bold text-neutral-700 dark:text-neutral-100 break-words">
            {submission.name}
          </h1>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t("submissionDetail.submittedBy", { submitter: submission.submitter })}
          {" · "}
          {t("submissionDetail.submittedOn", {
            date: new Date(submission.created_at).toLocaleDateString(),
          })}
        </p>
      </div>
    </header>
  );
};

// The Headline Metric under the Scorer's label, then the Public Summary.
const Score = ({ submission }: { submission: SubmissionDetailView }) => {
  const { t } = useTranslation();
  const { scorer } = submission;
  return (
    <section className={panelClass}>
      <h2 className={headingClass}>{t("submissionDetail.score")}</h2>
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-sm text-neutral-500 dark:text-neutral-400">{scorer.label}</dt>
          <dd className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            {formatMetric(submission.headline_metric, scorer.format)}
          </dd>
        </div>
        {(submission.public_summary ?? []).map((entry) => (
          <div key={entry.key}>
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">{entry.label}</dt>
            <dd className="text-lg text-neutral-700 dark:text-neutral-200">
              {formatMetric(entry.value, entry.format)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

// Only the submitter and admins reach an unscored Submission: show where
// scoring stands, and why it failed.
const Status = ({ submission }: { submission: SubmissionDetailView }) => {
  const { t } = useTranslation();
  return (
    <section className={panelClass}>
      <SubmissionStatusBadge status={submission.status} />
      {submission.status === "failed" && submission.status_message && (
        <div className="mt-3 flex items-start text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 shrink-0" />
          <p>
            <span className="font-medium">{t("submission.scoringFailed")}:</span>{" "}
            {submission.status_message}
          </p>
        </div>
      )}
    </section>
  );
};

const ExternalAnchor = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 break-all"
  >
    <ExternalLink className="w-4 h-4 mr-1 shrink-0" />
    {children}
  </a>
);

// The link, Preferred Model and licence, per Submission Type. A sync that is
// pending or failed only hides the repo link: the Submission looks complete.
const Details = ({ submission }: { submission: SubmissionDetailView }) => {
  const { t } = useTranslation();
  const isModel = submission.type === "model";
  const rows: { label: string; value: ReactNode }[] = isModel
    ? [
        {
          label: t("submissionDetail.modelLink"),
          value: submission.model_link ? (
            <ExternalAnchor href={submission.model_link}>{submission.model_link}</ExternalAnchor>
          ) : (
            "—"
          ),
        },
      ]
    : [
        ...(submission.repo_url
          ? [
              {
                label: t("submissionDetail.repoFolder"),
                value: (
                  <ExternalAnchor href={submission.repo_url}>
                    {t("submission.repoFolder")}
                  </ExternalAnchor>
                ),
              },
            ]
          : []),
        { label: t("submission.preferredModel"), value: submission.preferred_model ?? "—" },
        { label: t("submission.license"), value: submission.license ?? "—" },
      ];

  return (
    <section className={panelClass}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className={cn(headingClass, "mb-0")}>{t("submissionDetail.details")}</h2>
        <div className="flex items-center gap-2">
          {submission.download_url && <DownloadButton href={apiUrl(submission.download_url)} />}
          <AdminResync submission={submission} />
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-neutral-500 dark:text-neutral-400">{row.label}</dt>
            <dd className="text-neutral-700 dark:text-neutral-200 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

// Admins fix a failed sync where they see it. Submitters are not told about
// sync failures: they cannot fix them.
const AdminResync = ({ submission }: { submission: SubmissionDetailView }) => {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const resync = useResyncSubmission();
  const { success, error: showError } = useToast();

  const isAdmin = currentUser?.data?.role === "admin";
  if (!isAdmin || submission.status !== "completed" || submission.sync_status !== "failed") {
    return null;
  }
  return (
    <>
      <span className="text-xs text-red-600 dark:text-red-400">
        {t("submissionDetail.syncFailed")}
      </span>
      <button
        type="button"
        onClick={() =>
          resync.mutate(submission, {
            onSuccess: () => success(t("submissionDetail.resyncQueued")),
            onError: (error) => showError(t("submission.resyncFailed"), error.message),
          })
        }
        disabled={resync.isPending}
        className={cn(
          submissionActionClass,
          "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
        )}
      >
        <RefreshCw className={cn("w-3 h-3 mr-1", resync.isPending && "animate-spin")} />
        {t("submission.resync")}
      </button>
    </>
  );
};

// A Prompt's text inline, to read and reuse without downloading it.
const PromptText = ({ text }: { text: string }) => {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError(t("submissionDetail.copyFailed"), error instanceof Error ? error.message : "");
    }
  };

  return (
    <section className={panelClass}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn(headingClass, "mb-0")}>{t("submissionDetail.prompt")}</h2>
        <button
          type="button"
          onClick={copy}
          className={cn(
            submissionActionClass,
            "text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          )}
        >
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? t("submissionDetail.copied") : t("submissionDetail.copy")}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 rounded-md p-4 max-h-[32rem] overflow-auto">
        {text}
      </pre>
    </section>
  );
};

export default SubmissionDetail;
