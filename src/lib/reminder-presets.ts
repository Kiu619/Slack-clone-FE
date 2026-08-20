import { addHours, addMinutes, nextMonday, setHours, setMinutes } from "date-fns";

export interface ReminderPreset {
  label: string;
  value: string;
}

export function getReminderPresets(): ReminderPreset[] {
  const now = new Date();
  return [
    {
      label: "In 30 minutes",
      value: addMinutes(now, 30).toISOString(),
    },
    {
      label: "In 1 hour",
      value: addHours(now, 1).toISOString(),
    },
    {
      label: "In 3 hours",
      value: addHours(now, 3).toISOString(),
    },
    {
      label: "Tomorrow at 9:00 AM",
      value: setMinutes(setHours(addHours(now, 24), 9), 0).toISOString(),
    },
    {
      label: "Monday at 9:00 AM",
      value: setMinutes(setHours(nextMonday(now), 9), 0).toISOString(),
    },
  ];
}

export function localizeReminderPresets(
  presets: ReminderPreset[],
  t: (key: string) => string,
): ReminderPreset[] {
  return presets.map((p, i) => {
    const keys = [
      "reminderPresets.in30Minutes",
      "reminderPresets.in1Hour",
      "reminderPresets.in3Hours",
      "reminderPresets.tomorrowAt9Am",
      "reminderPresets.mondayAt9Am",
    ] as const;
    return { ...p, label: t(keys[i]) };
  });
}
