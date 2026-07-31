'use client'


import { LocalImageUpload } from '@/components/cloudinary-upload'
import { Button } from "@/components/ui/button"
import Typography from "@/components/ui/typography"
import { toast } from 'sonner'

import { useCreateWorkspaceValues } from '@/stores/useCreateWorkspaceStore'
import { useState } from "react"

const Step2 = () => {
  const { setCurrStep, imageUrl, updateImageUrl, imageFile, updateImageFile, name } =
    useCreateWorkspaceValues()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNext = () => {
    if (name.trim()) {
      setCurrStep(3)
    }
  }

  const handleContinue = async () => {
    // If no image file selected, just proceed to next step
    if (!imageFile) {
      handleNext()
      return
    }

    // If image file exists but not uploaded yet, upload it
    if (imageFile && !imageUrl) {
      setIsSubmitting(true)
      try {
        const { uploadToCloudinary } = await import('@/lib/cloudinary')
        const uploadedImageUrl = await uploadToCloudinary(imageFile)
        updateImageUrl(uploadedImageUrl)
        handleNext()
      } catch (error) {
        console.error('Upload failed:', error)
        toast.error('Cannot upload image. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Image already uploaded, proceed
      handleNext()
    }
  }

  return (
    <>
      <Typography text="Step 2 of 4" variant="p" className="text-[#616061] dark:text-[#d1d2d3]" />
      <Typography text="Add workspace avatar" variant="h1" className="font-bold text-[#1d1c1d] dark:text-white" />
      <Typography
        text='This image can be changed later in your workspace settings.'
        className='text-[#454245] text-sm dark:text-white/80'
        variant='p'
      />

      <div className='mt-6 flex flex-col space-y-6'>
        <LocalImageUpload
          value={imageFile || imageUrl}
          onChange={updateImageFile}
          disabled={isSubmitting}
        />

        <div className='flex space-x-4 items-center'>
          <Button
            type='button'
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-30 bg-[#3b1141] text-white hover:bg-[#3b1141]/90"
          >
            <Typography
              text={isSubmitting ? 'Uploading...' : 'Next'}
              variant='p'
              className='text-white'
            />
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={() => {
              updateImageFile(null)
              updateImageUrl('')
              handleNext()
            }}
            className="bg-transparent border-none p-0 h-auto cursor-pointer font-normal text-[#616061] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:text-white"
          >
            Skip for now
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={() => {
              setCurrStep(1)
              updateImageFile(null)
              updateImageUrl('')
            }}
            className="bg-transparent border-none p-0 h-auto cursor-pointer font-normal text-[#616061] hover:text-[#1d1c1d] dark:text-[#d1d2d3] dark:hover:text-white"
          >
            Go back
          </Button>
        </div>
      </div>
    </>
  )
}

export default Step2
