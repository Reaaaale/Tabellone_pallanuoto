import { Player } from "@tabellone/shared";

export interface TeamPresetInput {
  name: string;
  logoUrl: string;
  rosterText: string;
}

export interface RosterPreset {
  id: string;
  label: string;
  home: TeamPresetInput;
  away: TeamPresetInput;
}

const STORAGE_KEY = "tabellone-presets";

export function parseRosterText(text: string): Player[] {
  const normalize = (s: string) =>
    s
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const lines = text
    .split("\n")
    .map(normalize)
    .filter(Boolean);

  return lines
    .map((line) => {
      const m = line.match(/^(\d+)\s+(.+)$/);
      if (!m) return undefined;
      const number = Number(m[1]);
      const name = m[2].trim();
      if (!Number.isFinite(number) || number <= 0) return undefined;
      if (!name) return undefined;
      return { number, name, goals: 0, ejections: 0 };
    })
    .filter((p): p is Player & { ejections: number; goals: number } => Boolean(p));
}

export function getPresets(): RosterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePresets(presets: RosterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
