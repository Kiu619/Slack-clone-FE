'use client';

import { useMemberPreferences } from '@/hooks/use-member-preferences';
import { useWorkingHoursPause } from '@/hooks/use-working-hours-pause';
import type { User } from '@/lib/types';

interface WorkingHoursPauseGuardProps {
  workspaceId: string | undefined;
  displayUser: User;
}

/**
 * Mount-only guard: doc availabilitySchedule + pausedUntil/autoPaused tu
 * member preferences + user profile, sau do goi useWorkingHoursPause engine.
 *
 * Render null — chi de kich hoat effect.
 */
export function WorkingHoursPauseGuard({
  workspaceId,
  displayUser,
}: WorkingHoursPauseGuardProps) {
  const { data: prefs } = useMemberPreferences(workspaceId);

  useWorkingHoursPause(
    workspaceId,
    prefs?.availabilitySchedule ?? null,
    displayUser.notificationsPausedUntil ?? null,
    displayUser.autoPaused ?? null,
  );

  return null;
}
