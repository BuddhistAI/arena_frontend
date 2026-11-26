import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Scores are stored unrounded; round them only when showing them.
export function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

// The small action buttons on a Submission's row (Delete, Resync).
export const submissionActionClass =
  "inline-flex items-center px-3 py-1 text-xs font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed";


export function formatDurationShort(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remSeconds = Math.round(seconds % 60);
    return remSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remMinutes = Math.round((seconds % 3600) / 60);
    return remMinutes === 0
      ? `${hours}h`
      : `${hours}h ${remMinutes}m`;
  }
}