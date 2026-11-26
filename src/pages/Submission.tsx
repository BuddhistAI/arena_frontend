import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "../components/use-toast";
import { ArrowLeft, Upload, CheckCircle, Info } from "lucide-react";
import {
  useChallenge,
  usePreferredModels,
  useSubmitToChallenge,
  useUserSubmissions,
} from "../hooks/useChallenges";
import { useAuth } from "../auth/use-auth-hook";
import { useTranslation } from "react-i18next";
import {
  SubmissionCreateError,
  SubmissionLimitError,
} from "../api/challenge";
import OwnSubmissionsList from "../components/OwnSubmissionsList";
import {
  DailyLimitNotice,
  FieldErrors,
  RejectionNotice,
} from "../components/SubmissionNotices";
import {
  ModelFields,
  PreferredModelAndLicenseFields,
  PromptFields,
  SkillFields,
} from "../components/SubmissionTypeFields";
import {
  hintClass,
  inputClass,
  labelClass,
} from "../components/submissionFormClasses";
import {
  type ChallengeDataError,
  type SubmissionLicense,
  type SubmissionRequest,
  type SubmissionType,
} from "../types/challenge";

const SUBMISSION_TYPES: SubmissionType[] = ["model", "prompt", "skill"];
const DEFAULT_LICENSE: SubmissionLicense = "CC-BY-4.0";
// Form fields that show their errors under the input; any other field's
// errors are listed with the summary.
const INLINE_FIELDS = [
  "name",
  "description",
  "model_link",
  "prompt_text",
  "prompt_file",
  "skill_file",
  "preferred_model",
  "license",
  "predictions_file",
];

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
  const [skillFile, setSkillFile] = useState<File | null>(null);
  const [preferredModel, setPreferredModel] = useState("");
  const [license, setLicense] = useState<SubmissionLicense>(DEFAULT_LICENSE);
  const [dragActive, setDragActive] = useState(false);
  const isPrompt = submissionType === "prompt";
  const isSkill = submissionType === "skill";
  const isPromptOrSkill = isPrompt || isSkill;
  const { data: preferredModelSuggestions = [] } = usePreferredModels({
    enabled: isPromptOrSkill,
  });
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

  // The input is emptied so that choosing the same file again after removing
  // it fires another change.
  const handleArtifactFileChange =
    (setter: (file: File) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        withClear(setter)(file);
      }
      e.target.value = "";
    };

  // Only the chosen Submission Type's fields are sent; the backend refuses
  // the others.
  const typeFields = (): Partial<SubmissionRequest> => {
    if (!isPromptOrSkill) {
      return { model_link: modelLink.trim() || undefined };
    }
    const shared = { preferred_model: preferredModel.trim(), license };
    if (isSkill) {
      return { ...shared, skill_file: skillFile ?? undefined };
    }
    return {
      ...shared,
      ...(promptFile ? { prompt_file: promptFile } : { prompt_text: promptText }),
    };
  };

  const resetForm = () => {
    setPredictionsFile(null);
    setName("");
    setDescription("");
    setModelLink("");
    setPromptText("");
    setPromptFile(null);
    setSkillFile(null);
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

  const artifactReady = isPrompt
    ? !!promptFile || !!promptText.trim()
    : !isSkill || !!skillFile;
  const canSubmit =
    isAuthenticated &&
    !!predictionsFile &&
    !!name.trim() &&
    !!description.trim() &&
    artifactReady &&
    (!isPromptOrSkill || !!preferredModel.trim()) &&
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

            <fieldset>
              <legend className={labelClass}>{t("submission.typeLabel")}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SUBMISSION_TYPES.map((type) => {
                  const selected = submissionType === type;
                  return (
                    <label
                      key={type}
                      className={`block rounded-lg border p-3 transition-colors duration-200 ${
                        selected
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-neutral-300 dark:border-neutral-600"
                      } cursor-pointer`}
                    >
                      <input
                        type="radio"
                        name="submissionType"
                        value={type}
                        checked={selected}
                        onChange={() => withClear(setSubmissionType)(type)}
                        className="sr-only"
                      />
                      <span className="block font-medium text-neutral-700 dark:text-neutral-100">
                        {t(`submission.types.${type}.title`)}
                      </span>
                      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {t(`submission.types.${type}.hint`)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldErrors errors={errorsFor("type")} />
            </fieldset>

            <div>
              <label htmlFor="name" className={labelClass}>
                {t(isPromptOrSkill ? "submission.name" : "submission.modelName")} *
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
                    : isSkill
                    ? "submission.skillNamePlaceholder"
                    : "submission.modelNamePlaceholder"
                )}
                required
              />
              {!isPromptOrSkill && (
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
                rows={isPromptOrSkill ? 4 : 3}
                className={inputClass}
                placeholder={t(
                  isPrompt
                    ? "submission.promptDescriptionPlaceholder"
                    : isSkill
                    ? "submission.skillDescriptionPlaceholder"
                    : "submission.descriptionPlaceholder"
                )}
                required
              />
              {isPromptOrSkill && (
                <p className={hintClass}>
                  {t(
                    isSkill
                      ? "submission.skillDescriptionHint"
                      : "submission.promptDescriptionHint"
                  )}
                </p>
              )}
              <FieldErrors errors={errorsFor("description")} />
            </div>

            {!isPromptOrSkill && (
              <ModelFields
                modelLink={modelLink}
                onModelLinkChange={withClear(setModelLink)}
                errors={errorsFor("model_link")}
              />
            )}

            {isPrompt && (
              <PromptFields
                promptText={promptText}
                onPromptTextChange={withClear(setPromptText)}
                promptFile={promptFile}
                onPromptFileChange={handleArtifactFileChange(setPromptFile)}
                onPromptFileRemove={() => withClear(setPromptFile)(null)}
                errorsFor={errorsFor}
              />
            )}

            {isSkill && (
              <SkillFields
                skillFile={skillFile}
                onSkillFileChange={handleArtifactFileChange(setSkillFile)}
                onSkillFileRemove={() => withClear(setSkillFile)(null)}
                errors={errorsFor("skill_file")}
              />
            )}

            {isPromptOrSkill && (
              <PreferredModelAndLicenseFields
                preferredModel={preferredModel}
                onPreferredModelChange={withClear(setPreferredModel)}
                suggestions={preferredModelSuggestions}
                license={license}
                onLicenseChange={withClear(setLicense)}
                errorsFor={errorsFor}
              />
            )}

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

            {submissionError && (
              <RejectionNotice message={submissionError} errors={otherErrors} />
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

        {isAuthenticated && (
          <OwnSubmissionsList
            submissions={challengeSubmissions}
            repoUrl={challenge.repo_url}
          />
        )}
      </div>
    </div>
  );
};

export default Submission;
