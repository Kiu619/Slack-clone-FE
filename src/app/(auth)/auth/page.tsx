'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FcGoogle } from 'react-icons/fc'
import { RxGithubLogo } from 'react-icons/rx'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { MdOutlineAutoAwesome } from 'react-icons/md'

import Image from 'next/image'
import { toast } from 'sonner'
import Typography from '@/components/ui/typography'
import { api, ApiError, API_URL } from '@/lib/api'

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type FormValues = z.infer<typeof formSchema>

const AuthPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' }
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      await api.post('/auth/magic-link/send', { email: values.email })
      toast.success('Check your email for a magic link!')
      form.reset()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleSignIn() {
    window.location.href = `${API_URL}/auth/google`
  }

  function handleGithubSignIn() {
    window.location.href = `${API_URL}/auth/github`
  }

  return (
    <div className='min-h-screen p-5 grid text-center place-content-center bg-white'>
      <div className='max-w-[450px]'>
        <div className='flex justify-center items-center gap-3 mb-4'>
          <Image
            src='https://a.slack-edge.com/bv1-13/slack_logo-ebd02d1.svg'
            alt='Slack'
            width={120}
            height={120}
          />
        </div>

        <Typography text='Sign in to your Slack' variant='h2' className='mb-3' />

        <Typography
          text='We suggest using the email address that you use at work'
          variant='p'
          className='opacity-90 mb-7'
        />

        <div className='flex flex-col space-y-4'>
          <Button
            variant='outline'
            className='py-6 border-2 flex space-x-3'
            onClick={handleGoogleSignIn}
            type='button'
          >
            <FcGoogle size={30} />
            <Typography className='text-xl' text='Sign in with Google' variant='p' />
          </Button>

          <Button
            variant='outline'
            className='py-6 border-2 flex space-x-3'
            onClick={handleGithubSignIn}
            type='button'
          >
            <RxGithubLogo size={30} />
            <Typography className='text-xl' text='Sign in with Github' variant='p' />
          </Button>
        </div>

        <div>
          <div className='flex items-center my-6'>
            <div className='mr-[10px] flex-1 border-t bg-neutral-300' />
            <Typography text='OR' variant='p' />
            <div className='ml-[10px] flex-1 border-t bg-neutral-300' />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <fieldset disabled={isSubmitting}>
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder='name@work-email.com' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  variant='secondary'
                  className='bg-[#3b1141] hover:bg-[#3b1141]/90 w-full my-5 text-white'
                  type='submit'
                  disabled={isSubmitting}
                >
                  <Typography
                    text={isSubmitting ? 'Sending...' : 'Sign in with Email'}
                    variant='p'
                  />
                </Button>

                <div className='px-5 py-4 bg-gray-100 rounded-sm'>
                  <div className='text-gray-500 flex items-center space-x-3'>
                    <MdOutlineAutoAwesome />
                    <Typography
                      text='We will email you a magic link for a password-free sign-in'
                      variant='p'
                    />
                  </div>
                </div>
              </fieldset>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
