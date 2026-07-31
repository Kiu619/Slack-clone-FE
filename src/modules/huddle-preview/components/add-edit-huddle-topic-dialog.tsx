"use client";

import { Button } from "@/components/ui/button";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter,
} from "@/components/custom-dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const topicSchema = z.object({
  topic: z.string().max(200, "Topic must be 200 characters or less"),
});

type TopicFormData = z.infer<typeof topicSchema>;

interface AddEditHuddleTopicDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialTopic?: string | null;
  onSave: (topic: string) => void;
  isLoading?: boolean;
}

export function AddEditHuddleTopicDialog({
  open,
  setOpen,
  initialTopic,
  onSave,
  isLoading = false,
}: AddEditHuddleTopicDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isValid },
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
    defaultValues: { topic: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      reset({ topic: initialTopic ?? "" });
      setValue("topic", initialTopic ?? "");
      setTimeout(() => {
        document.getElementById("huddle-topic")?.focus();
      }, 100);
    }
  }, [open, initialTopic, reset, setValue]);

  const onSubmit = (data: TopicFormData) => {
    onSave(data.topic.trim());
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  return (
    <CustomDialog open={open} onOpenChange={handleClose} maxWidth="400px">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CustomDialogHeader onOpenChange={handleClose}>
          <CustomDialogTitle>
            {initialTopic ? "Edit topic" : "Add a topic"}
          </CustomDialogTitle>
        </CustomDialogHeader>

        <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
          <FieldGroup className="space-y-4">
            <Field>
              <Label htmlFor="huddle-topic" className="">
                Topic
              </Label>
              <Input
                {...register("topic")}
                id="huddle-topic"
                name="topic"
                placeholder="What are we discussing?"
                className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
              />
              {errors.topic && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.topic.message}
                </p>
              )}
            </Field>
          </FieldGroup>
        </CustomDialogBody>

        <CustomDialogFooter className="px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className=" mr-2"
            >
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={isLoading || !isDirty || !isValid}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
        </CustomDialogFooter>

      </form>
    </CustomDialog>
  );
}
