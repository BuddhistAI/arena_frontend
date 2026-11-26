import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { challengeApi, SubmissionReadError } from "../api/challenge";
import type {
  ApiResponse,
  SubmissionRequest,
  UserSubmission,
  ChallengeCreateRequest,
  ChallengeUpdateRequest,
  CategoryCreateRequest,
  LeaderboardFilter,
} from "../types/challenge";

// Query keys
export const challengeKeys = {
  all: ["challenges"] as const,
  lists: () => [...challengeKeys.all, "list"] as const,
  list: (filters: string) => [...challengeKeys.lists(), { filters }] as const,
  details: () => [...challengeKeys.all, "detail"] as const,
  detail: (id: string) => [...challengeKeys.details(), id] as const,
  leaderboards: () => [...challengeKeys.all, "leaderboard"] as const,
  leaderboard: (challengeId: string, page?: number, filter: LeaderboardFilter = {}) =>
    [...challengeKeys.leaderboards(), challengeId, page, filter] as const,
  submissions: () => [...challengeKeys.all, "submissions"] as const,
  userSubmissions: (challengeId: string, teamName?: string) =>
    [...challengeKeys.submissions(), challengeId, teamName] as const,
  submission: (id: string) =>
    [...challengeKeys.submissions(), "detail", id] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
};

// Hooks for challenges
export const useChallenges = () => {
  return useQuery({
    queryKey: challengeKeys.lists(),
    queryFn: challengeApi.getChallenges,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useChallenge = (id: string) => {
  return useQuery({
    queryKey: challengeKeys.detail(id),
    queryFn: () => challengeApi.getChallengeById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Hooks for leaderboards: one page of a Challenge's server-ranked Leaderboard
export const useLeaderboard = (
  challengeId: string,
  page: number = 1,
  filter: LeaderboardFilter = {}
) => {
  return useQuery({
    queryKey: challengeKeys.leaderboard(challengeId, page, filter),
    queryFn: () => challengeApi.getRankedLeaderboard(challengeId, page, filter),
    enabled: !!challengeId,
    // Keep showing the last rows while a new tab, search or page loads.
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes - leaderboards update more frequently
    gcTime: 5 * 60 * 1000,
  });
};

// One Submission's detail page. A missing (404) or deleted (410) Submission
// is an answer, not a failure, so it is not retried.
export const useSubmissionDetail = (id: string) => {
  return useQuery({
    queryKey: challengeKeys.submission(id),
    queryFn: () => challengeApi.getSubmissionDetail(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds - its status or sync may change
    retry: (failureCount, error) =>
      !(error instanceof SubmissionReadError && error.outcome !== "failed") &&
      failureCount < 3,
  });
};

const userSubmissionsKey = ["userSubmissions"] as const;
const preferredModelsKey = ["preferredModels"] as const;
const SCORING_POLL_INTERVAL_MS = 3000;

const isBeingScored = (submission: UserSubmission) =>
  submission.status === "pending" || submission.status === "processing";

// Scored, and its folder not yet in the Challenge Repo.
const isBeingPublished = (submission: UserSubmission) =>
  submission.status === "completed" && submission.sync_status === "pending";

const isInProgress = (submission: UserSubmission) =>
  isBeingScored(submission) || isBeingPublished(submission);

// While any Submission is still being scored or published, refetch every few
// seconds so statuses and repo links update in place.
const pollWhileInProgress = (query: {
  state: { data?: ApiResponse<UserSubmission[]> };
}) =>
  query.state.data?.data.some(isInProgress) ? SCORING_POLL_INTERVAL_MS : false;

export const useUserSubmissions = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: userSubmissionsKey,
    queryFn: challengeApi.getUserSubmissions,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: pollWhileInProgress,
  });
};

const challengeSubmissionsKey = (challengeId: string) =>
  ["challengeSubmissions", challengeId] as const;

// Every Submission to a Challenge, for the admin sync view.
export const useChallengeSubmissions = (
  challengeId: string,
  { enabled = true } = {}
) => {
  return useQuery({
    queryKey: challengeSubmissionsKey(challengeId),
    queryFn: () => challengeApi.getChallengeSubmissions(challengeId),
    enabled: enabled && !!challengeId,
    refetchInterval: pollWhileInProgress,
  });
};

export const useResyncSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submission: Pick<UserSubmission, "id" | "challenge_id">) =>
      challengeApi.resyncSubmission(submission.id),
    onSuccess: (_, submission) => {
      queryClient.invalidateQueries({
        queryKey: challengeSubmissionsKey(submission.challenge_id),
      });
      queryClient.invalidateQueries({ queryKey: userSubmissionsKey });
      queryClient.invalidateQueries({
        queryKey: challengeKeys.submission(submission.id),
      });
    },
  });
};

// Mutation for submitting to challenge
export const useSubmitToChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submission: SubmissionRequest) =>
      challengeApi.submitToChallenge(submission),
    onSuccess: (_, variables) => {
      // Invalidate and refetch leaderboard
      queryClient.invalidateQueries({
        queryKey: challengeKeys.leaderboard(variables.challenge_id),
      });

      queryClient.invalidateQueries({ queryKey: userSubmissionsKey });
      queryClient.invalidateQueries({ queryKey: preferredModelsKey });

      // Update challenge data (increment submission count)
      queryClient.invalidateQueries({
        queryKey: challengeKeys.detail(variables.challenge_id),
      });
    },
    onError: (error) => {
      console.error("Submission failed:", error);
    },
  });
};

// Helper hook to prefetch challenge data
export const usePrefetchChallenge = () => {
  const queryClient = useQueryClient();

  return (challengeId: string) => {
    queryClient.prefetchQuery({
      queryKey: challengeKeys.detail(challengeId),
      queryFn: () => challengeApi.getChallengeById(challengeId),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// Helper hook to prefetch leaderboard
export const usePrefetchLeaderboard = () => {
  const queryClient = useQueryClient();

  return (challengeId: string) => {
    queryClient.prefetchQuery({
      queryKey: challengeKeys.leaderboard(challengeId, 1),
      queryFn: () => challengeApi.getRankedLeaderboard(challengeId, 1),
      staleTime: 2 * 60 * 1000,
    });
  };
};

// Category hooks
export const useCategories = () => {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: challengeApi.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Scorers a Challenge can be locked to (from buddhist-eval via the backend)
export const useScorers = () => {
  return useQuery({
    queryKey: ["scorers"],
    queryFn: challengeApi.getScorers,
    staleTime: 60 * 60 * 1000, // the registry only changes with a backend release
  });
};

// Preferred Model ids already used on the platform, offered as autocomplete
export const usePreferredModels = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: preferredModelsKey,
    queryFn: challengeApi.getPreferredModels,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// Admin challenge creation hooks
export const useCreateChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeData: ChallengeCreateRequest) =>
      challengeApi.createChallenge(challengeData),
    // A rejected create (422/409) won't pass on retry, and retrying re-uploads
    // every file, so never retry.
    retry: false,
    onSuccess: () => {
      // Invalidate challenges list to show new challenge
      queryClient.invalidateQueries({
        queryKey: challengeKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Challenge creation failed:", error);
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryData: CategoryCreateRequest) =>
      challengeApi.createCategory(categoryData),
    onSuccess: () => {
      // Invalidate categories list to show new category
      queryClient.invalidateQueries({
        queryKey: categoryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error("Category creation failed:", error);
    },
  });
};

// Submission hooks
export const useAllSubmissions = () => {
  return useQuery({
    queryKey: ["submissions", "all"],
    queryFn: challengeApi.getAllSubmissions,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMySubmissions = () => {
  return useQuery({
    queryKey: ["submissions", "my"],
    queryFn: challengeApi.getMySubmissions,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      submissionId,
    }: {
      submissionId: string;
      challengeId?: string;
    }) => challengeApi.deleteSubmission(submissionId),
    onSuccess: (_, variables) => {
      // Invalidate submissions lists
      queryClient.invalidateQueries({
        queryKey: ["submissions"],
      });
      queryClient.invalidateQueries({ queryKey: userSubmissionsKey });
      queryClient.invalidateQueries({ queryKey: preferredModelsKey });

      // If we have a specific challenge ID, invalidate and refetch its leaderboard immediately
      if (variables.challengeId) {
        queryClient.invalidateQueries({
          queryKey: challengeSubmissionsKey(variables.challengeId),
        });
        queryClient.invalidateQueries({
          queryKey: challengeKeys.leaderboard(variables.challengeId),
        });
        // Force immediate refetch for better UX
        queryClient.refetchQueries({
          queryKey: challengeKeys.leaderboard(variables.challengeId),
        });
      }

      // Invalidate all leaderboard queries to ensure UI updates everywhere
      queryClient.invalidateQueries({
        queryKey: challengeKeys.leaderboards(),
      });
    },
    onError: (error) => {
      console.error("Submission deletion failed:", error);
    },
  });
};

// Admin challenge management hooks
export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      challengeId,
      updateData,
    }: {
      challengeId: string;
      updateData: ChallengeUpdateRequest;
    }) => challengeApi.updateChallenge(challengeId, updateData),
    onSuccess: () => {
      // Invalidate challenges list to show updated challenge
      queryClient.invalidateQueries({
        queryKey: challengeKeys.lists(),
      });
      // Also invalidate individual challenge queries
      queryClient.invalidateQueries({
        queryKey: challengeKeys.details(),
      });
    },
    onError: (error) => {
      console.error("Challenge update failed:", error);
    },
  });
};

export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) =>
      challengeApi.deleteChallenge(challengeId),
    onSuccess: () => {
      // Invalidate challenges list to remove deleted challenge
      queryClient.invalidateQueries({
        queryKey: challengeKeys.lists(),
      });
      // Also invalidate leaderboards
      queryClient.invalidateQueries({
        queryKey: challengeKeys.leaderboards(),
      });
    },
    onError: (error) => {
      console.error("Challenge deletion failed:", error);
    },
  });
};
