"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { CustomSelect } from "../custom-select";
import { DatePickerDropdown } from "../date-picker-dropdown";

import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form";
import { Label } from "../ui/label";
import Typography from "../ui/typography";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/lib/query-keys";
import { useParams } from "next/navigation";
import { TIMEZONE_OPTIONS } from "@/lib/timezone";

/** Logic CŨ: chỉ cần slot thời gian > "bây giờ" (không bắt buộc buffer 1 phút). */
const MIN_LEAD_MS_LEGACY = 0;

/**
 * Logic MỚI (đã comment — trùng rule backend Nest: scheduledAt phải cách hiện tại ≥ 1 phút):
 * const MIN_LEAD_MS_NEW = 60_000;
 * - superRefine: at.getTime() < Date.now() + MIN_LEAD_MS_NEW
 * - filteredTimes: slotAt.getTime() > now.getTime() + MIN_LEAD_MS_NEW
 */

const TIMES = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    label: `${h12}:${min} ${ampm}`,
    value: `${hour.toString().padStart(2, "0")}:${min}`,
    hour,
    min: parseInt(min, 10),
  };
});

const getNextAvailableTime = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  let suggestHour = currentHour + 1;
  const suggestMin = currentMin > 30 ? 0 : 30;
  if (currentMin > 30) suggestHour += 1;

  if (suggestHour >= 24) suggestHour = 23;
  return `${suggestHour.toString().padStart(2, "0")}:${suggestMin.toString().padStart(2, "0")}`;
};

const formatToAMPM = (hhmm: string): string => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const parseSmartTime = (input: string): string | null => {
  const clean = input.replace(/\D/g, "");
  if (!clean) return null;

  let hours = 0;
  let minutes = 0;

  if (clean.length === 1 || clean.length === 2) {
    hours = parseInt(clean, 10);
    minutes = 0;
  } else if (clean.length === 3) {
    hours = parseInt(clean[0]!, 10);
    minutes = parseInt(clean.slice(1), 10);
  } else if (clean.length === 4) {
    hours = parseInt(clean.slice(0, 2), 10);
    minutes = parseInt(clean.slice(2), 10);
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) return null;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

/** Chuẩn hóa giá trị `time` form → `HH:mm` (24h). */
export function parseFormTimeToHHmm(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (/\b(AM|PM)\b/i.test(v)) {
    const normalized = v.replace(/\s+/g, " ");
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(normalized);
    if (!m) return null;
    let h = parseInt(m[1]!, 10);
    const mm = parseInt(m[2]!, 10);
    const ap = m[3]!.toUpperCase();
    if (mm > 59 || h < 1 || h > 12) return null;
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  }
  return parseSmartTime(v);
}

function combineDateAndHHmm(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const out = new Date(date);
  out.setHours(h!, m!, 0, 0);
  return out;
}

const formSchema = z
  .object({
    date: z.date(),
    time: z.string(),
  })
  .superRefine((data, ctx) => {
    const hhmm = parseFormTimeToHHmm(data.time);
    if (!hhmm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid time",
        path: ["time"],
      });
      return;
    }
    const at = combineDateAndHHmm(data.date, hhmm);
    /* --- Logic check thời gian CŨ (đang dùng) --- */
    if (at.getTime() <= Date.now() + MIN_LEAD_MS_LEGACY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời gian phải ở tương lai",
        path: ["time"],
      });
    }
    /* --- Logic check thời gian MỚI (comment — khớp backend ≥ 1 phút) ---
    if (at.getTime() < Date.now() + MIN_LEAD_MS_NEW) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời gian phải cách hiện tại ít nhất 1 phút",
        path: ["time"],
      });
    }
    */
  });

export type ScheduleSendDialogDefaultValues = {
  date?: Date;
  time?: string;
};

export default function ScheduleSendDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultValues,
  isSubmitting: isSubmittingExternal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (scheduledAtIso: string) => void | Promise<void>;
  defaultValues?: ScheduleSendDialogDefaultValues;
  isSubmitting?: boolean;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      date: defaultValues?.date || new Date(),
      time: defaultValues?.time || getNextAvailableTime(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: defaultValues?.date || new Date(),
        time: defaultValues?.time || getNextAvailableTime(),
      });
    }
  }, [open, defaultValues?.date, defaultValues?.time, form]);

  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceId =
    typeof params.workspaceId === "string"
      ? params.workspaceId
      : Array.isArray(params.workspaceId)
        ? params.workspaceId[0] ?? ""
        : "";

  const workspaceProfileData = workspaceId
    ? queryClient.getQueryData<{
        timeZone?: string;
      }>(authKeys.workspaceProfile(workspaceId))
    : undefined;
  const timezone = workspaceProfileData?.timeZone;
  const displayTimezone =
    TIMEZONE_OPTIONS.find((t) => t.value === timezone)?.label ?? "Local";

  const selectedDate = useWatch({ control: form.control, name: "date" });
  const filteredTimes = TIMES.filter((t) => {
    if (!selectedDate) return true;
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return true;

    const now = new Date();
    const slotAt = combineDateAndHHmm(selectedDate, t.value);
    /* Logic CŨ: slot chỉ cần sau "bây giờ" */
    return slotAt.getTime() > now.getTime() + MIN_LEAD_MS_LEGACY;
    /* Logic MỚI (comment — lọc slot cách hiện tại ≥ 1 phút, khớp backend):
    return slotAt.getTime() > now.getTime() + MIN_LEAD_MS_NEW;
    */
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const hhmm = parseFormTimeToHHmm(data.time);
    if (!hhmm || !onConfirm) return;
    const at = combineDateAndHHmm(data.date, hhmm);
    try {
      await onConfirm(at.toISOString());
      onOpenChange(false);
      form.reset();
    } catch {
      /* parent / hook toast; giữ dialog mở */
    }
  };

  const busy = form.formState.isSubmitting || !!isSubmittingExternal;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CustomDialogHeader onOpenChange={onOpenChange}>
            <div className="flex flex-col gap-2">
              <CustomDialogTitle>Schedule message</CustomDialogTitle>
              <Typography
                text={`Time zone: ${displayTimezone}`}
                variant="p"
                className="text-xs font-medium"
              />
            </div>
          </CustomDialogHeader>
          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Date</Label>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <DatePickerDropdown
                          date={field.value}
                          setDate={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Time</Label>
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <CustomSelect
                          editable={true}
                          options={filteredTimes}
                          value={(() => {
                            const v = field.value ?? "";
                            if (/\b(AM|PM)\b/i.test(v)) return v;
                            if (/^\d{1,2}:\d{2}$/.test(v.trim()))
                              return formatToAMPM(v.trim());
                            return v;
                          })()}
                          isInvalid={fieldState.invalid}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const parsed = parseSmartTime(field.value);
                              if (parsed) {
                                field.onChange(parsed);
                              }
                            }
                          }}
                          onBlur={() => {
                            const parsed = parseFormTimeToHHmm(field.value);
                            if (parsed) {
                              field.onChange(parsed);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CustomDialogBody>
          <CustomDialogFooter>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => onOpenChange(false)}
                className="h-9 rounded-md px-4 text-[14px] font-bold text-[#616061] hover:bg-[#f8f8f8] dark:text-[#ababad] dark:hover:bg-[#222529]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || busy}
                className="h-9 rounded-md bg-[#007a5a] px-4 text-[14px] font-bold text-white hover:bg-[#005a44] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Schedule message
              </Button>
            </div>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
