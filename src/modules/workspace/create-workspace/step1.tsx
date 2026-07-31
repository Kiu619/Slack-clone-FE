'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Typography from "@/components/ui/typography"
import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormMessage, Form, FormControl, FormItem, FormField } from "@/components/ui/form"
import { useEffect } from "react"

// Schema validation
const workspaceNameSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: 'Workspace name is required' })
    .min(3, { message: 'Workspace name must be at least 3 characters' })
    .max(50, { message: 'Workspace name must be at most 50 characters' })
    .regex(/^[a-zA-Z0-9\s_\-\p{L}]+$/u, {
      message: 'Workspace name must only contain letters, numbers, spaces, hyphens and underscores'
    })
})

type WorkspaceNameForm = z.infer<typeof workspaceNameSchema>

const Step1 = () => {
  const { name, updateValues, setCurrStep } = useCreateWorkspaceValues()

  const form = useForm<WorkspaceNameForm>({
    resolver: zodResolver(workspaceNameSchema),
    defaultValues: {
      workspaceName: name || ""
    },
    mode: "onChange" // Validate on change for better UX
  })

  // Sync form with Zustand state when component mounts
  useEffect(() => {
    if (name) {
      form.setValue('workspaceName', name)
    }
  }, [name, form])

  const handleNext = (values: WorkspaceNameForm) => {
    const trimmedName = values.workspaceName.trim()
    updateValues({ name: trimmedName })
    setCurrStep(2)
  }

  const handleInputChange = (value: string) => {
    updateValues({ name: value })
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const isFormValid = form.formState.isValid && form.watch('workspaceName')?.trim().length > 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Typography
          text="Step 1 of 4"
          variant="p"
          className="text-[#616061] dark:text-[#d1d2d3]"
        />

        <Typography
          text="What do you want to call your Slack workspace?"
          variant="h1"
          className="font-bold text-[#1d1c1d] dark:text-white"
        />

        <Typography
          text="Choose a name that your team will recognize, like your company name or team name."
          variant="p"
          className="text-sm leading-relaxed text-[#454245] dark:text-white/80"
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleNext)} className="space-y-4">
          <FormField
            control={form.control}
            name="workspaceName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your company or team name"
                    className="border border-[#cfcbd1] bg-white text-[#1d1c1d] placeholder:text-[#8c8c8f] focus:border-[#1264a3] focus:ring-[#1264a3]/20 dark:border-[#35373B] dark:bg-[#1A1D21] dark:text-white dark:placeholder:text-[#797c81]"
                    onChange={(e) => {
                      field.onChange(e)
                      handleInputChange(e.target.value)
                    }}
                    autoComplete="organization"
                    maxLength={50}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <Button
            className="w-full min-w-[120px] bg-[#3b1141] text-white transition-colors hover:bg-[#3b1141]/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            type="submit"
            disabled={!isFormValid}
          >
            Next
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default Step1
