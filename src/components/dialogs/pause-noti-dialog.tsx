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

import { useDialogs } from "@/hooks/use-translation";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { buildTimeOptions } from "@/helpers/time-options";

const getNextAvailableTime = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Suggest the next 30-min block after 1 hour from now
  let suggestHour = currentHour + 1;
  const suggestMin = currentMin > 30 ? 0 : 30;
  if (currentMin > 30) suggestHour += 1;

  if (suggestHour >= 24) suggestHour = 23; // Cap it
  return `${suggestHour.toString().padStart(2, "0")}:${suggestMin.toString().padStart(2, "0")}`;
};

export default function PauseNotificationsDialog({
  open,
  onOpenChange,
  onSave,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (pausedUntilISO: string) => void;
  defaultValues?: {
    date?: Date;
    time?: string;
  };
}) {
  const t = useDialogs();
  const timeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const timeOptions = buildTimeOptions(timeFormat);

  const formSchema = z
    .object({
      date: z.date(),
      time: z.string(),
    })
    .superRefine((data, ctx) => {
      const val = data.time;
      let hhmm: string | null = null;
      if (val.includes("AM") || val.includes("PM")) {
        const [timePart, ampm] = val.split(" ");
        const [hRaw, mRaw] = timePart.split(":").map(Number);
        let h = hRaw;
        const m = mRaw;
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        hhmm = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      } else if (/^\d{2}:\d{2}$/.test(val)) {
        hhmm = val;
      }
      if (!hhmm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid time",
          path: ["time"],
        });
        return;
      }
      const selectedDate = data.date;
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      if (isToday) {
        const [h, m] = hhmm.split(":").map(Number);
        const now = new Date();
        if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Time must be in the future",
            path: ["time"],
          });
        }
      }
    });

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
  }, [open, defaultValues, form]);

  const selectedDate = useWatch({ control: form.control, name: "date" });
  const filteredTimes = timeOptions.filter((time) => {
    if (!selectedDate) return true;
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return true;

    const now = new Date();
    if (time.hour < now.getHours()) return false;
    if (time.hour === now.getHours() && time.minute <= now.getMinutes()) return false;
    return true;
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const [hh, mm] = data.time.split(":").map(Number);
    const pausedUntil = new Date(data.date);
    pausedUntil.setHours(hh, mm, 0, 0);
    onSave?.(pausedUntil.toISOString());
    onOpenChange(false);
    form.reset();
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CustomDialogHeader onOpenChange={onOpenChange}>
            <CustomDialogTitle>{t("pauseNoti.title")}</CustomDialogTitle>
          </CustomDialogHeader>
          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("reminder.date")}</Label>
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
                <Label>{t("reminder.time")}</Label>
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <CustomSelect
                          options={filteredTimes}
                          value={timeOptions.find((o) => o.value === field.value)?.label ?? field.value}
                          isInvalid={fieldState.invalid}
                          onChange={(val) => {
                            field.onChange(val);
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
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid}
                variant="success"
              >
                {t("common.save")}
              </Button>
            </div>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
