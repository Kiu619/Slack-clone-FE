import { Button } from "@/components/ui/button"
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "../custom-dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LinkInputDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  return (
    <CustomDialog open={open} onOpenChange={setOpen} maxWidth="400px">
      <form onSubmit={(e) => e.preventDefault()}>
        <CustomDialogHeader onOpenChange={setOpen}>
          <CustomDialogTitle>Add link</CustomDialogTitle>
        </CustomDialogHeader>

        <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
          <FieldGroup className="space-y-4">
            <Field>
              <Label htmlFor="name-1" className="text-white">Text</Label>
              <Input id="name-1" name="name" className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all" />
            </Field>
            <Field>
              <Label htmlFor="username-1" className="text-white">Link</Label>
              <Input id="username-1" name="username" className="bg-transparent border-[#565856] text-white focus:border-[#1264a3] transition-all" />
            </Field>
          </FieldGroup>
        </CustomDialogBody>

        <CustomDialogFooter className="px-6 py-4">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-white hover:bg-[#2C2E33] hover:text-white mr-2">Cancel</Button>
          <Button type="submit" className="bg-[#007a5a] hover:bg-[#006248] text-white font-bold px-4 py-2">Save</Button>
        </CustomDialogFooter>
      </form>
    </CustomDialog>
  )
}
