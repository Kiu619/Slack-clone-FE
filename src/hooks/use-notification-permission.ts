'use client'

import { useState, useEffect, useCallback } from 'react'

export type PermissionState = 'default' | 'granted' | 'denied'

export interface UseNotificationPermissionReturn {
  permission: PermissionState
  isGranted: boolean
  isDenied: boolean
  requestPermission: () => Promise<boolean>
  showNotification: (title: string, options?: NotificationOptions) => globalThis.Notification | null
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<PermissionState>('default')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('denied')
      return
    }
    setPermission(globalThis.Notification.permission as PermissionState)
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    try {
      const result = await globalThis.Notification.requestPermission()
      const granted = result === 'granted'
      setPermission(result as PermissionState)
      return granted
    } catch {
      return false
    }
  }, [])

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions): globalThis.Notification | null => {
      if (permission === 'granted') {
        return new globalThis.Notification(title, options)
      }
      return null
    },
    [permission],
  )

  return {
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    showNotification,
  }
}
