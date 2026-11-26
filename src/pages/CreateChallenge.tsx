import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, X, Check, AlertCircle } from "lucide-react";
import { useCurrentUser } from "../hooks/useUsers";
import {
  useCategories,
  useCreateChallenge,
  useCreateCategory,
  useScorers,
} from "../hooks/useChallenges";
import { ChallengeCreateError } from "../api/challenge";
import type {
  ChallengeCreateRequest,
  ChallengeDataError,
  Scorer,
  ScorerParameter,
} from "../types/challenge";

type Details = Pick<
  ChallengeCreateRequest,
  "title" | "category_id" | "image_uri" | "description" | "status"
>;

// What the admin has typed for each Scorer parameter, before conversion.
type ParamValues = Record<string, string | boolean>;

const inputClass =
  "w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass =
  "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2";
const hintClass = "text-xs text-neutral-500 dark:text-neutral-400 mt-1";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  category_id: "Category",
  scorer_name: "Scorer",
  scorer_params: "Scorer parameters",
  inputs_file: "Inputs",
  ground_truth_file: "Ground Truth",
  media_archive_file: "Media Archive",
};

const directionLabel = (scorer: Scorer) =>
  scorer.direction === "lower_is_better"
    ? "lower is better"
    : "higher is better";

const parameterEntries = (scorer?: Scorer) =>
  Object.entries(scorer?.parameter_schema.properties ?? {});

const defaultParamValues = (scorer?: Scorer): ParamValues =>
  Object.fromEntries(
    parameterEntries(scorer).map(([name, param]) => [
      name,
      param.type === "boolean"
        ? Boolean(param.default)
        : param.default === undefined || param.default === null
          ? ""
          : String(param.default),
    ])
  );

// Turn the typed values into the JSON the backend validates. Blank fields are
// left out so the Scorer's own default applies.
const toScorerParams = (
  scorer: Scorer | undefined,
  values: ParamValues
): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  for (const [name, param] of parameterEntries(scorer)) {
    const value = values[name];
    if (param.type === "boolean") {
      params[name] = Boolean(value);
    } else if (typeof value === "string" && value.trim() !== "") {
      params[name] =
        param.type === "number" || param.type === "integer"
          ? Number(value)
          : value.trim();
    }
  }
  return params;
};

const numberBounds = (param: ScorerParameter) => ({
  min: param.minimum ?? param.exclusiveMinimum,
  max: param.maximum ?? param.exclusiveMaximum,
  step: param.type === "integer" ? 1 : "any",
});

interface FileFieldProps {
  id: string;
  label: string;
  hint: string;
  accept: string;
  file: File | undefined;
  onChange: (file: File | undefined) => void;
}

const FileField = ({ id, label, hint, accept, file, onChange }: FileFieldProps) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    {file ? (
      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-300 dark:border-neutral-600">
        <div className="flex items-center space-x-3">
          <Upload className="w-5 h-5 text-neutral-500" />
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-100">
              {file.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={`Remove ${label}`}
          className="p-1 text-red-600 hover:text-red-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : (
      <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-5 text-center">
        <input
          type="file"
          id={id}
          onChange={(e) => onChange(e.target.files?.[0])}
          className="hidden"
          accept={accept}
        />
        <label htmlFor={id} className="cursor-pointer flex flex-col items-center">
          <Upload className="w-7 h-7 text-neutral-400 mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Click to upload
          </p>
        </label>
      </div>
    )}
    <p className={hintClass}>{hint}</p>
  </div>
);

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { data: currentUserData } = useCurrentUser();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const {
    data: scorers = [],
    isLoading: scorersLoading,
    error: scorersError,
  } = useScorers();
  const createChallengeMutation = useCreateChallenge();
  const createCategoryMutation = useCreateCategory();

  const [details, setDetails] = useState<Details>({
    title: "",
    category_id: "",
    image_uri: "",
    description: "",
    status: "active",
  });
  const [scorerName, setScorerName] = useState("");
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [inputsFile, setInputsFile] = useState<File>();
  const [groundTruthFile, setGroundTruthFile] = useState<File>();
  const [mediaArchiveFile, setMediaArchiveFile] = useState<File>();

  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [dataErrors, setDataErrors] = useState<ChallengeDataError[]>([]);
  const [categoryError, setCategoryError] = useState("");

  const user = currentUserData?.data;
  const categories = categoriesData?.data || [];
  const scorer = scorers.find((s) => s.name === scorerName);

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
            Access Denied
          </h1>
          <p className="text-red-700 dark:text-red-300">
            You need admin privileges to create challenges.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back to Home
          </button>
        </div>
      </div>
    );
  }

  const clearErrors = () => {
    if (challengeError) setChallengeError("");
    if (dataErrors.length) setDataErrors([]);
  };

  const handleDetailChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setDetails((prev) => ({ ...prev, [name]: value }));
    clearErrors();
  };

  const handleScorerChange = (name: string) => {
    setScorerName(name);
    setParamValues(defaultParamValues(scorers.find((s) => s.name === name)));
    clearErrors();
  };

  const handleParamChange = (name: string, value: string | boolean) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
    clearErrors();
  };

  const withClear =
    (setter: (file: File | undefined) => void) => (file: File | undefined) => {
      setter(file);
      clearErrors();
    };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setCategoryError("");

    try {
      const result = await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
      });
      setDetails((prev) => ({ ...prev, category_id: result.data.id }));
      setNewCategoryName("");
      setShowNewCategoryForm(false);
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : "Failed to create category. Please try again."
      );
      console.error("Failed to create category:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !details.title ||
      !details.category_id ||
      !details.description ||
      !scorer ||
      !inputsFile ||
      !groundTruthFile
    ) {
      setChallengeError(
        "Please fill in all required fields: title, category, description, scorer, Inputs and Ground Truth."
      );
      return;
    }

    clearErrors();

    try {
      await createChallengeMutation.mutateAsync({
        ...details,
        scorer_name: scorer.name,
        scorer_params: toScorerParams(scorer, paramValues),
        inputs_file: inputsFile,
        ground_truth_file: groundTruthFile,
        media_archive_file: mediaArchiveFile,
      });
      navigate("/");
    } catch (error) {
      if (error instanceof ChallengeCreateError) {
        setChallengeError(error.message);
        setDataErrors(error.errors);
      } else {
        setChallengeError(
          error instanceof Error
            ? error.message
            : "Failed to create challenge. Please try again."
        );
      }
      console.error("Failed to create challenge:", error);
    }
  };

  if (categoriesLoading || scorersLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="bg-neutral-200 dark:bg-neutral-700 h-8 w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="bg-neutral-200 dark:bg-neutral-700 h-12 w-full"></div>
            <div className="bg-neutral-200 dark:bg-neutral-700 h-12 w-full"></div>
            <div className="bg-neutral-200 dark:bg-neutral-700 h-32 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-700 dark:text-neutral-100 mb-2">
            Create New Challenge
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Upload the Inputs participants run inference on and the private
            Ground Truth, and pick the Scorer that ranks every submission. A
            public GitHub repo is created for the challenge.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Challenge Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={details.title}
              onChange={handleDetailChange}
              className={inputClass}
              placeholder="Enter challenge title"
              required
            />
            <p className={hintClass}>
              Also names the challenge's GitHub repo, which keeps its name if
              the title changes later.
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category_id" className={labelClass}>
              Category *
            </label>
            <div className="flex space-x-2">
              <select
                id="category_id"
                name="category_id"
                value={details.category_id}
                onChange={handleDetailChange}
                className={`flex-1 ${inputClass}`}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                aria-label="Add a category"
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showNewCategoryForm && (
              <div className="mt-3 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (categoryError) setCategoryError("");
                    }}
                    placeholder="New category name"
                    className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={
                      createCategoryMutation.isPending ||
                      !newCategoryName.trim()
                    }
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-400 transition-colors flex items-center"
                  >
                    {createCategoryMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryForm(false);
                      setNewCategoryName("");
                    }}
                    className="px-3 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors flex items-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {categoryError && (
                  <div className="mt-2 flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                    <p className="text-sm text-red-800 dark:text-red-400">
                      {categoryError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image URI */}
          <div>
            <label htmlFor="image_uri" className={labelClass}>
              Challenge Image URL
            </label>
            <input
              type="url"
              id="image_uri"
              name="image_uri"
              value={details.image_uri}
              onChange={handleDetailChange}
              className={inputClass}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={details.description}
              onChange={handleDetailChange}
              rows={4}
              className={inputClass}
              placeholder="Describe the challenge objectives and rules"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className={labelClass}>
              Status *
            </label>
            <select
              id="status"
              name="status"
              value={details.status}
              onChange={handleDetailChange}
              className={inputClass}
              required
            >
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Scorer */}
          <fieldset className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <legend className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Scoring
            </legend>
            <div>
              <label htmlFor="scorer_name" className={labelClass}>
                Scorer *
              </label>
              {scorersError ? (
                <p className="text-sm text-red-700 dark:text-red-400">
                  Could not load scorers:{" "}
                  {scorersError instanceof Error
                    ? scorersError.message
                    : "unknown error"}
                </p>
              ) : (
                <select
                  id="scorer_name"
                  value={scorerName}
                  onChange={(e) => handleScorerChange(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select a scorer</option>
                  {scorers.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.label} ({directionLabel(s)})
                    </option>
                  ))}
                </select>
              )}
              <p className={hintClass}>
                Locked once the first submission arrives. Until then you can
                change it.
              </p>
            </div>

            {parameterEntries(scorer).map(([name, param]) => (
              <div key={name}>
                {param.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={Boolean(paramValues[name])}
                      onChange={(e) => handleParamChange(name, e.target.checked)}
                    />
                    <code>{name}</code>
                  </label>
                ) : (
                  <>
                    <label htmlFor={`param-${name}`} className={labelClass}>
                      <code>{name}</code>
                    </label>
                    {param.enum ? (
                      <select
                        id={`param-${name}`}
                        value={String(paramValues[name] ?? "")}
                        onChange={(e) => handleParamChange(name, e.target.value)}
                        className={inputClass}
                      >
                        {param.enum.map((option) => (
                          <option key={String(option)} value={String(option)}>
                            {String(option)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`param-${name}`}
                        type={
                          param.type === "number" || param.type === "integer"
                            ? "number"
                            : "text"
                        }
                        {...(param.type === "number" ||
                        param.type === "integer"
                          ? numberBounds(param)
                          : {})}
                        value={String(paramValues[name] ?? "")}
                        onChange={(e) => handleParamChange(name, e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </>
                )}
                {param.description && (
                  <p className={hintClass}>
                    {param.description}
                    {param.default !== undefined &&
                      ` Default: ${String(param.default)}.`}
                  </p>
                )}
              </div>
            ))}
          </fieldset>

          {/* Data */}
          <fieldset className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <legend className="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Data
            </legend>
            <FileField
              id="inputs_file"
              label="Inputs (JSONL) *"
              hint={`Public. One {"id", "input"} object per line. For images or audio, add "media" with the file's path inside the Media Archive.`}
              accept=".jsonl,application/jsonl,application/x-ndjson"
              file={inputsFile}
              onChange={withClear(setInputsFile)}
            />
            <FileField
              id="ground_truth_file"
              label="Ground Truth (JSONL) *"
              hint='Private, never published. One {"id", "reference"} object per line, with exactly the same ids as the Inputs. The reference shape depends on the scorer (text for CER and WER, a list of spans for span F1).'
              accept=".jsonl,application/jsonl,application/x-ndjson"
              file={groundTruthFile}
              onChange={withClear(setGroundTruthFile)}
            />
            <FileField
              id="media_archive_file"
              label="Media Archive (zip, optional)"
              hint="Public. Images or audio the Inputs point to, for OCR and speech challenges. Up to 2 GB."
              accept=".zip,application/zip"
              file={mediaArchiveFile}
              onChange={withClear(setMediaArchiveFile)}
            />
          </fieldset>

          {/* Challenge Creation Error */}
          {challengeError && (
            <div
              role="alert"
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 shrink-0" />
                <p className="text-red-800 dark:text-red-400">
                  {challengeError}
                </p>
              </div>
              {dataErrors.length > 0 && (
                <ul className="mt-3 ml-7 space-y-1 list-disc text-sm text-red-800 dark:text-red-400">
                  {dataErrors.map((err, index) => (
                    <li key={index}>
                      <span className="font-medium">
                        {FIELD_LABELS[err.field] ?? err.field}
                      </span>
                      {err.line != null && `, line ${err.line}`}
                      {err.id != null && `, id "${err.id}"`}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createChallengeMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {createChallengeMutation.isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {createChallengeMutation.isPending
                  ? "Creating..."
                  : "Create Challenge"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChallenge;
