import { describe, expect, it } from "vitest";
import css from "../theme.css?raw";
import styles from "../index.css?raw";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("theme color contracts (not a rendered accessibility audit)", () => {
  for (const [index, theme] of ["light", "dark"].entries()) {
    const block = css.split("}")[index];
    const tokens = Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1], match[2]]));
    it(`${theme} text and status pairs meet AA normal-text contrast`, () => {
      for (const background of ["bg", "surface", "surface-subtle", "surface-elevated"]) {
        for (const foreground of ["text", "muted", "accent"]) expect(contrast(tokens[foreground], tokens[background]), `${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const [foreground, background] of [["accent-text", "accent"], ["accent", "accent-soft"], ["success", "success-bg"], ["warning", "warning-bg"], ["danger", "danger-bg"]]) {
        expect(contrast(tokens[foreground], tokens[background]), `${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${theme} control borders and focus remain distinguishable`, () => {
      expect(contrast(tokens.border, tokens.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(tokens.focus, tokens.surface)).toBeGreaterThanOrEqual(3);
    });
  }
  it("restricts blur to the topbar and supplies motion/transparency fallbacks", () => {
    expect(styles.match(/backdrop-filter: blur\(var/g)).toHaveLength(1);
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).toContain("prefers-reduced-transparency");
    expect(styles).toContain("@supports (backdrop-filter");
    expect(styles).not.toMatch(/#[\da-f]{3,8}\b/i);
  });
});
