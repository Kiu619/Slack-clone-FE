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
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const TIMES = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    label: `${h12}:${min} ${ampm}`,
    value: `${hour.toString().padStart(2, "0")}:${min}`,
    hour,
    min: parseInt(min),
  };
});

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

const formatToAMPM = (hhmm: string): string => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const parseSmartTime = (input: string): string | null => {
  // Loại bỏ tất cả ký tự không phải số
  const clean = input.replace(/\D/g, "");
  if (!clean) return null;

  let hours = 0;
  let minutes = 0;

  if (clean.length === 1 || clean.length === 2) {
    hours = parseInt(clean);
    minutes = 0;
  } else if (clean.length === 3) {
    hours = parseInt(clean[0]);
    minutes = parseInt(clean.slice(1));
  } else if (clean.length === 4) {
    hours = parseInt(clean.slice(0, 2));
    minutes = parseInt(clean.slice(2));
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) return null;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export default function ReminderDialog({
  open,
  onOpenChange,
  onSave,
  hideDescription = false,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (remindAt: string, note?: string) => void;
  hideDescription?: boolean;
  defaultValues?: {
    date?: Date;
    time?: string;
    description?: string;
  };
}) {
  const formSchema = z.object({
    date: z.date(),
    time: z.string(),
    description: hideDescription ? z.string() : z.string().min(1, "Description is required"),
  }).superRefine((data, ctx) => {
    // 1. Validate time format/parsing
    const val = data.time;
    let hhmm = val;
    if (!(val.includes("AM") || val.includes("PM"))) {
      const parsed = parseSmartTime(val);
      if (!parsed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid time",
          path: ["time"],
        });
        return;
      }
      hhmm = parsed;
    } else {
      // Convert "h:mm AM/PM" back to "HH:mm" for comparison
      const [timePart, ampm] = val.split(" ");
      let [h, m] = timePart.split(":").map(Number);
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      hhmm = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }

    // 2. Check if time is in the past for today
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
      description: defaultValues?.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: defaultValues?.date || new Date(),
        time: defaultValues?.time || getNextAvailableTime(),
        description: defaultValues?.description || "",
      });
    }
  }, [open, defaultValues, form]);

  // Watch field 'time' để validate real-time cho nút Save và hiển thị lỗi
  const selectedDate = useWatch({ control: form.control, name: "date" });
  const filteredTimes = TIMES.filter((t) => {
    if (!selectedDate) return true;
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return true;

    const now = new Date();
    if (t.hour < now.getHours()) return false;
    if (t.hour === now.getHours() && t.min <= now.getMinutes()) return false;
    return true;
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const [hh, mm] = data.time.split(":").map(Number);
    const remindAt = new Date(data.date);
    remindAt.setHours(hh, mm, 0, 0);
    onSave?.(remindAt.toISOString(), data.description || undefined);
    onOpenChange(false);
    form.reset();
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CustomDialogHeader onOpenChange={onOpenChange}>
            <CustomDialogTitle>Set a reminder</CustomDialogTitle>
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
                          value={field.value.includes(":") ? formatToAMPM(field.value) : field.value}
                          isInvalid={fieldState.invalid}
                          onChange={(val) => {
                            // Cập nhật giá trị thô vào form để useEffect validate và khóa nút Save
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
                            const parsed = parseSmartTime(field.value);
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
              {!hideDescription && (
                <div className="flex flex-col gap-2">
                  <Label>Description</Label>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Remind me to..."
                            className="h-10 rounded-lg border-[#dddddd] bg-white text-[14px] placeholder:text-[#616061] dark:border-[#35373B] dark:bg-[#1A1D21] dark:placeholder:text-[#ababad]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </CustomDialogBody>
          <CustomDialogFooter>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid}
                variant="success"
              >
                Save
              </Button>
            </div>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
