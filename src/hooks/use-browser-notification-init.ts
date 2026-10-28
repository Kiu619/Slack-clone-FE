'use client'

import { useEffect } from 'react'
import { browserNotificationService } from '@/services/browser-notification-service'
import { useNotificationPermission } from './use-notification-permission'
import { useMemberPreferences } from './use-member-preferences'

/**
 * Hook to initialize browser notification service with user preferences.
 * Must be called within a workspace context (workspaceId is required).
 */
export function useBrowserNotificationInit(workspaceId: string | undefined) {
  const { permission } = useNotificationPermission()
  const { data: prefs } = useMemberPreferences(workspaceId)

  useEffect(() => {
    // Update permission state
    browserNotificationService.updatePermission(permission)

    // Enable only if:
    // 1. User granted browser notification permission
    // 2. User enabled desktop notifications in workspace preferences
    const shouldEnable =
      permission === 'granted' &&
      (prefs?.desktopNotificationsEnabled ?? false)

    browserNotificationService.setEnabled(shouldEnable)
  }, [permission, prefs?.desktopNotificationsEnabled])
}
