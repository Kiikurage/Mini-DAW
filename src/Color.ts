/**
 * 色
 */
export class Color {
	/**
	 * @param r The red component [0, 1]
	 * @param g The green component [0, 1]
	 * @param b The blue component [0, 1]
	 * @param alpha The alpha component [0, 1]
	 */
	constructor(
		readonly r: number,
		readonly g: number,
		readonly b: number,
		readonly alpha: number,
	) {}

	get cssString() {
		return `rgba(${this.r * 255}, ${this.g * 255}, ${this.b * 255}, ${this.alpha})`;
	}

	get hsl(): [h: number, s: number, l: number] {
		const r = this.r;
		const g = this.g;
		const b = this.b;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0;
		let s = 0;
		const l = (max + min) / 2;

		if (max === min) {
			h = 0; // achromatic
		} else {
			if (max === r) {
				h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
			} else if (max === g) {
				h = ((b - r) / (max - min) + 2) * 60;
			} else if (max === b) {
				h = ((r - g) / (max - min) + 4) * 60;
			}
		}
		if (max === 0) {
			s = 0;
		} else {
			s = (max - min) / max;
		}

		return [h, s, l];
	}

	/**
	 * @param hex A hex color string, e.g. "#RRGGBB" or "#RGB"
	 * @returns A Color instance. Alpha is set to 1.
	 */
	static hex(hex: string): Color {
		hex = hex.replace(/^#/, "");
		const value = parseInt(hex, 16);
		if (hex.length === 6) {
			return new Color(
				((value >> 16) & 255) / 255,
				((value >> 8) & 255) / 255,
				(value & 255) / 255,
				1,
			);
		} else if (hex.length === 3) {
			return new Color(
				((value >> 8) & 15) / 15,
				((value >> 4) & 15) / 15,
				(value & 15) / 15,
				1,
			);
		} else {
			throw new Error("Invalid hex color format");
		}
	}

	/**
	 * @param h The hue component [0, 360)
	 * @param s The saturation component [0, 1]
	 * @param l The lightness component [0, 1]
	 * @param alpha The alpha component [0, 1]
	 */
	static hsl(h: number, s: number, l: number, alpha: number = 1): Color {
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = l - c / 2;

		if (h < 60) {
			return new Color(c + m, x + m, m, alpha);
		} else if (60 <= h && h < 120) {
			return new Color(x + m, c + m, m, alpha);
		} else if (120 <= h && h < 180) {
			return new Color(m, c + m, x + m, alpha);
		} else if (180 <= h && h < 240) {
			return new Color(m, x + m, c + m, alpha);
		} else if (240 <= h && h < 300) {
			return new Color(x + m, m, c + m, alpha);
		} else {
			return new Color(c + m, m, x + m, alpha);
		}
	}

	setAlpha(alpha: number): Color {
		return new Color(this.r, this.g, this.b, alpha);
	}

	setL(newL: number): Color {
		const [h, s, _] = this.hsl;
		return Color.hsl(h, s, newL, this.alpha);
	}

	serialize(): SerializedColor {
		return [this.r, this.g, this.b, this.alpha];
	}

	static deserialize(obj: SerializedColor): Color {
		return new Color(obj[0], obj[1], obj[2], obj[3]);
	}
}

export type SerializedColor = [r: number, g: number, b: number, a: number];
