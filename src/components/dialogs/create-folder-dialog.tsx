"use client";

import { createChannelFolderApi } from "@/apis";
import { folderKeys } from "@/lib/query-keys";
import type { ChannelFolder } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { isAxiosError } from "axios";
import { Button } from "../ui/button";
import { FieldGroup } from "../ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { useDialogs } from "@/hooks/use-translation";

const formSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(80),
});

export function CreateFolderDialog({
  open = true,
  onOpenChange,
  targetId,
  isDM = false,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  isDM?: boolean;
  onCreated?: (folder: ChannelFolder) => void;
}) {
  const t = useDialogs();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (name: string) =>
      createChannelFolderApi(targetId, name.trim(), isDM),
    onSuccess: (data) => {
      toast.success(t('createFolder.createdSuccess'));
      void queryClient.invalidateQueries({
        queryKey: folderKeys.list(targetId),
      });
      onCreated?.(data.folder);
      onOpenChange(false);
      form.reset({ name: "" });
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ??
          err.message
        : t('createFolder.failedToCreate');
      toast.error(typeof msg === "string" ? msg : t('createFolder.failedToCreate'));
    },
  });

  return (
    <CustomDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset({ name: "" });
      }}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => mutate(data.name.trim()))}
          className="flex flex-col h-full"
        >
          <CustomDialogHeader onOpenChange={onOpenChange}>
            <CustomDialogTitle>{t('createFolder.title')}</CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
            <div className="flex-1 space-y-6">
              <FieldGroup className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">{t('createFolder.name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('createFolder.namePlaceholder')}
                          className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </div>
          </CustomDialogBody>

          <CustomDialogFooter className="px-6 py-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              disabled={
                isPending ||
                !form.formState.isDirty ||
                !form.formState.isValid
              }
              type="submit"
              variant="success"
            >
              {isPending ? t('createFolder.creating') : t('createFolder.create')}
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
