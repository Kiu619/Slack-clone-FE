"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  User,
  Workspace,
  WorkspaceMemberStatus,
} from "@/lib/types";
import { useForm, useWatch } from "react-hook-form";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle
} from "../custom-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem
} from "../ui/form";

import { updateMemberStatusApi } from "@/apis";
import { authKeys } from "@/lib/query-keys";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import * as z from "zod";
import { CustomSelect } from "../custom-select";
import { DatePickerDropdown } from "../date-picker-dropdown";
import Typography from "../ui/typography";

const formSchema = z.object({
  status: z.string().max(100),
  emoji: z.string().optional(),
  clearAfter: z.string().optional(),
  pauseNotifications: z.string().optional(),
  date: z.date().optional(),
  time: z.string().optional(),
});

/** Gợi ý — `duration` chỉ để hiển thị; `clearAfter` / `pauseNotifications` khớp với 2 select */
const SUGGESTIONS = [
  {
    icon: "🗓️",
    text: "In a meeting",
    duration: "1 hour",
    clearAfter: "1hour",
    pauseNotifications: "all",
  },
  {
    icon: "🏃",
    text: "Commuting",
    duration: "30 minutes",
    clearAfter: "30mins",
    pauseNotifications: "none",
  },
  {
    icon: "🤒",
    text: "Out sick",
    duration: "Today",
    clearAfter: "today",
    pauseNotifications: "none",
  },
  {
    icon: "🌴",
    text: "Vacationing",
    duration: "Don't clear",
    clearAfter: "never",
    pauseNotifications: "none",
  },
  {
    icon: "🏠",
    text: "Working remotely",
    duration: "Today",
    clearAfter: "today",
    pauseNotifications: "none",
  },
] as const;

const DURATIONS = [
  { label: "Don't clear", value: "never" },
  { label: "30 minutes", value: "30mins" },
  { label: "1 hour", value: "1hour" },
  { label: "4 hours", value: "4hours" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "Choose date and time", value: "custom" },
];

const PAUSE_OPTIONS = [
  { label: "Do not pause", value: "none" },
  { label: "Pause for everyone", value: "all" },
];

const TIMES = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    label: `${h12}:${min} ${ampm}`,
    value: `${hour.toString().padStart(2, '0')}:${min}`,
    hour,
    min: parseInt(min)
  };
});

/** Gọi từ handler (không phải render) — tránh cảnh báo purity với `Date.now` trong component. */
function isoHoursFromNow(hours: number): string {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

const getNextAvailableTime = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Suggest the next 30-min block after 1 hour from now
  let suggestHour = currentHour + 1;
  const suggestMin = currentMin > 30 ? 0 : 30;
  if (currentMin > 30) suggestHour += 1;

  if (suggestHour >= 24) suggestHour = 23; // Cap it
  return `${suggestHour.toString().padStart(2, '0')}:${suggestMin.toString().padStart(2, '0')}`;
}

/** Snap thời gian local về một slot có trong `TIMES` (00 / 30). */
function snapToTimesSlot(d: Date): string {
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  let best = TIMES[0]!.value;
  let bestDiff = Infinity;
  for (const t of TIMES) {
    const tMin = t.hour * 60 + t.min;
    const diff = Math.abs(totalMinutes - tMin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = t.value;
    }
  }
  return best;
}

/**
 * Đồng bộ `statusExpiration` (ISO từ API) → `clearAfter` + date/time (custom).
 */
function deriveClearAfterFromExpiration(
  statusExpiration: string | null | undefined,
): { clearAfter: string; date: Date; time: string } {
  const fallback = (): { clearAfter: string; date: Date; time: string } => ({
    clearAfter: "never",
    date: new Date(),
    time: getNextAvailableTime(),
  });

  if (!statusExpiration) return fallback();

  const exp = new Date(statusExpiration);
  if (Number.isNaN(exp.getTime())) return fallback();

  const now = new Date();
  if (exp.getTime() <= now.getTime()) return fallback();

  const diffMs = exp.getTime() - now.getTime();
  const diffMin = diffMs / 60000;

  const timeSlot = snapToTimesSlot(exp);
  const dateOnly = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());

  if (diffMin >= 28 && diffMin <= 34) {
    return { clearAfter: "30mins", date: dateOnly, time: timeSlot };
  }
  if (diffMin >= 56 && diffMin <= 68) {
    return { clearAfter: "1hour", date: dateOnly, time: timeSlot };
  }
  if (diffMin >= 225 && diffMin <= 255) {
    return { clearAfter: "4hours", date: dateOnly, time: timeSlot };
  }

  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  if (
    exp.getFullYear() === now.getFullYear() &&
    exp.getMonth() === now.getMonth() &&
    exp.getDate() === now.getDate() &&
    Math.abs(exp.getTime() - endToday.getTime()) < 3 * 60 * 1000
  ) {
    return { clearAfter: "today", date: dateOnly, time: timeSlot };
  }

  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  weekOut.setHours(23, 59, 59, 999);
  if (Math.abs(exp.getTime() - weekOut.getTime()) < 36 * 60 * 60 * 1000) {
    return { clearAfter: "week", date: dateOnly, time: timeSlot };
  }

  return {
    clearAfter: "custom",
    date: dateOnly,
    time: timeSlot,
  };
}

type FormValues = z.infer<typeof formSchema>;

function buildStatusExpirationFromForm(data: FormValues): string | null {
  const now = new Date();
  switch (data.clearAfter) {
    case "never":
      return null;
    case "30mins":
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    case "1hour":
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case "4hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    case "today": {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "week": {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    case "custom":
      if (data.date && data.time) {
        const [hours, minutes] = data.time.split(":").map(Number);
        const d = new Date(data.date);
        d.setHours(hours, minutes ?? 0, 0, 0);
        return d.toISOString();
      }
      return null;
    default:
      return null;
  }
}

/** Trạng thái hiển thị — lấy từ userData (profile của user hiện tại trong workspace) */
function pickStatusFromUser(u: User) {
  return {
    statusText: u.statusText?.trim() ?? "",
    statusEmoji: u.statusEmoji ?? "💬",
    statusExpiration: u.statusExpiration,
    notificationsPausedUntil: u.notificationsPausedUntil,
  };
}

/** Trạng thái từ `GET .../members/:userId/status` (profile panel) */
function pickStatusFromMember(m: WorkspaceMemberStatus | null | undefined) {
  if (!m) {
    return {
      statusText: "",
      statusEmoji: "💬" as string,
      statusExpiration: null as string | null,
      notificationsPausedUntil: null as string | null,
    };
  }
  return {
    statusText: m.statusText?.trim() ?? "",
    statusEmoji: m.statusEmoji ?? "💬",
    statusExpiration: m.statusExpiration,
    notificationsPausedUntil: m.notificationsPausedUntil,
  };
}

/** Dùng khi mở dialog — logic thuần, không gọi setState. */
function deriveSyncFromProps(p: SetAStatusDialogProps) {
  const picked =
    p.statusSource === "sidebar"
      ? pickStatusFromUser(p.userData)
      : pickStatusFromMember(p.memberStatus);
  const statusPlain = picked.statusText.replace(/^\p{Emoji}\s*/u, "").trim();
  const derived = deriveClearAfterFromExpiration(picked.statusExpiration);
  const pauseNotifications = picked.notificationsPausedUntil ? "all" : "none";
  return {
    snapshot: { status: statusPlain, emoji: picked.statusEmoji },
    emoji: picked.statusEmoji,
    formValues: {
      status: statusPlain,
      emoji: "",
      clearAfter: derived.clearAfter,
      pauseNotifications,
      date: derived.date,
      time: derived.time,
    },
  };
}

export type SetAStatusDialogProps =
  | {
    open: boolean;
    setOpen: (open: boolean) => void;
    userData: User;
    workspaceId: string;
    /** Mở từ user-sidebar — lấy status từ workspace hiện tại */
    statusSource: "sidebar";
    currentWorkspaceData: Workspace;
  }
  | {
    open: boolean;
    setOpen: (open: boolean) => void;
    userData: User;
    workspaceId: string;
    /** Mở từ profile-panel — lấy status từ API member status */
    statusSource: "profile";
    memberStatus: WorkspaceMemberStatus | null | undefined;
    /** Tên workspace cho dòng gợi ý "For …" */
    workspaceName?: string;
  };

export function SetAStatusDialog(props: SetAStatusDialogProps) {
  const { open, setOpen, userData, workspaceId, statusSource } = props;
  const queryClient = useQueryClient();
  const { open: openPanel } = useProfilePanelStore();
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState("💬")
  /** Snapshot khi vừa mở dialog — để nút Save / Remove và so sánh thay đổi */
  const [initialSnapshot, setInitialSnapshot] = useState({
    status: "",
    emoji: "💬",
  })
  const workspaceLabel =
    statusSource === "sidebar"
      ? props.currentWorkspaceData.name
      : (props.workspaceName?.trim() || "Workspace");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "",
      emoji: "",
      clearAfter: "today",
      pauseNotifications: "none",
      date: new Date(),
      time: getNextAvailableTime(),
    },
  });

  useEffect(() => {
    if (!open) return;
    const snapshotProps = props;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const v = deriveSyncFromProps(snapshotProps);
      setInitialSnapshot(v.snapshot);
      setSelectedEmoji(v.emoji);
      form.reset(v.formValues);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ sync khi `open` đổi; `snapshotProps` chụp props tại lần mở (tránh reset khi refetch)
  }, [open, form]);

  const watchedStatus = useWatch({ control: form.control, name: "status" });
  const watchedClearAfter = useWatch({ control: form.control, name: "clearAfter" });
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

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      setSelectedEmoji(emojiData.emoji)
      setShowEmojiPicker(false)
    },
    [],
  )

  const handleSuggestionClick = (suggestion: (typeof SUGGESTIONS)[number]) => {
    form.setValue("status", suggestion.text, { shouldDirty: true, shouldValidate: true })
    setSelectedEmoji(suggestion.icon)
    form.setValue("clearAfter", suggestion.clearAfter, { shouldDirty: true })
    form.setValue("pauseNotifications", suggestion.pauseNotifications, {
      shouldDirty: true,
    })
    form.setValue("date", new Date(), { shouldDirty: true })
    form.setValue("time", getNextAvailableTime(), { shouldDirty: true })
  }

  const clearStatus = () => {
    form.setValue("status", "", { shouldDirty: true, shouldValidate: true })
    setSelectedEmoji("💬")
    form.setValue("clearAfter", "never", { shouldDirty: true })
    form.setValue("pauseNotifications", "none", { shouldDirty: true })
    form.setValue("date", new Date(), { shouldDirty: true })
    form.setValue("time", getNextAvailableTime(), { shouldDirty: true })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])



  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const wsId = workspaceId
      const statusExpirationIso = buildStatusExpirationFromForm(data);

      const payload = {
        statusText: data.status || null,
        statusEmoji: selectedEmoji,
        statusExpiration: statusExpirationIso,
        notificationsPausedUntil:
          data.pauseNotifications === "all" ? isoHoursFromNow(1) : null,
      };

      await updateMemberStatusApi(wsId, payload);

      useWorkspaceMemberStore.getState().patchFromSocket(wsId, {
        id: userData.id,
        workspaceId: wsId,
        ...payload,
      });

      await queryClient.invalidateQueries({
        queryKey: authKeys.workspaceProfile(wsId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["workspace-member-status", wsId],
      });

      toast.success("Status updated successfully");
      setOpen(false);

      if (props.statusSource === "profile") {
        openPanel({ userData: { ...userData, ...payload }, workspaceId: wsId });
      }
    } catch {
      toast.error("Failed to update status. Please try again.");
    }
  }

  return (
    <CustomDialog open={open} onOpenChange={setOpen}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <CustomDialogHeader onOpenChange={setOpen}>
            <CustomDialogTitle>
              Set a status
            </CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] space-y-6">
            {/* Input Area */}
            <div className="relative border border-[#565856] rounded-md focus-within:border-selection-hover focus-within:ring-[3px] focus-within:ring-offset-0 focus-within:ring-focus-ring bg-transparent flex items-center p-1">
              <div className="relative" ref={emojiPickerRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <span className="text-xl">{selectedEmoji}</span>
                </Button>

                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 left-0 z-50">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      theme={Theme.DARK}
                      width={350}
                      height={400}
                      searchPlaceHolder="Search emojis..."
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="What's your status?"
                        className="border-none bg-transparent focus-visible:ring-0 placeholder:text-[#ababad] h-9"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchedStatus && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearStatus}
                >
                  <LuX size={16} />
                </Button>
              )}
            </div>

            {/* Status specific options OR Suggestions */}
            {watchedStatus ? (
              <div className="flex flex-col space-y-4 animate-in fade-in duration-200">
                {/* Remove status after */}
                <div className="flex flex-col space-y-2">
                  <Typography text="Remove status after" variant="p" className="text-[13px] font-bold" />
                  <FormField
                    control={form.control}
                    name="clearAfter"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CustomSelect
                            options={DURATIONS}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchedClearAfter === "custom" && (
                    <div className="flex items-center space-x-2 w-full animate-in slide-in-from-top-2 duration-300">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <DatePickerDropdown date={field.value} setDate={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="w-[120px]">
                        <FormField
                          control={form.control}
                          name="time"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <CustomSelect
                                  options={filteredTimes}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pause notifications */}
                <div className="flex flex-col space-y-2">
                  <Typography text="Pause notifications" variant="p" className="text-[13px] font-bold" />
                  <FormField
                    control={form.control}
                    name="pauseNotifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <CustomSelect
                            options={PAUSE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : (
              /* Suggestions */
              <div className="flex flex-col space-y-1 animate-in fade-in duration-200">
                <Typography text={`For ${workspaceLabel}`} variant="p" className="text-[#ababad] text-xs font-semibold mb-2" />
                <div className="space-y-0.5">
                  {SUGGESTIONS.map((s, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center px-3 py-2 rounded cursor-pointer hover:bg-selection-hover hover:text-white dark:text-[#d1d2d3]"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      <span className="mr-3 text-lg">{s.icon}</span>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{s.text}</span>
                        <span className="text-xs opacity-60 group-hover:opacity-100">{s.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CustomDialogBody>

          <CustomDialogFooter>
            {initialSnapshot.status.trim() ||
              (initialSnapshot.status && initialSnapshot.emoji !== "💬") ? (
              <div className="flex-1">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={async () => {
                    await onSubmit({
                      status: "",
                      emoji: "💬",
                      clearAfter: "never",
                      pauseNotifications: "none",
                      date: new Date(),
                      time: "17:00"
                    });
                  }}
                  className="px-1 transition-colors"
                >
                  Remove status
                </Button>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={(() => {
                  const s = (watchedStatus ?? "").trim();
                  const submitting = form.formState.isSubmitting;
                  const hasChanges =
                    s !== initialSnapshot.status ||
                    selectedEmoji !== initialSnapshot.emoji ||
                    form.formState.isDirty;
                  return submitting || !hasChanges;
                })()}
                type="submit"
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
