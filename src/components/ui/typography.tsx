import { cn } from '@/lib/utils'
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-bold tracking-tight',
      h5: 'scroll-m-20 text-lg font-semibold tracking-tight',
      h6: 'scroll-m-20 text-base font-semibold tracking-tight',
      p: 'text-[15px] font-[500]',
      blockquote: 'mt-6 border-l-2 pl-6 italic',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground'
    }
  },
  defaultVariants: {
    variant: 'p'
  }
})

export interface TypographyProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof typographyVariants> {
  text?: string
  children?: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'span' | 'div'
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, text, children, as, ...props }, ref) => {
    const Component = (as || variant || 'p') as React.ElementType

    return (
      <Component
        className={cn(typographyVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        {text || children}
      </Component>
    )
  }
)

Typography.displayName = 'Typography'

export default Typography
