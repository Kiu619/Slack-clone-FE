import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Lock, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { useCreateChannel } from "@/hooks/use-channel";
import { cn } from "@/lib/utils";
import {
  getChannelNameError,
  getChannelNameInvalidChars,
  normalizeChannelNameInput,
} from "@/lib/channel-slug";
import { useDialogs } from "@/hooks/use-translation";

const formSchema = z.object({
  name: z.string().superRefine((v, ctx) => {
    const message = getChannelNameError(v);
    if (message !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
      });
    }
  }),
  isPrivate: z.enum(["public", "private"]),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  dialogOpen: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
  workspaceId: string;
};

const CreateChannelDialog = ({
  dialogOpen,
  setDialogOpen,
  workspaceId,
}: Props) => {
  const router = useRouter();
  const createChannel = useCreateChannel(workspaceId);

  const t = useDialogs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isPrivate: "public",
    },
  });

  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedVisibility = useWatch({
    control: form.control,
    name: "isPrivate",
  });

  const onSubmit = async ({ name, isPrivate: vis }: FormValues) => {
    try {
      const channel = await createChannel.mutateAsync({
        name,
        isPrivate: vis === "private",
        type: "text",
      });
      toast.success(t("createChannel.createdSuccess", { name: channel.name }));
      form.reset();
      setDialogOpen(false);
      router.push(`/workspace/${workspaceId}/channel/${channel.id}`);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? t("createChannel.failedToCreate"))
        : t("createChannel.failedToCreate");
      toast.error(message);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setDialogOpen(false);
      form.reset();
    }
  };

  return (
    <CustomDialog
      open={dialogOpen}
      onOpenChange={onOpenChange}
      maxWidth="620px"
    >
      <CustomDialogHeader onOpenChange={onOpenChange} className="px-7 py-6">
        <CustomDialogTitle className="text-[28px] font-bold tracking-[-0.03em]">
          {t("createChannel.title")}
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 flex flex-col justify-between flex-1"
          >
            <div className="space-y-6">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-semibold flex items-center gap-2">
                      {t("createChannel.nameLabel")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          #
                        </span>
                        <Input
                          placeholder={t("createChannel.namePlaceholder")}
                          {...field}
                          onChange={(e) => {
                            const next = normalizeChannelNameInput(
                              e.target.value,
                            );
                            field.onChange(next);
                            const invalid = getChannelNameInvalidChars(next);
                            if (invalid.length > 0) {
                              const unique = Array.from(new Set(invalid)).join(
                                " ",
                              );
                              form.setError("name", {
                                type: "manual",
                                message: `These characters aren't allowed: ${unique}`,
                              });
                            } else {
                              form.clearErrors("name");
                            }
                          }}
                          className="pl-8 bg-transparent border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-selection-hover"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="isPrivate"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-semibold">
                      {t("createChannel.visibilityLabel")}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-4 pt-2"
                      >
                        <label className="flex items-start gap-4 p-3 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-white/5">
                          <span
                            className={cn(
                              "relative mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border transition-colors",
                              field.value === "public"
                                ? "border-selection-hover bg-selection-hover"
                                : "border-[#77797d] bg-transparent",
                            )}
                          >
                            {field.value === "public" ? (
                              <span className="size-1 rounded-full bg-white" />
                            ) : null}
                          </span>
                          <input
                            type="radio"
                            name="visibility"
                            value="public"
                            checked={field.value === "public"}
                            onChange={() => field.onChange("public")}
                            className="sr-only"
                          />
                          <div className="text-white font-normal cursor-pointer leading-tight">
                            <span className="block font-bold mb-0.5 text-sm">
                              {t("createChannel.publicLabel")}
                            </span>
                            <span className="text-[#ABABAD] text-xs">
                              {t("createChannel.publicDescription")}
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-4 p-3 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-white/5">
                          <span
                            className={cn(
                              "relative mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border transition-colors",
                              field.value === "private"
                                ? "border-selection-hover bg-selection-hover"
                                : "border-[#77797d] bg-transparent",
                            )}
                          >
                            {field.value === "private" ? (
                              <span className="size-1 rounded-full bg-white" />
                            ) : null}
                          </span>
                          <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={field.value === "private"}
                            onChange={() => field.onChange("private")}
                            className="sr-only"
                          />
                          <div className="text-white font-normal cursor-pointer leading-tight">
                            <span className="block font-bold mb-0.5 text-sm">
                              {t("createChannel.privateLabel")}
                            </span>
                            <span className="text-[#ABABAD] text-xs">
                              {t("createChannel.privateDescription")}
                            </span>
                          </div>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CustomDialogBody>
      <CustomDialogFooter className="justify-end gap-3 px-7 py-5">
        <div className="pt-8 mt-auto sticky bottom-0 bg-white dark:bg-[#1A1D21]">
          <Button
            disabled={createChannel.isPending}
            type="submit"
            variant="success"
          >
            {createChannel.isPending
              ? t("createChannel.creatingButton")
              : t("createChannel.createButton")}
          </Button>
        </div>
      </CustomDialogFooter>
    </CustomDialog>
  );
};

export default CreateChannelDialog;
