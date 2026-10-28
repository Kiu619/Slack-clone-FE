"use client";

import { create } from "zustand";

interface FolderDialogState {
  /** Target ID (channel ID hoặc conversation ID) */
  targetId: string | null;
  /** Attachment ID để tự động thêm vào folder mới (optional) */
  attachmentId: string | null;
  /** True nếu đang mở dialog cho DM, false cho channel */
  isDM: boolean;
  /** Dialog có đang mở không */
  isOpen: boolean;
  /** Mở dialog */
  open: (targetId: string, isDM: boolean, attachmentId?: string) => void;
  /** Đóng dialog */
  close: () => void;
}

export const useFolderDialogStore = create<FolderDialogState>((set) => ({
  targetId: null,
  attachmentId: null,
  isDM: false,
  isOpen: false,

  open: (targetId, isDM, attachmentId) =>
    set({
      targetId,
      attachmentId: attachmentId ?? null,
      isDM,
      isOpen: true,
    }),

  close: () =>
    set({
      isOpen: false,
      attachmentId: null,
    }),
}));
