'use client'

import { useAppTranslation } from '@/hooks/use-translation'

export default function ActivityPage() {
  const t = useAppTranslation('activity')
  return (
    <div className='flex h-full items-center justify-center font-semibold text-sm'>{t('selectNotification')}</div>
  )
}
