import { useMainPanelStore } from "@/stores/useMainPanelStore";

type RouterNav = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/**
 * Đưa URL về /workspace/:workspaceId/dms rồi set main panel DM.
 * Dùng setTimeout(0) để chạy sau effect pathname → reset trong workspace-shell.
 */
export const openDmInWorkspace = (
  router: RouterNav,
  pathname: string,
  workspaceId: string,
  conversationId: string,
) => {
  const dmsBase = `/workspace/${workspaceId}/dms`;
  if (pathname.startsWith(`${dmsBase}/`)) {
    router.replace(dmsBase);
  } else if (pathname !== dmsBase) {
    router.push(dmsBase);
  }
  setTimeout(() => {
    useMainPanelStore.getState().setView({ type: "dm", conversationId });
  }, 0);
};
