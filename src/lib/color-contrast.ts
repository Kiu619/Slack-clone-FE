const DARK_TEXT = "#1d1c1d";
const LIGHT_TEXT = "#ffffff";

function normalizeHexColor(color: string): string | null {
  const value = color.trim().replace("#", "");
  if (value.length === 3 && /^[0-9a-f]{3}$/i.test(value)) {
    return value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (value.length === 6 && /^[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  return null;
}

function channelToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminanceFromHex(hexColor: string): number {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return 0;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  const linearRed = channelToLinear(red);
  const linearGreen = channelToLinear(green);
  const linearBlue = channelToLinear(blue);

  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastTextColor(backgroundHex: string): string {
  const bgLuminance = luminanceFromHex(backgroundHex);
  const whiteContrast = getContrastRatio(bgLuminance, 1);
  const darkContrast = getContrastRatio(bgLuminance, luminanceFromHex(DARK_TEXT));
  return darkContrast >= whiteContrast ? DARK_TEXT : LIGHT_TEXT;
}
