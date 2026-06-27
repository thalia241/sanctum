export const DEFAULT_THEME = {
  accentColor: "#c084fc",
  backgroundColor: "#020617",
  panelColor: "#0f172a",
  textColor: "#e2e8f0",
  vibe: "dreamy",
};

export const VIBE_PRESETS = {
  dreamy: {
    label: "Dreamy",
    description: "Soft purple glow and moody midnight tones.",
    accentColor: "#c084fc",
    backgroundColor: "#020617",
    panelColor: "#0f172a",
    textColor: "#e2e8f0",
  },
  cyber: {
    label: "Cyber",
    description: "Cool cyan neon with sleek dark panels.",
    accentColor: "#22d3ee",
    backgroundColor: "#030712",
    panelColor: "#111827",
    textColor: "#e5f9ff",
  },
  goth: {
    label: "Goth",
    description: "Dark plum shades with romantic depth.",
    accentColor: "#a78bfa",
    backgroundColor: "#0b0613",
    panelColor: "#1a1026",
    textColor: "#efe7ff",
  },
  neon: {
    label: "Neon",
    description: "Electric green pop with futuristic contrast.",
    accentColor: "#39ff88",
    backgroundColor: "#050816",
    panelColor: "#10182b",
    textColor: "#eafff3",
  },
  soft: {
    label: "Soft",
    description: "Pink-toned cozy styling with gentle contrast.",
    accentColor: "#f472b6",
    backgroundColor: "#111827",
    panelColor: "#1f2937",
    textColor: "#fdf2f8",
  },
  classic: {
    label: "Classic",
    description: "Crisp blue platform-style default look.",
    accentColor: "#60a5fa",
    backgroundColor: "#020617",
    panelColor: "#0f172a",
    textColor: "#e2e8f0",
  },
  sunset: {
    label: "Sunset",
    description: "Warm coral and dusky evening tones.",
    accentColor: "#fb7185",
    backgroundColor: "#1f172a",
    panelColor: "#31203f",
    textColor: "#fff1f2",
  },
  forest: {
    label: "Forest",
    description: "Emerald greens with calm natural depth.",
    accentColor: "#34d399",
    backgroundColor: "#06130f",
    panelColor: "#0f1f1a",
    textColor: "#ecfdf5",
  },
};

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim();
  return /^#([0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

export function resolveTheme(theme = {}) {
  const vibe = String(theme?.vibe || DEFAULT_THEME.vibe);
  const preset = VIBE_PRESETS[vibe] || VIBE_PRESETS[DEFAULT_THEME.vibe];

  return {
    vibe,
    accentColor: normalizeHex(theme?.accentColor, preset.accentColor),
    backgroundColor: normalizeHex(theme?.backgroundColor, preset.backgroundColor),
    panelColor: normalizeHex(theme?.panelColor, preset.panelColor),
    textColor: normalizeHex(theme?.textColor, preset.textColor),
  };
}

export function getPresetTheme(vibe) {
  const preset = VIBE_PRESETS[vibe] || VIBE_PRESETS[DEFAULT_THEME.vibe];
  return {
    vibe,
    accentColor: preset.accentColor,
    backgroundColor: preset.backgroundColor,
    panelColor: preset.panelColor,
    textColor: preset.textColor,
  };
}

export function applyThemeToDocument(theme = {}) {
  if (typeof document === "undefined") return;

  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  root.style.setProperty("--sanctum-accent", resolved.accentColor);
  root.style.setProperty("--sanctum-bg", resolved.backgroundColor);
  root.style.setProperty("--sanctum-panel", resolved.panelColor);
  root.style.setProperty("--sanctum-text", resolved.textColor);

  document.body.style.backgroundColor = resolved.backgroundColor;
  document.body.style.color = resolved.textColor;
}

export function accentButtonStyle(theme = {}) {
  const resolved = resolveTheme(theme);

  return {
    backgroundColor: resolved.accentColor,
    color: "#0f172a",
  };
} 