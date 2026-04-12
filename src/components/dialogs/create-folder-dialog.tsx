"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Folder name must be at least 2 characters")
    .max(80, "Folder name must be at most 80 characters")
    .regex(
      /^[a-z0-9-_]+$/,
      "Folder name can only contain lowercase letters, numbers, hyphens and underscores",
    ),
});

export function CreateFolderDialog({
  open,
  setOpen,
  channelId,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  channelId: string;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setOpen(false);
      toast.success("Contact information updated successfully");
    } catch {
      toast.error("Failed to update contact information. Please try again.");
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={setOpen}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <CustomDialogHeader onOpenChange={setOpen}>
            <CustomDialogTitle>Create a folder</CustomDialogTitle>
          </CustomDialogHeader>

          <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
            <div className="flex-1 space-y-6">
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
                          placeholder="Ex. Project tracker"
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
              variant="ghost"
              type="button"
              onClick={() => setOpen(false)}
              className="dark:hover:bg-[#2C2E33] mr-2 font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting || !form.formState.isDirty || !form.formState.isValid}
              type="submit"
              variant='success'
            >
              Save Changes
            </Button>
          </CustomDialogFooter>
        </form>
      </Form>
    </CustomDialog>
  );
}
