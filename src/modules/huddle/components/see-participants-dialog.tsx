import { CustomDialog, CustomDialogBody, CustomDialogHeader, CustomDialogTitle } from '@/components/custom-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspaceMemberStore } from '@/stores/useWorkspaceMemberStore';
import { useProfilePanelStore } from '@/stores/useProfilePanelStore';
import { useShallow } from 'zustand/react/shallow';
import type { HuddleParticipantSnapshot } from '@/lib/huddle';

export default function SeeParticipantsDialog({
  open,
  onOpenChange,
  title,
  participants,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  participants: HuddleParticipantSnapshot[];
  workspaceId: string;
}) {
  const { open: openProfilePanel } = useProfilePanelStore();

  // Get realtime overlays from store for participant data sync
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] || {})
  );

  const handleParticipantClick = (p: HuddleParticipantSnapshot) => {
    // Merge snapshot with overlay to get user data for profile panel
    const overlay = memberOverlayMap[p.userId];
    const userData = {
      id: p.userId,
      email: p.email || '',
      displayName: overlay?.displayName || p.displayName || p.name || 'Unknown',
      name: overlay?.name || p.name || undefined,
      avatar: overlay?.avatar || p.avatar || undefined,
    };

    onOpenChange(false);
    openProfilePanel({ userData, workspaceId });
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{title}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
          {participants.map((p) => {
            // Merge snapshot with realtime overlay from store
            const overlay = memberOverlayMap[p.userId];
            const displayName =
              overlay?.displayName?.trim() ||
              overlay?.name?.trim() ||
              p.displayName?.trim() ||
              p.name?.trim() ||
              'Unknown';
            const avatar = overlay?.avatar || p.avatar;

            return (
              <div
                key={p.id}
                onClick={() => handleParticipantClick(p)}
                className="flex items-center gap-3 p-2 rounded hover:bg-[#2a2d31] cursor-pointer"
              >
                <Avatar className="size-8">
                  <AvatarImage src={avatar || ''} />
                  <AvatarFallback className="rounded-lg bg-sky-500 text-xs">
                    {displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{displayName}</span>
              </div>
            );
          })}
        </div>
      </CustomDialogBody>
    </CustomDialog>
  );
}
