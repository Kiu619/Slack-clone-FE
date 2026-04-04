import { Button } from "@/components/ui/button";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "../custom-dialog";
import { Input } from "@/components/ui/input";
import { MessageAttachment } from "@/lib/types";
import { LuLink } from "react-icons/lu";
import Typography from "../ui/typography";
import PillowFile from "./pillow-file";
import ShareFileEditor from "./share-file-editor";
export function ShareFileModal({
  open,
  onOpenChange,
  attachment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: MessageAttachment;
}) {
  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Share this file</CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6 space-y-4">
        <div className="flex flex-col items-center gap-4 w-full">
          <Input
            id="link"
            defaultValue=""
            placeholder="Search for channel or person"
            readOnly
            className="w-full bg-transparent border-[#565856] text-white focus:border-selection-hover transition-all"
          />

          <div className="w-full">
            <ShareFileEditor />
          </div>

          <PillowFile attachment={attachment} />
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="px-6 py-4 justify-between">
        <div className="flex items-center gap-2 cursor-pointer group">
          <LuLink size={16} className="text-[#1d9bd1] group-hover:text-selection-hover transition-colors" />
          <Typography
            variant="p"
            text="Copy link"
            className="text-sm text-[#1d9bd1] group-hover:text-selection-hover group-hover:underline transition-all"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-[#2C2E33] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold"
          >
            Forward
          </Button>
        </div>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
