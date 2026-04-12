"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

type ChannelFolderActionsValue = {
  /** Chuyển tab Folders và mở dialog tạo folder */
  requestNewFolder?: () => void;
};

const ChannelFolderActionsContext =
  createContext<ChannelFolderActionsValue>({});

export function ChannelFolderActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ChannelFolderActionsValue;
}) {
  return (
    <ChannelFolderActionsContext.Provider value={value}>
      {children}
    </ChannelFolderActionsContext.Provider>
  );
}

export function useChannelFolderActions() {
  return useContext(ChannelFolderActionsContext);
}
