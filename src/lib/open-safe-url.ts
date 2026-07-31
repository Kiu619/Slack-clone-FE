export function openSafeUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof window === "undefined") return false;

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const opened = window.open(
      parsed.toString(),
      "_blank",
      "noopener,noreferrer",
    );

    if (opened) {
      opened.opener = null;
    }

    return true;
  } catch {
    return false;
  }
}
