import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../components/use-toast";
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Info, X } from "lucide-react";
import {
  useChallenge,
  useSubmitToChallenge,
  useUserSubmissions,
} from "../hooks/useChallenges";
import { useAuth } from "../auth/use-auth-hook";
import { useTranslation } from "react-i18next";
import {
  SubmissionCreateError,
  SubmissionLimitError,
} from "../api/challenge";
import {
  SubmissionRepoLink,
  SubmissionScore,
  SubmissionStatusBadge,
} from "../components/SubmissionSummary";
import {
  SUBMISSION_LICENSES,
  type ChallengeDataError,
  type SubmissionLicense,
  type SubmissionRequest,
  type SubmissionType,
} from "../types/challenge";

const SUBMISSION_TYPES: SubmissionType[] = ["model", "prompt", "skill"];
// Skill Submissions arrive in a later ticket.
const ACCEPTED_TYPES: SubmissionType[] = ["model", "prompt"];
const DEFAULT_LICENSE: SubmissionLicense = "CC-BY-4.0";
// Form fields that show their errors under the input; any other field's
// errors are listed with the summary.
const INLINE_FIELDS = [
  "name",
  "description",
  "model_link",
  "prompt_text",
  "prompt_file",
  "preferred_model",
  "license",
  "predictions_file",
];

const inputClass =
  "w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";
const labelClass =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2";
const hintClass = "mt-1 text-sm text-neutral-500 dark:text-neutral-400";

const FieldErrors = ({ errors }: { errors: ChallengeDataError[] }) => {
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

const DailyLimitNotice = ({ resetAt }: { resetAt: Date }) => {
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

const Submission = () => {
  const documentation_link=`${import.meta.env.VITE_SERVER_URL || "https://eval-api.pecha.tools"}/documentation`
  const { t } = useTranslation();

  const { challengeId } = useParams<{ challengeId: string }>();
  const { isAuthenticated, login } = useAuth();
  const { success } = useToast();

  const {
    data: challengeResponse,
    isLoading: challengeLoading,
    error: challengeError,
  } = useChallenge(challengeId || "");

  const submitMutation = useSubmitToChallenge();
  const { data: mySubmissionsResponse } = useUserSubmissions({
    enabled: isAuthenticated,
  });

  const challenge = challengeResponse?.data;
  const challengeSubmissions = (mySubmissionsResponse?.data ?? [])
    .filter((submission) => submission.challenge_id === challengeId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const [submissionType, setSubmissionType] = useState<SubmissionType>("model");
  const [predictionsFile, setPredictionsFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelLink, setModelLink] = useState("");
  const [promptText, setPromptText] = useState("");
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [preferredModel, setPreferredModel] = useState("");
  const [license, setLicense] = useState<SubmissionLicense>(DEFAULT_LICENSE);
  const [dragActive, setDragActive] = useState(false);
  const isPrompt = submissionType === "prompt";
  const [submissionError, setSubmissionError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ChallengeDataError[]>([]);
  const [limitResetAt, setLimitResetAt] = useState<Date | null>(null);

  const errorsFor = (field: string) =>
    fieldErrors.filter((err) => err.field === field);
  const otherErrors = fieldErrors.filter(
    (err) => !INLINE_FIELDS.includes(err.field)
  );

  const clearErrors = () => {
    setSubmissionError("");
    setFieldErrors([]);
  };

  // Wraps a field setter so that editing a field clears the last errors.
  const withClear =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      clearErrors();
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      withClear(setPredictionsFile)(file);
    }
  };

  const handlePromptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      withClear(setPromptFile)(file);
    }
    e.target.value = "";
  };

  // Only the chosen Submission Type's fields are sent; the backend refuses
  // the others.
  const typeFields = (): Partial<SubmissionRequest> =>
    isPrompt
      ? {
          preferred_model: preferredModel.trim(),
          license,
          ...(promptFile ? { prompt_file: promptFile } : { prompt_text: promptText }),
        }
      : { model_link: modelLink.trim() || undefined };

  const resetForm = () => {
    setPredictionsFile(null);
    setName("");
    setDescription("");
    setModelLink("");
    setPromptText("");
    setPromptFile(null);
    setPreferredModel("");
    setLicense(DEFAULT_LICENSE);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      withClear(setPredictionsFile)(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      if (window.confirm(t("submission.loginConfirm"))) {
        login(false);
      }
      return;
    }
    if (!predictionsFile || !challengeId) {
      return;
    }
    clearErrors();
    setLimitResetAt(null);

    try {
      await submitMutation.mutateAsync({
        challenge_id: challengeId,
        type: submissionType,
        name: name.trim(),
        description: description.trim(),
        ...typeFields(),
        predictions_file: predictionsFile,
      });
      success(t("submission.accepted"), t("submission.acceptedDesc"), 7000);
      resetForm();
    } catch (error) {
      if (error instanceof SubmissionLimitError) {
        setLimitResetAt(error.resetAt);
      } else if (error instanceof SubmissionCreateError) {
        setSubmissionError(error.message);
        setFieldErrors(error.errors);
      } else {
        setSubmissionError(
          error instanceof Error ? error.message : "Submission failed."
        );
      }
    }
  };

  const promptReady =
    (!!promptFile || !!promptText.trim()) && !!preferredModel.trim();
  const canSubmit =
    isAuthenticated &&
    ACCEPTED_TYPES.includes(submissionType) &&
    !!predictionsFile &&
    !!name.trim() &&
    !!description.trim() &&
    (!isPrompt || promptReady) &&
    !submitMutation.isPending;

  if (challengeLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-neutral-300 mx-auto"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Loading challenge details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (challengeError || !challenge) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <Link
              to="/challenges"
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Challenges
            </Link>
          </div>
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
                Error Loading Challenge
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">
                {!challenge
                  ? "Challenge not found."
                  : "Failed to load challenge details. Please try again later."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (challenge.status !== "active") {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <Link
              to="/challenges"
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Challenges
            </Link>
          </div>
          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                Submissions Not Available
              </h2>
              <p className="text-yellow-700">
                This challenge is currently {challenge.status}.
                {challenge.status === "upcoming" &&
                  challenge.startDate &&
                  ` Submissions will open on ${new Date(
                    challenge.startDate
                  ).toLocaleDateString()}.`}
                {challenge.status === "completed" &&
                  challenge.endDate &&
                  ` Submissions closed on ${new Date(
                    challenge.endDate
                  ).toLocaleDateString()}.`}
              </p>
              <Link
                to={`/leaderboard/${challengeId}`}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-0">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link
            to="/benchmark_eval"
            className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Challenges
          </Link>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-primary-600 text-white px-6 py-6">
            <h1 className="text-2xl font-bold mb-2">
              {t("submission.title", { title: challenge.title || challenge.name })}
            </h1>
            <p className="text-neutral-300">{t("submission.subtitle")}</p>
            {challenge.scorer_label && (
              <p className="mt-3 text-sm text-neutral-300">
                {t("submission.scorer", { label: challenge.scorer_label })}
                {challenge.direction &&
                  ` (${t(
                    challenge.direction === "lower_is_better"
                      ? "submission.lowerIsBetter"
                      : "submission.higherIsBetter"
                  )})`}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Challenge Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {challenge.description}
                </p>
              </div>
            </div>

            {/* Submission Type */}
            <fieldset>
              <legend className={labelClass}>{t("submission.typeLabel")}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SUBMISSION_TYPES.map((type) => {
                  const accepted = ACCEPTED_TYPES.includes(type);
                  const selected = submissionType === type;
                  return (
                    <label
                      key={type}
                      className={`block rounded-lg border p-3 transition-colors duration-200 ${
                        selected
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-neutral-300 dark:border-neutral-600"
                      } ${accepted ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                    >
                      <input
                        type="radio"
                        name="submissionType"
                        value={type}
                        checked={selected}
                        disabled={!accepted}
                        onChange={() => withClear(setSubmissionType)(type)}
                        className="sr-only"
                      />
                      <span className="block font-medium text-neutral-700 dark:text-neutral-100">
                        {t(`submission.types.${type}.title`)}
                      </span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {accepted
                          ? t(`submission.types.${type}.hint`)
                          : t("submission.notYetAvailable")}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldErrors errors={errorsFor("type")} />
            </fieldset>

            {/* Name */}
            <div>
              <label htmlFor="name" className={labelClass}>
                {t(isPrompt ? "submission.name" : "submission.modelName")} *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => withClear(setName)(e.target.value)}
                className={inputClass}
                placeholder={t(
                  isPrompt
                    ? "submission.promptNamePlaceholder"
                    : "submission.modelNamePlaceholder"
                )}
                required
              />
              {!isPrompt && (
                <p className={hintClass}>{t("submission.modelNameHint")}</p>
              )}
              <FieldErrors errors={errorsFor("name")} />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className={labelClass}>
                {t("submission.description")} *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => withClear(setDescription)(e.target.value)}
                rows={isPrompt ? 4 : 3}
                className={inputClass}
                placeholder={t(
                  isPrompt
                    ? "submission.promptDescriptionPlaceholder"
                    : "submission.descriptionPlaceholder"
                )}
                required
              />
              {isPrompt && (
                <p className={hintClass}>{t("submission.promptDescriptionHint")}</p>
              )}
              <FieldErrors errors={errorsFor("description")} />
            </div>

            {/* Model Link */}
            {!isPrompt && (
              <div>
                <label htmlFor="modelLink" className={labelClass}>
                  {t("submission.modelLink")}
                </label>
                <input
                  type="url"
                  id="modelLink"
                  value={modelLink}
                  onChange={(e) => withClear(setModelLink)(e.target.value)}
                  className={inputClass}
                  placeholder="https://huggingface.co/..."
                />
                <p className={hintClass}>{t("submission.modelLinkHint")}</p>
                <FieldErrors errors={errorsFor("model_link")} />
              </div>
            )}

            {isPrompt && (
              <>
                {/* Prompt: typed or uploaded, exactly one */}
                <div>
                  <label htmlFor="promptText" className={labelClass}>
                    {t("submission.prompt")} *
                  </label>
                  <textarea
                    id="promptText"
                    value={promptText}
                    onChange={(e) => withClear(setPromptText)(e.target.value)}
                    rows={8}
                    disabled={!!promptFile}
                    className={`${inputClass} font-mono text-sm disabled:opacity-50`}
                    placeholder={t("submission.promptPlaceholder")}
                  />
                  <p className={hintClass}>
                    {promptFile
                      ? t("submission.usingPromptFile")
                      : t("submission.promptHint")}
                  </p>
                  <FieldErrors errors={errorsFor("prompt_text")} />

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="promptFile"
                      className="inline-flex items-center px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors duration-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {t("submission.promptFileLabel")}
                    </label>
                    <input
                      id="promptFile"
                      type="file"
                      accept=".md,.txt,text/markdown,text/plain"
                      onChange={handlePromptFileChange}
                      className="sr-only"
                    />
                    {promptFile && (
                      <span className="inline-flex items-center text-sm text-neutral-700 dark:text-neutral-200">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
                        {promptFile.name}
                        <button
                          type="button"
                          onClick={() => withClear(setPromptFile)(null)}
                          className="ml-2 inline-flex items-center text-neutral-500 hover:text-red-600"
                          aria-label={t("submission.removeFile")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  <FieldErrors errors={errorsFor("prompt_file")} />
                </div>

                {/* Preferred Model */}
                <div>
                  <label htmlFor="preferredModel" className={labelClass}>
                    {t("submission.preferredModel")} *
                  </label>
                  <input
                    type="text"
                    id="preferredModel"
                    value={preferredModel}
                    onChange={(e) => withClear(setPreferredModel)(e.target.value)}
                    className={inputClass}
                    placeholder={t("submission.preferredModelPlaceholder")}
                    required
                  />
                  <p className={hintClass}>{t("submission.preferredModelHint")}</p>
                  <FieldErrors errors={errorsFor("preferred_model")} />
                </div>

                {/* License */}
                <div>
                  <label htmlFor="license" className={labelClass}>
                    {t("submission.license")} *
                  </label>
                  <select
                    id="license"
                    value={license}
                    onChange={(e) =>
                      withClear(setLicense)(e.target.value as SubmissionLicense)
                    }
                    className={inputClass}
                    required
                  >
                    {SUBMISSION_LICENSES.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                  <p className={hintClass}>{t("submission.licenseHint")}</p>
                  <FieldErrors errors={errorsFor("license")} />
                </div>
              </>
            )}

            {/* Predictions File */}
            <div>
              <label htmlFor="fileInput" className={labelClass}>
                {t("submission.predictionsFile")} *
              </label>

              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ${
                  dragActive
                    ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
                    : predictionsFile
                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                    : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".jsonl,application/jsonl"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div
                  className="text-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      document.getElementById("fileInput")?.click();
                    }
                  }}
                >
                  {predictionsFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-100">
                        {predictionsFile.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {(predictionsFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-neutral-400 mb-2" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-100">
                        {t("submission.dropFile")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <p className={hintClass}>
                {t("submission.predictionsHint")}{" "}
                <a
                  href={documentation_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2"
                >
                  {t("navigation.documentation")}
                </a>
              </p>
              <FieldErrors errors={errorsFor("predictions_file")} />
            </div>

            {/* Authentication Notice */}
            {!isAuthenticated && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                  <button
                    type="button"
                    onClick={() => login(false)}
                    className="text-sm text-blue-800 dark:text-blue-400 underline hover:text-blue-900 dark:hover:text-blue-300"
                  >
                    {t("submission.loginPrompt")}
                  </button>
                </div>
              </div>
            )}

            {limitResetAt && <DailyLimitNotice resetAt={limitResetAt} />}

            {/* Rejection summary */}
            {submissionError && (
              <div
                role="alert"
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 shrink-0" />
                  <p className="text-red-800 dark:text-red-400">{submissionError}</p>
                </div>
                <FieldErrors errors={otherErrors} />
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                to={`/leaderboard/${challengeId}`}
                className="px-6 py-2 text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors duration-200"
              >
                View Leaderboard
              </Link>

              <button
                type="submit"
                disabled={isAuthenticated && !canSubmit}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
              >
                {submitMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("submission.submitting")}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {isAuthenticated
                      ? t("submission.submit")
                      : t("submission.loginToSubmit")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* The participant's own Submissions to this Challenge */}
        {isAuthenticated && (
          <section className="mt-8 mb-8">
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
              {t("submission.yourSubmissions")}
            </h2>
            {challengeSubmissions.length === 0 ? (
              <p className="text-neutral-500 dark:text-neutral-400">
                {t("submission.noneYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {challengeSubmissions.map((submission) => (
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
                    <SubmissionScore submission={submission} />
                    <SubmissionRepoLink
                      submission={submission}
                      repoUrl={challenge?.repo_url}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Submission;
