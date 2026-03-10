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
          className="text-gray-500"
        />

        <Typography
          text="What do you want to call your Slack workspace?"
          variant="h1"
          className="text-white font-bold"
        />

        <Typography
          text="Choose a name that your team will recognize, like your company name or team name."
          variant="p"
          className="text-white/80 text-sm leading-relaxed"
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
                    className="text-white bg-inherit border-white/20 placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
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
            className="bg-workspace-background hover:bg-workspace-background/90 w-full sm:w-auto min-w-[120px] font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
