import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { challengeApi } from "../api/challenge";
import type {
  SubmissionRequest,
  UserSubmission,
  ChallengeCreateRequest,
  ChallengeUpdateRequest,
  CategoryCreateRequest,
} from "../types/challenge";

// Query keys
export const challengeKeys = {
  all: ["challenges"] as const,
  lists: () => [...challengeKeys.all, "list"] as const,
  list: (filters: string) => [...challengeKeys.lists(), { filters }] as const,
  details: () => [...challengeKeys.all, "detail"] as const,
  detail: (id: string) => [...challengeKeys.details(), id] as const,
  leaderboards: () => [...challengeKeys.all, "leaderboard"] as const,
  leaderboard: (challengeId: string, page?: number) =>
    [...challengeKeys.leaderboards(), challengeId, page] as const,
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

// Hooks for leaderboards
export const useLeaderboard = (
  challengeId: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: challengeKeys.leaderboard(challengeId, page),
    queryFn: () => challengeApi.getLeaderboard(challengeId, page, limit),
    enabled: !!challengeId,
    staleTime: 2 * 60 * 1000, // 2 minutes - leaderboards update more frequently
    gcTime: 5 * 60 * 1000,
  });
};

export const useSubmission = (id: string) => {
  return useQuery({
    queryKey: challengeKeys.submission(id),
    queryFn: () => challengeApi.getSubmissionById(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds - submission status might change
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

// Hook for fetching current user's submissions. While any of them is still
// being scored or published it refetches every few seconds, so statuses and
// repo links update in place.
export const useUserSubmissions = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: userSubmissionsKey,
    queryFn: challengeApi.getUserSubmissions,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) =>
      query.state.data?.data.some(isInProgress) ? SCORING_POLL_INTERVAL_MS : false,
  });
};

const challengeSubmissionsKey = (challengeId: string) =>
  ["challengeSubmissions", challengeId] as const;

// Every Submission to a Challenge (admin sync view), polled like
// useUserSubmissions while any is being scored or published.
export const useChallengeSubmissions = (
  challengeId: string,
  { enabled = true } = {}
) => {
  return useQuery({
    queryKey: challengeSubmissionsKey(challengeId),
    queryFn: () => challengeApi.getChallengeSubmissions(challengeId),
    enabled: enabled && !!challengeId,
    refetchInterval: (query) =>
      query.state.data?.data.some(isInProgress) ? SCORING_POLL_INTERVAL_MS : false,
  });
};

export const useResyncSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submission: UserSubmission) =>
      challengeApi.resyncSubmission(submission.id),
    onSuccess: (_, submission) => {
      queryClient.invalidateQueries({
        queryKey: challengeSubmissionsKey(submission.challenge_id),
      });
      queryClient.invalidateQueries({ queryKey: userSubmissionsKey });
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

// Hook to fetch leaderboard data for all challenges
export const useAllLeaderboards = (
  challenges: Array<{
    id: string;
    title?: string;
    name?: string;
    category?: { name?: string };
    status?: string;
  }> = []
) => {
  return useQuery({
    queryKey: [...challengeKeys.leaderboards(), "all"],
    queryFn: async () => {
      const leaderboardPromises = challenges.map(async (challenge) => {
        try {
          const response = await challengeApi.getLeaderboard(
            challenge.id,
            1,
            5
          ); // Get top 5 for each
          return {
            challengeId: challenge.id,
            challengeTitle: challenge.title || challenge.name,
            challengeCategory: challenge.category?.name || "Unknown",
            challengeStatus: challenge.status,
            submissions: response.data,
            totalSubmissions: response.pagination?.total || 0,
          };
        } catch (error) {
          console.error(
            `Failed to fetch leaderboard for ${challenge.id}:`,
            error
          );
          return {
            challengeId: challenge.id,
            challengeTitle: challenge.title || challenge.name,
            challengeCategory: challenge.category?.name || "Unknown",
            challengeStatus: challenge.status,
            submissions: [],
            totalSubmissions: 0,
          };
        }
      });

      return Promise.all(leaderboardPromises);
    },
    enabled: challenges.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Helper hook to prefetch leaderboard
export const usePrefetchLeaderboard = () => {
  const queryClient = useQueryClient();

  return (challengeId: string) => {
    queryClient.prefetchQuery({
      queryKey: challengeKeys.leaderboard(challengeId, 1),
      queryFn: () => challengeApi.getLeaderboard(challengeId, 1, 10),
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

export const useSubmissionById = (submissionId: string) => {
  return useQuery({
    queryKey: ["submissions", "detail", submissionId],
    queryFn: () => challengeApi.getSubmissionById(submissionId),
    enabled: !!submissionId,
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

      // If we have a specific challenge ID, invalidate and refetch its leaderboard immediately
      if (variables.challengeId) {
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

      // Force refetch of combined leaderboards
      queryClient.refetchQueries({
        queryKey: [...challengeKeys.leaderboards(), "all"],
      });
    },
    onError: (error) => {
      console.error("Submission deletion failed:", error);
    },
  });
};

// Deprecated: Use individual challenge leaderboard hooks instead
export const useLeaderboardResults = () => {
  console.warn(
    "useLeaderboardResults is deprecated. Use useLeaderboard(challengeId) instead."
  );
  return useQuery({
    queryKey: ["results", "leaderboard", "deprecated"],
    queryFn: () =>
      Promise.resolve({ data: [], message: "Deprecated", success: false }),
    enabled: false, // Disable this query
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
