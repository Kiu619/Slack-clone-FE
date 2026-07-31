'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Typography from "@/components/ui/typography"
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "@/components/custom-dialog"
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid'
import { useEffect, useMemo, useState } from "react"

const Step3 = () => {
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const { name, emails, currentEmail, addEmail, removeEmail, setCurrentEmail, setCurrStep, updateInviteCode } = useCreateWorkspaceValues()

  const invite_code = useMemo(() => uuidv4(), [])
  useEffect(() => {
    updateInviteCode(invite_code)
  }, [invite_code, updateInviteCode])

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleAddEmail = () => {
    if (currentEmail.trim() && isValidEmail(currentEmail.trim()) && !emails.includes(currentEmail.trim())) {
      addEmail(currentEmail.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    removeEmail(emailToRemove)
  }

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(invite_code)
    toast.success('Invite code copied to clipboard')
  }

  return (
    <div className="space-y-4">
      <Typography text="Step 3 of 4" variant="p" className="text-[#616061] dark:text-[#d1d2d3]" />

      <Typography text={`Who else is on the ${name} team?`} variant="h1" className="font-bold text-[#1d1c1d] dark:text-white" />

      <div className="flex items-center justify-between">
        <Typography text="Add coworker by email" variant="p" className="text-sm text-[#454245] dark:text-white/80" />
        <Button
          variant="link"
          className="h-auto p-0 text-sm font-normal text-[#1264a3] hover:text-[#0b4f82] dark:text-[#58BDE6] dark:hover:text-[#8fdcf5]"
        >
          Add from Google Contacts
        </Button>
      </div>

      <div className="relative">
        <div className="min-h-[120px] rounded-md border border-[#cfcbd1] bg-white p-3 focus-within:border-[#1264a3] dark:border-[#35373B] dark:bg-[#1A1D21] dark:focus-within:border-[#58BDE6]">
          <div className="mb-2 flex flex-wrap gap-2">
            {emails.map((email, index) => (
              <EmailTag key={index} email={email} onRemove={handleRemoveEmail} />
            ))}
          </div>

          <Input
            placeholder={emails.length === 0 ? "Ex: nghia@gmail.com kiuu@gmail.com" : ""}
            className="border-none bg-transparent p-0 text-[#1d1c1d] placeholder:text-[#8c8c8f] focus-visible:ring-0 dark:text-white dark:placeholder:text-[#797c81]"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>

        {currentEmail.trim() && isValidEmail(currentEmail.trim()) && !emails.includes(currentEmail.trim()) && (
          <div className="mt-2">
            <Button
              onClick={handleAddEmail}
              className="flex items-center gap-2 bg-[#1264a3] text-white hover:bg-[#0b4f82] dark:bg-[#1264a3] dark:hover:bg-[#0b4f82]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Invite {currentEmail}
            </Button>
          </div>
        )}
      </div>

      <Typography
        text="Keep in mind that invitations expire in 30 days. You can always extend that deadline."
        variant="p"
        className="text-xs text-[#616061] dark:text-[#d1d2d3]"
      />

      <div className="flex gap-3">
        <Button
          disabled={emails.length === 0}
          className="w-30 bg-[#3b1141] font-bold text-white hover:bg-[#3b1141]/90"
          onClick={() => setCurrStep(4)}
        >
          Next
        </Button>

        <Button
          variant="link"
          className="h-auto p-0 font-normal text-[#1264a3] hover:text-[#0b4f82] dark:text-[#58BDE6] dark:hover:text-[#8fdcf5]"
          onClick={handleCopyInviteCode}
        >
          Copy Invite Link
        </Button>

        <span
          onClick={() => setSkipDialogOpen(true)}
          className="h-auto cursor-pointer p-0 font-normal text-[#616061] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:text-white"
        >
          Skip without inviting
        </span>

        <CustomDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
          <SkipDialog setOpen={setSkipDialogOpen} />
        </CustomDialog>

        <Button
          onClick={() => setCurrStep(2)}
          className="h-auto cursor-pointer border-none bg-transparent p-0 font-normal text-[#616061] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:text-white"
        >
          Go back
        </Button>
      </div>
    </div>
  )
}

const EmailTag = ({ email, onRemove }: { email: string; onRemove: (_email: string) => void }) => {
  return (
    <div className="inline-flex items-center gap-1 rounded bg-[#1264a3] px-2 py-1 text-sm text-white">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
      <span>{email}</span>
      <button
        onClick={() => onRemove(email)}
        className="ml-1 rounded p-0.5 hover:bg-[#0b4f82]"
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

const SkipDialog = ({ setOpen }: { setOpen: (open: boolean) => void }) => {
  const { emails, setCurrStep } = useCreateWorkspaceValues()

  const handleSkip = () => {
    setCurrStep(4)
    setOpen(false)
  }

  return (
    <>
      <CustomDialogHeader onOpenChange={setOpen} className="border-b border-[#e7e3e8] dark:border-[#2C2E33]">
        <CustomDialogTitle className="text-[#1d1c1d] dark:text-white">Skip without inviting?</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="bg-white p-6 dark:bg-[#1A1D21]">
        <p className="text-sm leading-relaxed text-[#454245] dark:text-[#d1d2d3]">
          {emails.length === 0
            ? "To really get a feel for Slack - and to see all the ways it can simplify your team's work - you'll need a few coworkers here."
            : `Are you sure you want to skip without inviting ${emails.join(', ')}?`}
        </p>
      </CustomDialogBody>
      <CustomDialogFooter className="border-t border-[#e7e3e8] bg-white px-6 py-4 dark:border-[#2C2E33] dark:bg-[#1A1D21]">
        <Button
          variant="ghost"
          onClick={() => setOpen(false)}
          className="mr-2 text-[#616061] hover:bg-[#f4f4f5] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:bg-[#2C2E33] dark:hover:text-white"
        >
          Cancel
        </Button>
        <Button onClick={handleSkip} className="bg-red-600 font-bold text-white hover:bg-red-700">
          Skip
        </Button>
      </CustomDialogFooter>
    </>
  )
}

export default Step3
