import { Loader2 } from "lucide-react";

import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { Button } from "../ui/button";
import Typography from "../ui/typography";
import { useDialogs } from "@/hooks/use-translation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  saving?: boolean;
  onLeave: () => Promise<void> | void;
}

export default function LeaveChannelDialog({
  open,
  onOpenChange,
  channelName,
  saving = false,
  onLeave,
}: Props) {
  const t = useDialogs();

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="540px">
      <CustomDialogHeader onOpenChange={onOpenChange} className="px-7 py-6">
        <CustomDialogTitle className="text-[24px] font-bold tracking-[-0.03em]">
          {t("leaveChannel.title")}
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <Typography className="text-[16px] leading-7">
          {t("leaveChannel.description", { name: channelName })}
        </Typography>
      </CustomDialogBody>

      <CustomDialogFooter className="justify-end gap-3 px-7 py-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-10 rounded-[6px] border-[#cfcacf] px-5 text-[14px] font-semibold"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="error"
          onClick={() => void onLeave()}
          disabled={saving}
          className="h-10 rounded-[6px] px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("leaveChannel.leaving")}
            </span>
          ) : (
            t("leaveChannel.leave")
          )}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
