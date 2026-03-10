'use client'

import { Button } from './ui/button'
import Typography from './ui/typography'
import { ImageIcon, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'

interface LocalImageUploadProps {
  value: File | null | string
  onChange: (file: File | null) => void
  disabled?: boolean
}

export const LocalImageUpload = ({
  value,
  onChange,
  disabled
}: LocalImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Effect to restore preview when component mounts with existing file
  useEffect(() => {
    if (value && value instanceof File && !preview) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(value)
    } else if (typeof value === 'string' && value && !preview) {
      // If value is a URL string, use it as preview
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(value)
    } else if (!value) {
      // Clear preview if no value
      setPreview(null)
    }
  }, [value, preview])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image (PNG, JPG, JPEG, GIF, WEBP)')
        return
      }

      // Validate file size (10MB)
      if (file.size > 10000000) {
        toast.error('File size must be less than 10MB')
        return
      }

      onChange(file)

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-4 w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex items-center">
        {(() => {
          const imageSource = preview || (typeof value === 'string' && value.trim() ? value : null)
          return imageSource ? (
            <div className="relative">
              <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                <Image
                  fill
                  alt="Preview"
                  src={imageSource}
                  className="object-cover"
                />
              </div>
              <Button
                onClick={handleRemove}
                disabled={disabled}
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={disabled}
              variant="secondary"
              onClick={handleClick}
              className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              <div className="flex flex-col items-center space-y-2">
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <Typography
                  text="Upload Image"
                  variant="p"
                  className="text-sm text-gray-500"
                />
              </div>
            </Button>
          )
        })()}
      </div>
    </div>
  )
}
