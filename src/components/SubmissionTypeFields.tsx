import { CheckCircle, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldErrors } from "./SubmissionNotices";
import { hintClass, inputClass, labelClass } from "./submissionFormClasses";
import {
  SUBMISSION_LICENSES,
  type ChallengeDataError,
  type SubmissionLicense,
} from "../types/challenge";

type ErrorsFor = (field: string) => ChallengeDataError[];
type FileChange = (e: React.ChangeEvent<HTMLInputElement>) => void;

// An upload button for an Artifact file, and the chosen file with a button
// to remove it.
const ArtifactFileInput = ({
  id,
  label,
  accept,
  file,
  detail,
  onChange,
  onRemove,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  detail?: string;
  onChange: FileChange;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <label
        htmlFor={id}
        className="inline-flex items-center px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors duration-200"
      >
        <Upload className="w-4 h-4 mr-2" />
        {label}
      </label>
      <input id={id} type="file" accept={accept} onChange={onChange} className="sr-only" />
      {file && (
        <span className="inline-flex items-center text-sm text-neutral-700 dark:text-neutral-200">
          <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
          {file.name}
          {detail}
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 inline-flex items-center text-neutral-500 hover:text-red-600"
            aria-label={t("submission.removeFile")}
          >
            <X className="w-4 h-4" />
          </button>
        </span>
      )}
    </>
  );
};

export const ModelFields = ({
  modelLink,
  onModelLinkChange,
  errors,
}: {
  modelLink: string;
  onModelLinkChange: (value: string) => void;
  errors: ChallengeDataError[];
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor="modelLink" className={labelClass}>
        {t("submission.modelLink")}
      </label>
      <input
        type="url"
        id="modelLink"
        value={modelLink}
        onChange={(e) => onModelLinkChange(e.target.value)}
        className={inputClass}
        placeholder="https://huggingface.co/..."
      />
      <p className={hintClass}>{t("submission.modelLinkHint")}</p>
      <FieldErrors errors={errors} />
    </div>
  );
};

// A Prompt is typed or uploaded, exactly one.
export const PromptFields = ({
  promptText,
  onPromptTextChange,
  promptFile,
  onPromptFileChange,
  onPromptFileRemove,
  errorsFor,
}: {
  promptText: string;
  onPromptTextChange: (value: string) => void;
  promptFile: File | null;
  onPromptFileChange: FileChange;
  onPromptFileRemove: () => void;
  errorsFor: ErrorsFor;
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor="promptText" className={labelClass}>
        {t("submission.prompt")} *
      </label>
      <textarea
        id="promptText"
        value={promptText}
        onChange={(e) => onPromptTextChange(e.target.value)}
        rows={8}
        disabled={!!promptFile}
        className={`${inputClass} font-mono text-sm disabled:opacity-50`}
        placeholder={t("submission.promptPlaceholder")}
      />
      <p className={hintClass}>
        {promptFile ? t("submission.usingPromptFile") : t("submission.promptHint")}
      </p>
      <FieldErrors errors={errorsFor("prompt_text")} />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ArtifactFileInput
          id="promptFile"
          label={t("submission.promptFileLabel")}
          accept=".md,.txt,text/markdown,text/plain"
          file={promptFile}
          onChange={onPromptFileChange}
          onRemove={onPromptFileRemove}
        />
      </div>
      <FieldErrors errors={errorsFor("prompt_file")} />
    </div>
  );
};

export const SkillFields = ({
  skillFile,
  onSkillFileChange,
  onSkillFileRemove,
  errors,
}: {
  skillFile: File | null;
  onSkillFileChange: FileChange;
  onSkillFileRemove: () => void;
  errors: ChallengeDataError[];
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor="skillFile" className={labelClass}>
        {t("submission.skillFile")} *
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <ArtifactFileInput
          id="skillFile"
          label={t("submission.skillFileLabel")}
          accept=".zip,application/zip"
          file={skillFile}
          detail={skillFile ? ` (${(skillFile.size / 1024).toFixed(1)} KB)` : undefined}
          onChange={onSkillFileChange}
          onRemove={onSkillFileRemove}
        />
      </div>
      <p className={hintClass}>{t("submission.skillFileHint")}</p>
      <FieldErrors errors={errors} />
    </div>
  );
};

// The Preferred Model and license every Prompt and Skill carries.
export const PreferredModelAndLicenseFields = ({
  preferredModel,
  onPreferredModelChange,
  suggestions,
  license,
  onLicenseChange,
  errorsFor,
}: {
  preferredModel: string;
  onPreferredModelChange: (value: string) => void;
  suggestions: string[];
  license: SubmissionLicense;
  onLicenseChange: (value: SubmissionLicense) => void;
  errorsFor: ErrorsFor;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div>
        <label htmlFor="preferredModel" className={labelClass}>
          {t("submission.preferredModel")} *
        </label>
        <input
          type="text"
          id="preferredModel"
          list="preferredModelSuggestions"
          autoComplete="off"
          value={preferredModel}
          onChange={(e) => onPreferredModelChange(e.target.value)}
          className={inputClass}
          placeholder={t("submission.preferredModelPlaceholder")}
          required
        />
        <datalist id="preferredModelSuggestions">
          {suggestions.map((modelId) => (
            <option key={modelId} value={modelId} />
          ))}
        </datalist>
        <p className={hintClass}>{t("submission.preferredModelHint")}</p>
        <FieldErrors errors={errorsFor("preferred_model")} />
      </div>

      <div>
        <label htmlFor="license" className={labelClass}>
          {t("submission.license")} *
        </label>
        <select
          id="license"
          value={license}
          onChange={(e) => onLicenseChange(e.target.value as SubmissionLicense)}
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
  );
};
