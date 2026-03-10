'use client'


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Typography from "@/components/ui/typography"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid'
import { useEffect } from "react"


const Step3 = () => {
  const { name, emails, currentEmail, addEmail, removeEmail, setCurrentEmail, setCurrStep, updateInviteCode } = useCreateWorkspaceValues()
  
  const invite_code = uuidv4()
  useEffect(() => {
    updateInviteCode(invite_code)
  }, [])

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
      <Typography text="Step 3 of 4" variant="p" className="text-gray-700" />

      <Typography text={`Who else is on the ${name} team?`} variant="h1" className="text-white font-bold" />

      <div className="flex justify-between items-center">
        <Typography text="Add coworker by email" variant="p" className="text-white text-sm" />
        <Button
          variant="link"
          className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal text-sm"
        >
          Add from Google Contacts
        </Button>
      </div>

      {/* Email Input Area */}
      <div className="relative">
        <div className="min-h-[120px] border border-gray-600 rounded-md bg-[#1A1D21] p-3 focus-within:border-blue-400">
          {/* Display added emails as tags */}
          <div className="flex flex-wrap gap-2 mb-2">
            {emails.map((email, index) => (
              <EmailTag key={index} email={email} onRemove={handleRemoveEmail} />
            ))}
          </div>

          {/* Input for new email */}
          <Input
            placeholder={emails.length === 0 ? "Ex: nghia@gmail.com kiuu@gmail.com" : ""}
            className="border-none bg-transparent text-white placeholder:text-gray-400 p-0 focus-visible:ring-0"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>

        {/* Show invite button when typing valid email */}
        {currentEmail.trim() && isValidEmail(currentEmail.trim()) && !emails.includes(currentEmail.trim()) && (
          <div className="mt-2">
            <Button
              onClick={handleAddEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
        className="text-gray-400 text-xs"
      />

      <div className="flex gap-3">
        <Button
          disabled={emails.length === 0}
          className="bg-workspace-background hover:bg-workspace-background text-white font-bold w-30"
          onClick={() => setCurrStep(4)}
        >
          Next
        </Button>

        <Button
          variant="link"
          className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
          onClick={handleCopyInviteCode}
        >
          Copy Invite Link
        </Button>

        <Dialog>
          <DialogTrigger>
            <span
              className="text-gray-400 hover:text-gray-300 p-0 h-auto font-normal cursor-pointer"
            >
              Skip without inviting
            </span>
          </DialogTrigger>

          <DialogContent className="bg-[#1A1D21]">
            <SkipDialog />
          </DialogContent>
        </Dialog>

        <Button
          onClick={() => setCurrStep(2)}
          className="text-gray-400 hover:text-gray-300 p-0 h-auto font-normal cursor-pointer bg-transparent border-none"
        >
          Go back
        </Button>
      </div>
    </div>
  )
}

// Email Tag Component
const EmailTag = ({ email, onRemove }: { email: string; onRemove: (_email: string) => void }) => {
  return (
    <div className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-sm">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
      <span>{email}</span>
      <button
        onClick={() => onRemove(email)}
        className="ml-1 hover:bg-blue-700 rounded p-0.5"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

const SkipDialog = () => {
  const { emails, setCurrStep } = useCreateWorkspaceValues()

  const handleSkip = () => {
    setCurrStep(4)
  }
  return (
    <>
      <DialogHeader className="text-white">
        <DialogTitle className="text-white">Skip without inviting?</DialogTitle>
        <DialogDescription className="text-white">
          {emails.length === 0 ? "To really get a feel for Slack — and to see all the ways it can simplify your team's work — you'll need a few coworkers here." : `Are you sure you want to skip without inviting ${emails.join(', ')}?`}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild >
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleSkip} className="bg-red-600 hover:bg-red-700 text-white font-bold w-30">Save changes</Button>
      </DialogFooter>
    </>
  )
}

export default Step3
