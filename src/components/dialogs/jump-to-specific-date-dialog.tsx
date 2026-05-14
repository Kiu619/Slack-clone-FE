import { useState } from 'react'
import { CustomDialog, CustomDialogBody, CustomDialogHeader, CustomDialogTitle } from '../custom-dialog'
import { Calendar } from '../ui/calendar'
import { Button } from '../ui/button'
import { startOfDay } from 'date-fns'


export default function JumpToSpecificDateDialog({
  open,
  onOpenChange,
  onJump,
  targetCreatedAt
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onJump: (date: Date) => void,
  targetCreatedAt?: string
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onJump(date);
      onOpenChange(false);
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={() => onOpenChange(false)}>
        <CustomDialogTitle>Jump to a specific date</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="p-0 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={[
            { after: new Date() },
            targetCreatedAt ? { before: startOfDay(new Date(targetCreatedAt)) } : undefined
          ].filter(Boolean) as any}
          autoFocus
          className="rounded-md border-none"
        />
      </CustomDialogBody>
    </CustomDialog>
  )
}
