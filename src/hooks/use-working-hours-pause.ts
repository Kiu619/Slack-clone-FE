'use client';

import { useEffect, useRef } from 'react';
import {
  pauseNotificationsApi,
  type AvailabilitySchedule,
  type WeekDay,
} from '@/apis';

const DAY_KEY_BY_INDEX: WeekDay[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getEffectiveWindow(
  schedule: AvailabilitySchedule,
  now: Date,
): { startMin: number; endMin: number } | null {
  if (schedule.scheduleType === 'every_day') {
    return {
      startMin: timeToMinutes(schedule.startTime),
      endMin: timeToMinutes(schedule.endTime),
    };
  }
  if (schedule.scheduleType === 'weekdays') {
    const day = now.getDay();
    if (day === 0 || day === 6) return null;
    return {
      startMin: timeToMinutes(schedule.startTime),
      endMin: timeToMinutes(schedule.endTime),
    };
  }
  const todayKey = DAY_KEY_BY_INDEX[now.getDay()];
  const daySchedule = schedule.days?.find((d) => d.day === todayKey);
  if (!daySchedule) return null;
  return {
    startMin: timeToMinutes(daySchedule.startTime),
    endMin: timeToMinutes(daySchedule.endTime),
  };
}

function isOutsideWindow(
  nowMin: number,
  window: { startMin: number; endMin: number } | null,
): boolean {
  if (!window) return true;
  return nowMin < window.startMin || nowMin > window.endMin;
}

/**
 * Tính next start date hop le:
 * - Neu hom nay co window va chua qua start: tra ve hom nay start
 * - Neu hom nay co window va dang trong window: tra ve null (inside)
 * - Neu hom nay co window va da qua end: sang ngay mai
 * - Neu custom mode ma hom nay khong co: sang ngay enabled ke tiep
 *
 * Loop toi da 7 ngay de tranh infinite.
 */
function getNextStartDate(
  schedule: AvailabilitySchedule,
  now: Date,
): Date | null {
  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    const window = getEffectiveWindow(schedule, candidate);
    if (!window) continue;

    if (offset === 0) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin >= window.startMin && nowMin <= window.endMin) {
        return null;
      }
    }

    const dayKey = DAY_KEY_BY_INDEX[candidate.getDay()];
    let startStr: string;
    if (schedule.scheduleType === 'custom') {
      const daySchedule = schedule.days?.find((d) => d.day === dayKey);
      if (!daySchedule) continue;
      startStr = daySchedule.startTime;
    } else {
      startStr = schedule.startTime;
    }
    const [h, m] = startStr.split(':').map(Number);
    candidate.setHours(h, m, 0, 0);
    return candidate;
  }
  return null;
}

/**
 * Engine auto-pause/resume notifications dua tren working hours.
 *
 * - setInterval 5 phut check trang thai
 * - visibilitychange event: check ngay khi tab visible (sau khi background)
 * - Loop guard: dependencies chi [workspaceId, schedule] — pausedUntil/autoPaused
 *   doc qua ref de tranh re-fire khi broadcast tu server
 * - In-flight ref: tranh nhieu API call overlap (manual + interval race)
 */
export function useWorkingHoursPause(
  workspaceId: string | undefined,
  schedule: AvailabilitySchedule | null | undefined,
  pausedUntil: string | null | undefined,
  autoPaused: boolean | null | undefined,
) {
  const inFlightRef = useRef(false);
  const pausedRef = useRef(pausedUntil);
  const autoRef = useRef(autoPaused);

  useEffect(() => {
    pausedRef.current = pausedUntil;
    autoRef.current = autoPaused;
  }, [pausedUntil, autoPaused]);

  useEffect(() => {
    if (!workspaceId || !schedule) return;

    const check = async () => {
      if (inFlightRef.current) return;
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const window = getEffectiveWindow(schedule, now);
      const outside = isOutsideWindow(nowMin, window);

      try {
        if (outside) {
          const currentPausedUntil = pausedRef.current;
          const currentlyPaused =
            !!currentPausedUntil && new Date(currentPausedUntil) > now;
          const isAuto = !!autoRef.current;
          // Chi auto-pause neu chua co pause nao dang hieu luc
          if (!isAuto && !currentlyPaused) {
            const nextStart = getNextStartDate(schedule, now);
            if (!nextStart) return;
            inFlightRef.current = true;
            await pauseNotificationsApi(
              workspaceId,
              nextStart.toISOString(),
              true,
            );
          }
        } else {
          // Trong window — chi resume neu dang bi auto-pause
          if (autoRef.current) {
            inFlightRef.current = true;
            await pauseNotificationsApi(workspaceId, null, false);
          }
        }
      } catch (err) {
        // Silent fail — interval tiep theo se retry
        console.error('[working-hours-pause] check failed', err);
      } finally {
        inFlightRef.current = false;
      }
    };

    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [workspaceId, schedule]);
}
