import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[600px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Share this file</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 w-full">
          <Input
            id="link"
            defaultValue=""
            placeholder="Search for channel or person"
            readOnly
            className="w-full"
          />

          <div className="w-full my-2">
            <ShareFileEditor />
          </div>

          <PillowFile attachment={attachment} />
        </div>
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <LuLink size={15} className="text-[#43d0ff]" />
            <Typography
              variant="p"
              text="Copy link"
              className="text-[15px] text-[#43d0ff] cursor-pointer hover:underline"
            />
          </div>
          <DialogClose asChild>
            <Button type="button">Forward</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
