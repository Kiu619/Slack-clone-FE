import type { Notification as AppNotification } from '@/lib/types'

type ReminderClickPayload = {
  kind: 'later-due'
  savedItemId?: string
  workspaceId?: string
}

type NotificationOptions = {
  body?: string
  icon?: string
  tag?: string
  data?:
    | { notification: AppNotification }
    | ReminderClickPayload
}

/**
 * Payload delivered when the user clicks a browser notification. The click
 * handler in workspace-shell reads this to route appropriately (channel /
 * DM / thread / later panel).
 */
export type NotificationClickPayload =
  | { kind: 'activity'; notification: AppNotification }
  | ReminderClickPayload

/**
 * Singleton service to manage browser notifications.
 * Handles permission checking, enabling/disabling, and notification click events.
 */
class BrowserNotificationService {
  private enabled = false
  private permission: NotificationPermission = 'default'
  private onNotificationClick: ((payload: NotificationClickPayload) => void) | null = null

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  updatePermission(permission: NotificationPermission) {
    this.permission = permission
  }

  setOnNotificationClick(handler: (payload: NotificationClickPayload) => void) {
    this.onNotificationClick = handler
  }

  canShow(): boolean {
    return this.enabled && this.permission === 'granted'
  }

  /**
   * Play a notification sound (used by event-driven flows like huddle:start).
   * Independent of `canShow()` — caller decides whether sound is allowed.
   */
  playSound(soundType: string) {
    if (soundType === 'none' || !soundType) return

    try {
      const audio = new Audio(`/sounds/${soundType}.wav`)
      audio.volume = 0.5
      audio.play().catch(() => {
        // Silently fail if audio play is blocked
      })
    } catch {
      // Silently fail
    }
  }

  /**
   * Play a preview sound (for settings UI).
   * Returns true if played successfully, false otherwise.
   */
  playPreviewSound(soundType: string): boolean {
    if (soundType === 'none' || !soundType) return false

    try {
      const audio = new Audio(`/sounds/${soundType}.wav`)
      audio.volume = 0.5
      audio.play().catch(() => {
        // Silently fail if audio play is blocked
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Show a browser notification.
   * Returns the native Notification instance if shown, null otherwise.
   */
  show(
    title: string,
    options?: NotificationOptions,
    soundType?: string | null,
  ): globalThis.Notification | null {
    if (!this.canShow()) return null

    // Play sound if configured (before showing notification)
    if (soundType && soundType !== 'none') {
      this.playSound(soundType)
    }

    try {
      const notification = new globalThis.Notification(title, {
        icon: options?.icon || '/favicon.ico',
        body: options?.body,
        tag: options?.tag,
        data: options?.data,
      })

      notification.onclick = () => {
        window.focus()
        // Forward to the click handler regardless of payload kind — the
        // workspace-shell click handler discriminates between activity and
        // reminder payloads itself.
        if (options?.data) {
          this.onNotificationClick?.(
            options.data as NotificationClickPayload,
          )
        }
        notification.close()
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)

      return notification
    } catch (error) {
      console.error('[BrowserNotification] Failed to show notification:', error)
      return null
    }
  }
}

export const browserNotificationService = new BrowserNotificationService()
