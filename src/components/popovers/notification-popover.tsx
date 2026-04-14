import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";
import { Separator } from "../ui/separator";
import { TbBell, TbBellOff, TbBellRinging } from "react-icons/tb";
import Typography from "../ui/typography";

export default function NotificationPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="custom" className="p-1 border">
          <Bell size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent withOverlay className="z-999!">
        <div className="flex flex-col py-2">
          <span className="mx-4 text-[13px] text-[#8e9297]">
            Notify you about...
          </span>
          <Button variant="submenu">
            <TbBellRinging size={20} />
            <div className="flex flex-col gap-1">
              <Typography
                text="All new posts"
                variant="p"
                className="text-left"
              />
              <Typography
                text="Messages and threads you follow"
                variant="p"
                className="text-xs"
              />
            </div>
          </Button>

          <Button variant="submenu">
            <TbBell size={20} />
            <div className="flex flex-col gap-1">
              <Typography
                text="Just mentions"
                variant="p"
                className="text-left"
              />
              <Typography
                text="@you, @channel, @here"
                variant="p"
                className="text-xs"
              />
            </div>
          </Button>

          <Button variant="submenu"
          className="w-full"
          >
            <TbBellOff size={20} />
            <div className="flex flex-col gap-1 w-fit">
              <Typography
                text="Mute and hide"
                variant="p"
                className="text-left"
              />
              <Typography
                text="Only badged the channel"
                variant="p"
                className="text-xs"
              />
            </div>
          </Button>

          <Separator className="my-2" />

          <Button variant="submenu">
            <Typography text="Edit default preferences" variant="p" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
