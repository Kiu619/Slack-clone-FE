'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMemberPreferences,
  useUpdateMemberPreferences,
} from '@/hooks/use-member-preferences';
import { memberPreferencesKeys } from '@/lib/query-keys';
import type {
  AvailabilityDaySchedule,
  AvailabilitySchedule,
  MemberPreferencesResponse,
  WeekDay,
} from '@/apis';

export type AvailabilityDayInput = {
  startTime: string;
  endTime: string;
};

export type AvailabilityDateOption = 'every_day' | 'weekdays' | 'custom';

export interface UseAvailabilityAutosaveOptions {
  workspaceId: string | undefined;
  dateOption: AvailabilityDateOption;
  startTime: string;
  endTime: string;
  days: Map<WeekDay, AvailabilityDayInput>;
}

export function validateAvailability(
  dateOption: AvailabilityDateOption,
  startTime: string,
  endTime: string,
  days: Map<WeekDay, AvailabilityDayInput>,
): boolean {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return false;
  }
  if (dateOption === 'custom') {
    if (days.size === 0) return false;
    for (const [, value] of days) {
      if (!value.startTime || !value.endTime) return false;
      if (value.startTime >= value.endTime) return false;
    }
    return true;
  }
  return startTime < endTime;
}

function buildPayload(
  dateOption: AvailabilityDateOption,
  startTime: string,
  endTime: string,
  days: Map<WeekDay, AvailabilityDayInput>,
): AvailabilitySchedule | null {
  if (!validateAvailability(dateOption, startTime, endTime, days)) return null;
  if (dateOption === 'custom') {
    const dayList: AvailabilityDaySchedule[] = Array.from(days.entries())
      .map(([day, v]) => ({
        day,
        startTime: v.startTime,
        endTime: v.endTime,
      }))
      .sort((a, b) => {
        const order: WeekDay[] = [
          'mon',
          'tue',
          'wed',
          'thu',
          'fri',
          'sat',
          'sun',
        ];
        return order.indexOf(a.day) - order.indexOf(b.day);
      });
    return {
      scheduleType: 'custom',
      startTime,
      endTime,
      days: dayList,
    };
  }
  return {
    scheduleType: dateOption,
    startTime,
    endTime,
  };
}

/**
 * Autosave working hours vao member preferences. Debounce 500ms.
 *
 * - Hydrate initial value tu query cache de tranh save ngay luc mount
 * - Skip neu payload giong lan save truoc (lastSavedRef)
 * - Skip neu payload invalid (validate fail)
 */
export function useAvailabilityAutosave({
  workspaceId,
  dateOption,
  startTime,
  endTime,
  days,
}: UseAvailabilityAutosaveOptions) {
  const queryClient = useQueryClient();
  const { isLoading: prefsLoading } = useMemberPreferences(workspaceId);
  const { mutate } = useUpdateMemberPreferences(workspaceId);
  const lastSavedRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate lastSavedRef tu query cache (1 lan khi load xong)
  useEffect(() => {
    if (prefsLoading || hydratedRef.current) return;
    hydratedRef.current = true;
    const wsId = workspaceId ?? '';
    const cached = queryClient.getQueryData<MemberPreferencesResponse | null>(
      memberPreferencesKeys.detail(wsId),
    );
    if (cached?.availabilitySchedule) {
      lastSavedRef.current = JSON.stringify(cached.availabilitySchedule);
    }
  }, [prefsLoading, queryClient, workspaceId]);

  useEffect(() => {
    if (prefsLoading || !hydratedRef.current) return;
    const payload = buildPayload(dateOption, startTime, endTime, days);
    if (!payload) return;

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedRef.current) return;

    const timeout = setTimeout(() => {
      mutate({ availabilitySchedule: payload });
      lastSavedRef.current = serialized;
    }, 500);

    return () => clearTimeout(timeout);
  }, [dateOption, startTime, endTime, days, mutate, prefsLoading]);
}

export type { AvailabilitySchedule };
