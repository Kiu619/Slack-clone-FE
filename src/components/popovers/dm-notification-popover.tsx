import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";
import { Separator } from "../ui/separator";
import { TbBell, TbBellOff, TbBellRinging } from "react-icons/tb";
import Typography from "../ui/typography";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function DMsNotificationPopover() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="custom" className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-r-md border border-[#797c814d]">
          <TbBell size={18} />
          {/* <TbBellOff size={18} /> */}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        <Typography
          text="Mute"
          variant="p"
          className="text-left"
        />
        {/* <Typography
          text="Unmute"
          variant="p"
          className="text-left"
        /> */}
      </TooltipContent>
    </Tooltip>
  );
}
