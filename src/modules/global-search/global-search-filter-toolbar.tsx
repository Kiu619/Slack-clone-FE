"use client";

import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import Typography from "../../components/ui/typography";
import { cn } from "@/lib/utils";
import { FiPlus } from "react-icons/fi";
import { BiMessageRounded } from "react-icons/bi";
import { BiMessageRoundedDetail } from "react-icons/bi";
import { FiHash } from "react-icons/fi";
import { MdOutlineCalendarMonth, MdOutlinePerson } from "react-icons/md";
import { ImFilesEmpty } from "react-icons/im";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";

type Props = {
  fromMeActive: boolean;
  includeMeActive: boolean;
  inActive: boolean;
  hasActive: boolean;
  isActive: boolean;
  last7DaysActive: boolean;
  onToggleFromMe: () => void;
  onToggleIncludeMe: () => void;
  onOpenFromPicker: () => void;
  onOpenWithPicker: () => void;
  onOpenInPicker: () => void;
  onOpenHasPicker: () => void;
  onOpenIsPicker: () => void;
  onToggleLast7Days: () => void;
  onOpenTypePicker: () => void;
};

export function GlobalSearchFilterToolbar({
  fromMeActive,
  includeMeActive,
  inActive,
  hasActive,
  isActive,
  last7DaysActive,
  onToggleFromMe,
  onToggleIncludeMe,
  onOpenFromPicker,
  onOpenWithPicker,
  onOpenInPicker,
  onOpenHasPicker,
  onOpenIsPicker,
  onToggleLast7Days,
  onOpenTypePicker,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-4 mb-2">
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[640px]:inline-flex", fromMeActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onToggleFromMe}
      >
        <MdOutlinePerson size={16} />
        <Typography text="From me" className="text-xs" />
      </Button>
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[720px]:inline-flex", includeMeActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onToggleIncludeMe}
      >
        <MdOutlinePerson size={16} />
        <Typography text="Include me" className="text-xs" />
      </Button>
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[800px]:inline-flex", inActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onOpenInPicker}
      >
        <FiHash size={16} />
        <Typography text="In" className="text-xs" />
      </Button>
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[900px]:inline-flex", hasActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onOpenHasPicker}
      >
        <BiMessageRounded size={16} />
        <Typography text="Message has" className="text-xs" />
      </Button>
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[980px]:inline-flex", isActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onOpenIsPicker}
      >
        <BiMessageRoundedDetail size={16} />
        <Typography text="Message is" className="text-xs" />
      </Button>
      <Button
        size="custom"
        className={cn("px-2 py-1 hidden min-[1060px]:inline-flex", last7DaysActive && ACTIVE_ITEM_STYLE)}
        variant="outline"
        onClick={onToggleLast7Days}
      >
        <MdOutlineCalendarMonth size={16} />
        <Typography text="Last 7 days" className="text-xs" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="custom" variant="outline"
            className="p-1 shrink-0"
          >
            <FiPlus size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <div className="py-2">
            <Button type="button" variant="submenu" onClick={onOpenFromPicker}>
              <div className="flex items-center gap-2">
                <MdOutlinePerson size={16} />
                <Typography text="From someone" />
              </div>
              <Typography text="from:" className="text-xs" />
            </Button>
            <Button type="button" variant="submenu" onClick={onOpenWithPicker}>
              <div className="flex items-center gap-2">
                <MdOutlinePerson size={16} />
                <Typography text="Includes someone" />
              </div>
              <Typography text="with:" className="text-xs" />
            </Button>
            <Button type="button" variant="submenu" onClick={onOpenInPicker}>
              <div className="flex items-center gap-2">
                <FiHash size={16} />
                <Typography text="In channel or DM" />
              </div>
              <Typography text="in:" className="text-xs" />
            </Button>
            <Button type="button" variant="submenu" onClick={onOpenHasPicker}>
              <div className="flex items-center gap-2">
                <BiMessageRounded size={16} />
                <Typography text="Message has" />
              </div>
              <Typography text="has:" className="text-xs" />
            </Button>
            <Button type="button" variant="submenu" onClick={onOpenIsPicker}>
              <div className="flex items-center gap-2">
                <BiMessageRounded size={16} />
                <Typography text="Message is" />
              </div>
              <Typography text="is:" className="text-xs" />
            </Button>
            <Button type="button" variant="submenu" onClick={onOpenTypePicker}>
              <div className="flex items-center gap-2">
                <ImFilesEmpty size={16} />
                <Typography text="File type" />
              </div>
              <Typography text="type:" className="text-xs" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
