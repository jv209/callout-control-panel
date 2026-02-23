/**
 * Color conversion utilities.
 * Source: obsidian-admonition v10.3.2 (MIT, Jeremy Valentine)
 *
 * Extracted from settings.ts (hexToRgb, rgbToHex) and util/util.ts (hslToRgb, hsbToRgb).
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1]!, 16),
				g: parseInt(result[2]!, 16),
				b: parseInt(result[3]!, 16),
			}
		: null;
}

function componentToHex(c: number): string {
	const hex = c.toString(16);
	return hex.length === 1 ? "0" + hex : hex;
}

export function rgbToHex(rgb: string): string {
	const result = /^(\d+),\s?(\d+),\s?(\d+)/i.exec(rgb);
	if (!result?.length) {
		return "";
	}
	return `#${componentToHex(Number(result[1]))}${componentToHex(
		Number(result[2]),
	)}${componentToHex(Number(result[3]))}`;
}

export function hslToRgb(
	h: number,
	s: number,
	l: number,
): [number, number, number] {
	h /= 360;
	s /= 100;
	l /= 100;
	let r: number, g: number, b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function hsbToRgb(
	h: number,
	s: number,
	b: number,
): [number, number, number] {
	h /= 360;
	s /= 100;
	b /= 100;
	let r = 0,
		g = 0,
		bb = 0;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = b * (1 - s);
	const q = b * (1 - f * s);
	const t = b * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0: r = b; g = t; bb = p; break;
		case 1: r = q; g = b; bb = p; break;
		case 2: r = p; g = b; bb = t; break;
		case 3: r = p; g = q; bb = b; break;
		case 4: r = t; g = p; bb = b; break;
		case 5: r = b; g = p; bb = q; break;
	}
	return [Math.round(r * 255), Math.round(g * 255), Math.round(bb * 255)];
}
