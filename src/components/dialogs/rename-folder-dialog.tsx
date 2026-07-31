"use client";

import { renameChannelFolderApi } from "@/apis";
import { folderKeys } from "@/lib/query-keys";
import type { ChannelFolder } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
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
import { isAxiosError } from "axios";
import { useEffect } from "react";

const schema = z.object({
  name: z
    .string()
    .min(2, "Folder name must be at least 2 characters")
    .max(80, "Folder name must be at most 80 characters")
    .regex(
      /^[a-z0-9-_]+$/,
      "Folder name can only contain lowercase letters, numbers, hyphens and underscores",
    ),
});

type FormValues = z.infer<typeof schema>;

export function RenameFolderDialog({
  open,
  onOpenChange,
  targetId,
  folder,
  isDM = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  folder: ChannelFolder | null;
  isDM?: boolean;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (folder) {
      form.reset({ name: folder.name });
    }
  }, [folder, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: (name: string) =>
      renameChannelFolderApi(targetId, folder!.id, name, isDM),
    onSuccess: () => {
      toast.success("Folder renamed");
      void queryClient.invalidateQueries({
        queryKey: folderKeys.list(targetId),
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ??
          err.message
        : "Rename failed";
      toast.error(typeof msg === "string" ? msg : "Rename failed");
    },
  });

  if (!folder) return null;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => mutate(v.name.trim()))}
          className="flex flex-col h-full"
        >
          <CustomDialogHeader onOpenChange={onOpenChange}>
            <CustomDialogTitle>Rename folder</CustomDialogTitle>
          </CustomDialogHeader>
          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
            <FieldGroup className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>
          </CustomDialogBody>
          <CustomDialogFooter className="px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={isPending || !form.formState.isDirty}
            >
              Save
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
