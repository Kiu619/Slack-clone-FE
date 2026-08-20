"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLanguageRegionStore,
  type DateFormat,
  type Language,
  type TimeFormat,
} from "@/stores/useLanguageRegionStore";
import {
  MemberPreferencesResponse,
} from "@/apis";
import {
  authKeys,
  memberPreferencesKeys,
} from "@/lib/query-keys";
import {
  useMemberPreferences,
  useUpdateMemberPreferences,
} from "@/hooks/use-member-preferences";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import type { User } from "@/lib/types";
import { setCookie } from "@/lib/utils";
import { useAppTranslation } from "@/hooks/use-translation";

interface UseLanguageRegionAutosaveOptions {
  workspaceId: string | undefined;
}

interface UseLanguageRegionAutosaveReturn {
  language: Language;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timeZone: string;
  setLanguage: (lang: Language) => void;
  setDateFormat: (fmt: DateFormat) => void;
  setTimeFormat: (fmt: TimeFormat) => void;
  setTimeZone: (tz: string) => void;
  isReady: boolean;
}

/**
 * Autosave hook for Language & Region preferences.
 *
 * State lives in Zustand (useLanguageRegionStore) so I18nProvider can read
 * locale without needing workspaceId.  TanStack Query provides the server
 * source of truth on first load (via useHydrateLanguageRegionStore in WorkspaceShell).
 *
 * Every setter:
 *   1. Optimistically updates Zustand store (instant UI)
 *   2. Optimistically updates TanStack Query cache (keeps other hooks in sync)
 *   3. Fires the mutation
 *   4. On error: rolls back + toast.error
 */
export function useLanguageRegionAutosave({
  workspaceId,
}: UseLanguageRegionAutosaveOptions): UseLanguageRegionAutosaveReturn {
  const queryClient = useQueryClient();
  const wsId = workspaceId ?? "";
  const t = useAppTranslation("languageRegion");

  const { isLoading: prefsLoading } = useMemberPreferences(workspaceId);
  const updatePrefsMutation = useUpdateMemberPreferences(workspaceId);
  const updateProfileMutation = useUpdateProfile(workspaceId);

  const storeLanguage = useLanguageRegionStore((s) => s.language);
  const storeDateFormat = useLanguageRegionStore((s) => s.dateFormat);
  const storeTimeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const storeTimeZone = useLanguageRegionStore((s) => s.timeZone);
  const storeSetLanguage = useLanguageRegionStore((s) => s.setLanguage);
  const storeSetDateFormat = useLanguageRegionStore((s) => s.setDateFormat);
  const storeSetTimeFormat = useLanguageRegionStore((s) => s.setTimeFormat);
  const storeSetTimeZone = useLanguageRegionStore((s) => s.setTimeZone);

  // ── Language setter ───────────────────────────────────────────────────────
  const setLanguage = (lang: Language) => {
    const prev = storeLanguage;

    storeSetLanguage(lang);

    queryClient.setQueryData<MemberPreferencesResponse | null>(
      memberPreferencesKeys.detail(wsId),
      (old) => (old ? { ...old, locale: lang } : { locale: lang, dateFormat: null, timeFormat: null })
    );

    setCookie("NEXT_LOCALE", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });

    updatePrefsMutation.mutate(
      { locale: lang },
      {
        onError: () => {
          storeSetLanguage(prev);
          queryClient.setQueryData<MemberPreferencesResponse | null>(
            memberPreferencesKeys.detail(wsId),
            (old) => (old ? { ...old, locale: prev } : null)
          );
          setCookie("NEXT_LOCALE", prev, { path: "/", maxAge: 60 * 60 * 24 * 365 });
          toast.error(t("saveError"));
        },
      }
    );
  };

  // ── Date format setter ────────────────────────────────────────────────────
  const setDateFormat = (fmt: DateFormat) => {
    const prev = storeDateFormat;

    storeSetDateFormat(fmt);

    queryClient.setQueryData<MemberPreferencesResponse | null>(
      memberPreferencesKeys.detail(wsId),
      (old) => (old ? { ...old, dateFormat: fmt } : { locale: null, dateFormat: fmt, timeFormat: null })
    );

    updatePrefsMutation.mutate(
      { dateFormat: fmt },
      {
        onError: () => {
          storeSetDateFormat(prev);
          queryClient.setQueryData<MemberPreferencesResponse | null>(
            memberPreferencesKeys.detail(wsId),
            (old) => (old ? { ...old, dateFormat: prev } : null)
          );
          toast.error(t("saveError"));
        },
      }
    );
  };

  // ── Time format setter ────────────────────────────────────────────────────
  const setTimeFormat = (fmt: TimeFormat) => {
    const prev = storeTimeFormat;

    storeSetTimeFormat(fmt);

    queryClient.setQueryData<MemberPreferencesResponse | null>(
      memberPreferencesKeys.detail(wsId),
      (old) => (old ? { ...old, timeFormat: fmt } : { locale: null, dateFormat: null, timeFormat: fmt })
    );

    updatePrefsMutation.mutate(
      { timeFormat: fmt },
      {
        onError: () => {
          storeSetTimeFormat(prev);
          queryClient.setQueryData<MemberPreferencesResponse | null>(
            memberPreferencesKeys.detail(wsId),
            (old) => (old ? { ...old, timeFormat: prev } : null)
          );
          toast.error(t("saveError"));
        },
      }
    );
  };

  // ── Time zone setter ──────────────────────────────────────────────────────
  const setTimeZone = (tz: string) => {
    const prev = storeTimeZone;

    storeSetTimeZone(tz);

    queryClient.setQueryData<User | null>(
      authKeys.workspaceProfile(wsId),
      (old) => (old ? { ...old, timeZone: tz } : null)
    );

    updateProfileMutation.mutate(
      { timeZone: tz },
      {
        onError: () => {
          storeSetTimeZone(prev);
          queryClient.setQueryData<User | null>(
            authKeys.workspaceProfile(wsId),
            (old) => (old ? { ...old, timeZone: prev } : null)
          );
          toast.error(t("saveError"));
        },
      }
    );
  };

  const isReady = useMemo(
    () => !prefsLoading,
    [prefsLoading]
  );

  return {
    language: storeLanguage,
    dateFormat: storeDateFormat,
    timeFormat: storeTimeFormat,
    timeZone: storeTimeZone,
    setLanguage,
    setDateFormat,
    setTimeFormat,
    setTimeZone,
    isReady,
  };
}
