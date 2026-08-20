"use client";

/**
 * Hydrates the Zustand language/region store from the TanStack Query cache.
 * Must be called at the workspace level (e.g. in WorkspaceShell) so the
 * I18nProvider can read the correct locale on the first render — before the
 * user opens Preferences.
 *
 * Safe to call multiple times: only hydrates once when serverPrefs is available.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { authKeys, memberPreferencesKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";

interface UseHydrateLanguageRegionStoreOptions {
  workspaceId: string | undefined;
  serverPrefs: { locale: string | null; dateFormat: string | null; timeFormat: string | null } | null | undefined;
  isLoading: boolean;
}

export function useHydrateLanguageRegionStore({
  workspaceId,
  serverPrefs,
  isLoading,
}: UseHydrateLanguageRegionStoreOptions) {
  const queryClient = useQueryClient();
  const wsId = workspaceId ?? "";
  const storeHydrate = useLanguageRegionStore((s) => s.hydrateFromStore);

  useEffect(() => {
    if (isLoading || !serverPrefs) return;

    const profileData = queryClient.getQueryData<User | null>(
      authKeys.workspaceProfile(wsId)
    );
    const timeZone =
      profileData?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    storeHydrate(
      {
        locale: serverPrefs.locale ?? "en",
        dateFormat: serverPrefs.dateFormat ?? "en_US",
        timeFormat: serverPrefs.timeFormat ?? "12h",
      },
      timeZone
    );
  }, [serverPrefs, isLoading, wsId, queryClient, storeHydrate]);
}
