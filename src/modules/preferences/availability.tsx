"use client";

import type { WeekDay } from "@/apis";
import { CustomSelect } from "@/components/custom-select";
import Typography from "@/components/ui/typography";
import { buildTimeOptions } from "@/helpers/time-options";
import {
    useAvailabilityAutosave,
    validateAvailability,
    type AvailabilityDateOption,
    type AvailabilityDayInput,
} from "@/hooks/use-availability-autosave";
import { useMemberPreferences } from "@/hooks/use-member-preferences";
import { useAppTranslation } from "@/hooks/use-translation";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { useEffect, useState } from "react";

type DateOptionValue = AvailabilityDateOption;

const DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const displayFor = (
  value: string,
  timeOptions: Array<{ value: string; label: string }>,
): string => timeOptions.find((o) => o.value === value)?.label ?? value;

interface DayRowProps {
  dayLabel: string;
  startTime: string;
  endTime: string;
  toLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  timeOptions: Array<{ value: string; label: string }>;
  startError?: string;
  endError?: string;
}

function DayRow({
  dayLabel,
  startTime,
  endTime,
  toLabel,
  onStartChange,
  onEndChange,
  timeOptions,
  startError,
  endError,
}: DayRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-sm font-medium w-10 shrink-0">{dayLabel}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <CustomSelect
          options={timeOptions}
          value={displayFor(startTime, timeOptions)}
          onChange={onStartChange}
          className="flex-1 min-w-0"
        />
        <Typography
          variant="p"
          className="text-muted-foreground text-xs shrink-0"
        >
          {toLabel}
        </Typography>
        <CustomSelect
          options={timeOptions}
          value={displayFor(endTime, timeOptions)}
          onChange={onEndChange}
          className="flex-1 min-w-0"
        />
      </div>
      {(startError || endError) && (
        <Typography variant="p" className="text-red-500 text-[11px] shrink-0">
          {endError ?? startError}
        </Typography>
      )}
    </div>
  );
}

export default function PreferencesAvailability({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const t = useAppTranslation("availability");
  const timeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const { data: prefs } = useMemberPreferences(workspaceId);

  const dateOptions: Array<{ label: string; value: DateOptionValue }> = [
    { label: t("everyDay"), value: "every_day" },
    { label: t("weekdays"), value: "weekdays" },
    { label: t("custom"), value: "custom" },
  ];

  const timeOptions = buildTimeOptions(timeFormat);

  // Default values
  const DEFAULTS = {
      dateOption: "every_day" as DateOptionValue,
      startTime: "09:00",
      endTime: "17:00",
      days: new Map<WeekDay, AvailabilityDayInput>(),
  };

  const [dateOption, setDateOption] = useState<DateOptionValue>(
    DEFAULTS.dateOption,
  );
  const [startTime, setStartTime] = useState<string>(DEFAULTS.startTime);
  const [endTime, setEndTime] = useState<string>(DEFAULTS.endTime);
  const [days, setDays] = useState<Map<WeekDay, AvailabilityDayInput>>(
    new Map(DEFAULTS.days),
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate tu server (1 lan)
  useEffect(() => {
    if (hydrated || !prefs) return;
    const s = prefs.availabilitySchedule;
    if (s) {
      setDateOption(s.scheduleType);
      setStartTime(s.startTime);
      setEndTime(s.endTime);
      if (s.days && s.days.length > 0) {
        const map = new Map<WeekDay, AvailabilityDayInput>();
        for (const d of s.days) {
          map.set(d.day, { startTime: d.startTime, endTime: d.endTime });
        }
        setDays(map);
      }
    }
    setHydrated(true);
  }, [prefs, hydrated]);

  useAvailabilityAutosave({
    workspaceId,
    dateOption,
    startTime,
    endTime,
    days,
  });

  const handleStartChange = (raw: string) => {
    if (raw === startTime) return;
    setStartTime(raw);
  };

  const handleEndChange = (raw: string) => {
    if (raw === endTime) return;
    setEndTime(raw);
  };

  const handleDayStartChange = (day: WeekDay, raw: string) => {
    setDays((prev) => {
      const next = new Map(prev);
      const current = next.get(day) ?? { startTime: "09:00", endTime: "17:00" };
      next.set(day, { ...current, startTime: raw });
      return next;
    });
  };

  const handleDayEndChange = (day: WeekDay, raw: string) => {
    setDays((prev) => {
      const next = new Map(prev);
      const current = next.get(day) ?? { startTime: "09:00", endTime: "17:00" };
      next.set(day, { ...current, endTime: raw });
      return next;
    });
  };

  const isValid = validateAvailability(dateOption, startTime, endTime, days);
  const globalTimeError =
    !isValid && startTime >= endTime ? t("endTimeMustBeAfterStartTime") : null;
  const customEmptyError =
    dateOption === "custom" && days.size === 0
      ? t("customNeedsAtLeastOneDay")
      : null;

  const toLabel = t("to");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography variant="h6">{t("workingHours")}</Typography>
        <Typography variant="p" className="text-muted-foreground text-sm">
          {t("workingHoursDescription")}
        </Typography>
      </div>
      <div className="flex flex-col gap-2">
        <Typography variant="h6">{t("allowNotifications")}</Typography>
        <div className="flex justify-between items-center gap-2">
          <CustomSelect
            options={dateOptions}
            value={dateOption}
            onChange={(v) => setDateOption(v as DateOptionValue)}
          />
          {dateOption !== "custom" && (
            <>
              <CustomSelect
                options={timeOptions}
                value={displayFor(startTime, timeOptions)}
                onChange={handleStartChange}
              />
              <Typography
                variant="p"
                className="text-muted-foreground text-sm shrink-0"
              >
                {toLabel}
              </Typography>
              <CustomSelect
                options={timeOptions}
                value={displayFor(endTime, timeOptions)}
                onChange={handleEndChange}
              />
            </>
          )}
        </div>
        {globalTimeError && (
          <Typography variant="p" className="text-red-500 text-xs">
            {globalTimeError}
          </Typography>
        )}
        {customEmptyError && (
          <Typography variant="p" className="text-red-500 text-xs">
            {customEmptyError}
          </Typography>
        )}
        {dateOption === "custom" && (
          <div className="rounded-md border border-input overflow-hidden">
            {DAYS.map((day) => {
              const daySchedule = days.get(day) ?? {
                startTime: "09:00",
                endTime: "17:00",
              };
              const dayInvalid = daySchedule.startTime >= daySchedule.endTime;
              return (
                <DayRow
                  key={day}
                  dayLabel={t(`days.${day}`)}
                  startTime={daySchedule.startTime}
                  endTime={daySchedule.endTime}
                  toLabel={toLabel}
                  onStartChange={(v) => handleDayStartChange(day, v)}
                  onEndChange={(v) => handleDayEndChange(day, v)}
                  timeOptions={timeOptions}
                  endError={
                    dayInvalid ? t("endTimeMustBeAfterStartTime") : undefined
                  }
                />
              );
            })}
            {days.size === 0 && (
              <Typography
                variant="p"
                className="px-3 py-2 text-[11px] text-muted-foreground"
              >
                {t("customNeedsAtLeastOneDay")}
              </Typography>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
