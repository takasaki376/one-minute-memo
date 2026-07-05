import { builtinThemes } from "@/lib/data/builtinThemes";

export function getBuiltinDefaultIsActive(themeId: string): boolean | null {
  const match = /^theme-(\d+)$/.exec(themeId);
  if (!match) {
    return null;
  }

  const index = Number.parseInt(match[1], 10) - 1;
  if (index < 0 || index >= builtinThemes.length) {
    return null;
  }

  return builtinThemes[index].isActive;
}

export function isBuiltinThemeId(themeId: string): boolean {
  return getBuiltinDefaultIsActive(themeId) !== null;
}
