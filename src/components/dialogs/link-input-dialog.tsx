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
import { type FormEvent, useState } from "react"

type LinkInputDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  initialText?: string
  initialUrl?: string
  onSave: (value: { text: string; url: string }) => void
  onRemove?: () => void
}

export function LinkInputDialog({
  open,
  setOpen,
  initialText = "",
  initialUrl = "",
  onSave,
  onRemove,
}: LinkInputDialogProps) {
  const [text, setText] = useState(initialText)
  const [url, setUrl] = useState(initialUrl)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!url.trim()) return
    onSave({
      text: text.trim(),
      url: url.trim(),
    })
    setOpen(false)
  }

  return (
    <CustomDialog open={open} onOpenChange={setOpen} maxWidth="400px">
      <form onSubmit={handleSubmit}>
        <CustomDialogHeader onOpenChange={setOpen}>
          <CustomDialogTitle>Add link</CustomDialogTitle>
        </CustomDialogHeader>

        <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6">
          <FieldGroup className="space-y-4">
            <Field>
              <Label htmlFor="name-1" className="">Text</Label>
              <Input
                id="name-1"
                name="name"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
              />
            </Field>
            <Field>
              <Label htmlFor="username-1" className="">Link</Label>
              <Input
                id="username-1"
                name="username"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-transparent border-[#565856] focus:border-selection-hover transition-all"
              />
            </Field>
          </FieldGroup>
        </CustomDialogBody>

        <CustomDialogFooter className="px-6 py-4 justify-between">
          <div>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onRemove()
                  setOpen(false)
                }}
                className="dark:hover:bg-[#2C2E33]"
              >
                Remove link
              </Button>
            ) : null}
          </div>
          <div>
          <Button variant="outline" onClick={() => setOpen(false)} className="dark:hover:bg-[#2C2E33] mr-2">Cancel</Button>
          <Button
            type="submit"
            disabled={!url.trim()}
            variant="success"
          >
            Save
          </Button>
          </div>
        </CustomDialogFooter>
      </form>
    </CustomDialog>
  )
}
