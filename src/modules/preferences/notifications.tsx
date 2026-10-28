'use client'

import { useCallback } from 'react'
import { useAppTranslation } from '@/hooks/use-translation'
import { CustomSelect } from '@/components/custom-select'
import { Separator } from '@/components/ui/separator'
import Typography from '@/components/ui/typography'
import { useNotificationPermission } from '@/hooks/use-notification-permission'
import { useMemberPreferences, useUpdateMemberPreferences } from '@/hooks/use-member-preferences'
import { browserNotificationService } from '@/services/browser-notification-service'

const SOUNDS_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Bell', value: 'bell' },
  { label: 'Breeze', value: 'breeze' },
  { label: 'Boop', value: 'boop' },
  { label: 'Chime', value: 'chime' },
  { label: 'Click', value: 'click' },
  { label: 'Ding', value: 'ding' },
  { label: 'Pop', value: 'pop' },
  { label: 'Tap', value: 'tap' },
  { label: 'Whoosh', value: 'whoosh' },
]

function PreferencesNotifications({ workspaceId }: { workspaceId: string }) {
  const t = useAppTranslation('preferences.notificationsPanel')
  const { permission, isDenied, requestPermission } = useNotificationPermission()
  const { mutate: updatePrefs } = useUpdateMemberPreferences(workspaceId)
  const { data: prefs } = useMemberPreferences(workspaceId)

  // Derive from prefs + permission — single source of truth
  // (mirrors notifyOnThreadReply / notifyOnHuddle pattern)
  const desktopEnabled =
    permission === 'granted' && (prefs?.desktopNotificationsEnabled ?? false)

  const handleDesktopToggle = useCallback(async () => {
    if (permission === 'default') {
      const granted = await requestPermission()
      if (!granted) return
      updatePrefs({ desktopNotificationsEnabled: true })
      return
    }
    if (permission === 'granted') {
      updatePrefs({ desktopNotificationsEnabled: !desktopEnabled })
    }
    // permission === 'denied' → checkbox disabled, no-op
  }, [desktopEnabled, permission, requestPermission, updatePrefs])

  // Play preview sound when user selects a sound option
  const handleSoundSelect = useCallback((value: string) => {
    browserNotificationService.playPreviewSound(value)
  }, [])

  // Handle message sound change - update backend and play preview
  const handleMessageSoundChange = useCallback((value: string) => {
    updatePrefs({ messageSoundType: value as typeof SOUNDS_OPTIONS[number]['value'] })
    handleSoundSelect(value)
  }, [updatePrefs, handleSoundSelect])

  // Handle huddle sound change - update backend and play preview
  const handleHuddleSoundChange = useCallback((value: string) => {
    updatePrefs({ huddleSoundType: value as typeof SOUNDS_OPTIONS[number]['value'] })
    handleSoundSelect(value)
  }, [updatePrefs, handleSoundSelect])

  return (
    <div className="space-y-4">
      <section>
        <Typography
          text={t('messagingDefaults')}
          variant="p"
          className="font-bold text-lg"
        />
        <Typography
          text={t('messagingDefaultsDescription')}
          variant="p"
          className="mb-4 text-sm text-muted-foreground"
        />

        <Typography
          text={t('howToNotifyYou')}
          variant="p"
          className="font-bold"
        />
        <label className="flex cursor-pointer items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={desktopEnabled}
            onChange={handleDesktopToggle}
            disabled={isDenied}
            className="size-3 cursor-pointer accent-selection-hover disabled:opacity-50"
          />
          <div className="flex flex-col gap-1">
            <Typography
              text={t('desktopNotifications')}
              className="text-[13px] text-muted-foreground"
            />
            {isDenied && (
              <Typography
                text={t('blockedInBrowserSettings')}
                className="text-[11px] text-yellow-600"
              />
            )}
          </div>
        </label>

        <Typography
          text={t('alsoNotifyYouAbout')}
          variant="p"
          className="font-bold"
        />

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={prefs?.notifyOnThreadReply ?? true}
            onChange={(e) =>
              updatePrefs({ notifyOnThreadReply: e.target.checked })
            }
            className="size-3 cursor-pointer accent-selection-hover"
          />
          <div className="flex flex-col gap-1">
            <Typography
              text={t('threadReplies')}
              className="text-[13px] text-muted-foreground"
            />
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={prefs?.notifyOnHuddle ?? true}
            onChange={(e) =>
              updatePrefs({ notifyOnHuddle: e.target.checked })
            }
            className="size-3 cursor-pointer accent-selection-hover"
          />
          <div className="flex flex-col gap-1">
            <Typography
              text={t('newHuddles')}
              className="text-[13px] text-muted-foreground"
            />
          </div>
        </label>
      </section>

      <Separator />

      <section>
        <Typography
          text={t('sounds')}
          variant="p"
          className="font-bold mb-4"
        />

        <Typography
          text={t('notificationSoundMessages')}
          className="text-[13px] font-bold"
        />
        <CustomSelect
          options={SOUNDS_OPTIONS}
          defaultValue={prefs?.messageSoundType || 'ding'}
          onChange={handleMessageSoundChange}
        />

        <Typography
          text={t('notificationSoundHuddles')}
          className="text-[13px] font-bold"
        />
        <CustomSelect
          options={SOUNDS_OPTIONS}
          defaultValue={prefs?.huddleSoundType || 'bell'}
          onChange={handleHuddleSoundChange}
        />
      </section>
    </div>
  )
}

export default PreferencesNotifications
