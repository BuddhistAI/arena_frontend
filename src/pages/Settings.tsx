import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "../hooks/useAuth0";
import { useCurrentUser, useUpdateUserProfile } from "../hooks/useUsers";
import { challengeKeys } from "../hooks/useChallenges";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Save,
  LogOut,
} from "lucide-react";

// The public username Submissions are published under. The server checks it
// (unique, 3 to 30 of a-z, 0-9, - and _) and its refusal is shown inline.
const UsernameField = ({ current }: { current: string }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateUserProfile();
  const [draft, setDraft] = useState(current);
  const [saved, setSaved] = useState(false);
  const error = updateProfile.error?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    updateProfile.mutate(
      { username: draft.trim() },
      {
        onSuccess: () => {
          setSaved(true);
          // Leaderboard rows name submitters by their current username.
          queryClient.invalidateQueries({ queryKey: challengeKeys.leaderboards() });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="username"
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
      >
        {t("settings.publicUsername")}
      </label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-neutral-500 dark:text-neutral-400">
            @
          </span>
          <input
            id="username"
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
              updateProfile.reset();
            }}
            autoComplete="username"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby="username-hint username-error"
            className={`w-full pl-7 pr-3 py-2 border rounded-md bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              error
                ? "border-red-500 dark:border-red-400"
                : "border-neutral-300 dark:border-neutral-600"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={draft.trim() === current || !draft.trim() || updateProfile.isPending}
          className="flex items-center px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateProfile.isPending ? t("settings.savingUsername") : t("settings.saveUsername")}
        </button>
      </div>
      {error ? (
        <p id="username-error" role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : saved ? (
        <p id="username-error" role="status" className="mt-1 text-sm text-green-700 dark:text-green-400">
          {t("settings.usernameSaved")}
        </p>
      ) : null}
      <p id="username-hint" className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {t("settings.usernameHint")}
      </p>
    </form>
  );
};

const Settings = () => {
  const { user, logout } = useAuth0();
  const { data: currentUserResponse } = useCurrentUser();
  const username = currentUserResponse?.data?.username;
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [newChallengeAlerts, setNewChallengeAlerts] = useState(false);

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  return (
    <ProtectedRoute>
      <div className="py-0">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-700 dark:text-neutral-100 mb-2 flex items-center">
              <SettingsIcon className="w-8 h-8 mr-3" />
              Settings
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Manage your account preferences and settings.
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
                <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile Settings
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {username !== undefined && (
                  <UsernameField current={username} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                    >
                      Display Name
                    </label>
                    <input
                    disabled
                      id="displayName"
                      type="text"
                      defaultValue={user?.name || ""}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed rounded-md focus:outline-none focus:ring-0 focus:border-transparent"
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emailAddress"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      id="emailAddress"
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                    />
                   
                  </div>
                </div>

              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
                <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Preferences (Coming soon)
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="emailNotifications"
                      className="text-sm font-medium text-neutral-700 dark:text-neutral-100 "
                    >
                      Email Notifications 
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Receive notifications about your submissions and rankings
                    </p>
                  </div>
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    disabled
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-neutral-300 dark:border-neutral-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="weeklyDigest"
                      className="text-sm font-medium text-neutral-700 dark:text-neutral-100"
                    >
                      Weekly Digest
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Get a weekly summary of new challenges and leaderboard
                      updates
                    </p>
                  </div>
                  <input
                    id="weeklyDigest"
                    disabled
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-neutral-300 dark:border-neutral-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="newChallengeAlerts"
                      className="text-sm font-medium text-neutral-700 dark:text-neutral-100"
                    >
                      New Challenge Alerts
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Be notified when new challenges are published
                    </p>
                  </div>
                  <input
                    id="newChallengeAlerts"
                    type="checkbox"
                    disabled
                    checked={newChallengeAlerts}
                    onChange={(e) => setNewChallengeAlerts(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-neutral-300 dark:border-neutral-600 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-600">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
                <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-100 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Account Security
                </h2>
              </div>
              <div className="p-6 space-y-4">
               

                <div className="flex items-center justify-between p-4  rounded-lg " >
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-400">
                      Sign Out
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Sign out of your account on this device
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 dark:bg-red-900/20 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

       
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
