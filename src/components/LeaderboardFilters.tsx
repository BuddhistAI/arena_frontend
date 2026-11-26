import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import type {
  LeaderboardCounts,
  LeaderboardFilter,
  SubmissionType,
} from "../types/challenge";

// One tab per Submission Type, labelled as its badge is, after "All".
const TABS: { type: SubmissionType | undefined; key: keyof LeaderboardCounts; label: string }[] = [
  { type: undefined, key: "all", label: "leaderboardFilters.all" },
  { type: "model", key: "model", label: "submissionType.model" },
  { type: "prompt", key: "prompt", label: "submissionType.prompt" },
  { type: "skill", key: "skill", label: "submissionType.skill" },
];

const SEARCH_DELAY_MS = 300;

interface LeaderboardFiltersProps {
  counts: LeaderboardCounts;
  filter: LeaderboardFilter;
  onChange: (filter: LeaderboardFilter) => void;
}

// Tabs by Submission Type with their counts, and a search box. The server
// applies both and keeps every row's overall Rank; a tab holding nothing is
// disabled.
const LeaderboardFilters = ({ counts, filter, onChange }: LeaderboardFiltersProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filter.q ?? "");

  // Ask the server only once typing pauses.
  useEffect(() => {
    if (search.trim() === (filter.q ?? "")) return;
    const timer = setTimeout(
      () => onChange({ ...filter, q: search.trim() || undefined }),
      SEARCH_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [search, filter, onChange]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
      <div role="tablist" aria-label={t("leaderboardFilters.typeTabs")} className="flex flex-wrap gap-1">
        {TABS.map(({ type, key, label }) => {
          const selected = filter.type === type;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={counts[key] === 0}
              onClick={() => onChange({ ...filter, type })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                selected
                  ? "bg-neutral-500/30 text-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-500/10"
              }`}
            >
              {t(label)}
              <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>
      <label className="relative block sm:w-72">
        <span className="sr-only">{t("leaderboardFilters.searchLabel")}</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("leaderboardFilters.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </label>
    </div>
  );
};

export default LeaderboardFilters;
