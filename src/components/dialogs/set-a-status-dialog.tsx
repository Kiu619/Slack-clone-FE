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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import { toast } from "sonner";
import * as z from "zod";
import { CustomSelect } from "../custom-select";
import { DatePickerDropdown } from "../date-picker-dropdown";
import Typography from "../ui/typography";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { useDialogs } from "@/hooks/use-translation";
import { useTranslations } from "next-intl";
import { buildTimeOptions } from "@/helpers/time-options";
const formSchema = z.object({
  status: z.string().max(100),
  emoji: z.string().optional(),
  clearAfter: z.string().optional(),
  date: z.date().optional(),
  time: z.string().optional(),
});

type SuggestionClearAfter = "1hour" | "30mins" | "today" | "never";
type DurationValue = "never" | "30mins" | "1hour" | "4hours" | "today" | "week" | "custom";

interface SuggestionDef {
  icon: string;
  textKey: "suggestionInMeeting" | "suggestionCommuting" | "suggestionOutSick" | "suggestionVacationing" | "suggestionWorkingRemotely";
  durationKey: "hour1" | "minutes30" | "today" | "dontClear";
  clearAfter: SuggestionClearAfter;
}

const SUGGESTION_DEFS: SuggestionDef[] = [
  { icon: "🗓️", textKey: "suggestionInMeeting", durationKey: "hour1", clearAfter: "1hour" },
  { icon: "🏃", textKey: "suggestionCommuting", durationKey: "minutes30", clearAfter: "30mins" },
  { icon: "🤒", textKey: "suggestionOutSick", durationKey: "today", clearAfter: "today" },
  { icon: "🌴", textKey: "suggestionVacationing", durationKey: "dontClear", clearAfter: "never" },
  { icon: "🏠", textKey: "suggestionWorkingRemotely", durationKey: "today", clearAfter: "today" },
];

const DURATION_DEFS: Array<{ value: DurationValue; key: "dontClear" | "minutes30" | "hour1" | "hours4" | "today" | "thisWeek" | "chooseDateAndTime" }> = [
  { value: "never", key: "dontClear" },
  { value: "30mins", key: "minutes30" },
  { value: "1hour", key: "hour1" },
  { value: "4hours", key: "hours4" },
  { value: "today", key: "today" },
  { value: "week", key: "thisWeek" },
  { value: "custom", key: "chooseDateAndTime" },
];

/** Module-level slots for arithmetic only (snapToTimesSlot). Labels are unused here. */
const TIME_SLOTS = buildTimeOptions("24h");

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

/** Snap thời gian local về một slot có trong `TIME_SLOTS` (00 / 30). */
function snapToTimesSlot(d: Date): string {
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  let best = TIME_SLOTS[0]!.value;
  let bestDiff = Infinity;
  for (const t of TIME_SLOTS) {
    const tMin = t.hour * 60 + t.minute;
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
  };
}

/** Trạng thái từ `GET .../members/:userId/status` (profile panel) */
function pickStatusFromMember(m: WorkspaceMemberStatus | null | undefined) {
  if (!m) {
    return {
      statusText: "",
      statusEmoji: "💬" as string,
      statusExpiration: null as string | null,
    };
  }
  return {
    statusText: m.statusText?.trim() ?? "",
    statusEmoji: m.statusEmoji ?? "💬",
    statusExpiration: m.statusExpiration,
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
  return {
    snapshot: { status: statusPlain, emoji: picked.statusEmoji },
    emoji: picked.statusEmoji,
    formValues: {
      status: statusPlain,
      emoji: "",
      clearAfter: derived.clearAfter,
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

  const t = useDialogs();
  const tStatus = useTranslations("dialogs.setAStatus");
  const tCommon = useTranslations("common");
  const language = useLanguageRegionStore((s) => s.language);
  const timeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const timeOptions = buildTimeOptions(timeFormat);

  const SUGGESTIONS = useMemo(
    () =>
      SUGGESTION_DEFS.map((def) => ({
        icon: def.icon,
        text: tStatus(def.textKey),
        duration: tStatus(def.durationKey),
        clearAfter: def.clearAfter,
      })),
    [tStatus],
  );

  const DURATIONS = useMemo(
    () =>
      DURATION_DEFS.map((def) => ({
        value: def.value,
        label: tStatus(def.key),
      })),
    [tStatus],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "",
      emoji: "",
      clearAfter: "today",
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

  const filteredTimes = timeOptions.filter((t) => {
    if (!selectedDate) return true;
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return true;

    const now = new Date();
    if (t.hour < now.getHours()) return false;
    if (t.hour === now.getHours() && t.minute <= now.getMinutes()) return false;
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
    form.setValue("date", new Date(), { shouldDirty: true })
    form.setValue("time", getNextAvailableTime(), { shouldDirty: true })
  }

  const clearStatus = () => {
    form.setValue("status", "", { shouldDirty: true, shouldValidate: true })
    setSelectedEmoji("💬")
    form.setValue("clearAfter", "never", { shouldDirty: true })
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

      toast.success(tStatus("statusUpdatedSuccess"));
      setOpen(false);

      if (props.statusSource === "profile") {
        openPanel({ userData: { ...userData, ...payload }, workspaceId: wsId });
      }
    } catch {
      toast.error(tStatus("statusUpdateFailed"));
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
              {tStatus('title')}
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
                        placeholder={tStatus('statusPlaceholder')}
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
                  <Typography text={tStatus('removeStatusAfter')} variant="p" className="text-[13px] font-bold" />
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
                                  value={timeOptions.find((o) => o.value === field.value)?.label ?? field.value ?? ""}
                                  onChange={(val) => field.onChange(val)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Suggestions */
              <div className="flex flex-col space-y-1 animate-in fade-in duration-200">
                <Typography text={tStatus('forWorkspace', { workspace: workspaceLabel })} variant="p" className="text-[#ababad] text-xs font-semibold mb-2" />
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
                      date: new Date(),
                      time: "17:00"
                    });
                  }}
                  className="px-1 transition-colors"
                >
                  {tStatus('removeStatus')}
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
                {tCommon('cancel')}
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
                {tStatus('save')}
              </Button>
            </div>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
