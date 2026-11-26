import type { User, UserProfile, UserUpdateRequest } from "../types/user";
import type { ApiResponse } from "../types/challenge";
import { getAuthHeaders, setAuthTokenGetter } from "../lib/auth";

// Export the centralized auth token setter for backward compatibility
export { setAuthTokenGetter };

// API Base URL
const API_BASE_URL =
  import.meta.env.VITE_SERVER_URL || "https://eval-api.pecha.tools";
  

// The server refused a profile update: a username that is taken (409) or
// invalid (422). `message` is the server's reason, to show beside the field.
export class UserUpdateError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UserUpdateError";
    this.status = status;
  }
}

// The server's reason for a refused update: FastAPI's `detail` string, or the
// first validation message ("Value error, ..." with its prefix dropped).
const userUpdateError = async (response: Response): Promise<UserUpdateError> => {
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  const { detail } = body;
  let message = `HTTP error! status: ${response.status}`;
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
    message = detail[0].msg.replace(/^Value error, /, "");
  }
  return new UserUpdateError(message, response.status);
};

// API functions
export const userApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<ApiResponse<User | null>> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            data: null,
            message: "Unauthorized - Please log in",
            success: false,
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const user: User = await response.json();

      return {
        data: user,
        message: "User profile fetched successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch user profile"
      );
    }
  },

  // Get user by ID (matches your backend endpoint)
  getUserProfile: async (
    userId: string
  ): Promise<ApiResponse<UserProfile | null>> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            data: null,
            message: "User not found",
            success: false,
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const userProfile: UserProfile = await response.json();

      return {
        data: userProfile,
        message: "User profile fetched successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return {
        data: null,
        message: "Failed to fetch user profile",
        success: false,
      };
    }
  },

  // Update current user. A refused update throws a UserUpdateError carrying
  // the server's reason.
  updateUserProfile: async (
    updates: UserUpdateRequest
  ): Promise<ApiResponse<User>> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw await userUpdateError(response);
    }

    const updatedUser: User = await response.json();

    return {
      data: updatedUser,
      message: "Profile updated successfully",
      success: true,
    };
  },

  // Create new user (matches your backend endpoint)
  createUser: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/users/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newUser: User = await response.json();

      return {
        data: newUser,
        message: "User created successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    }
  },

  // List all users (matches your backend endpoint)
  listUsers: async (): Promise<ApiResponse<User[]>> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const users: User[] = await response.json();

      return {
        data: users,
        message: "Users fetched successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    }
  },

  // Delete current user account
  deleteUserAccount: async (): Promise<ApiResponse<boolean>> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        data: true,
        message: "Account deleted successfully",
        success: true,
      };
    } catch (error) {
      console.error("Error deleting user account:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    }
  },
};
