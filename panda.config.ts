import { defineConfig } from "@pandacss/dev";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
	preflight: true,
	presets: [],
	hash: isProduction,
	minify: isProduction,
	include: ["./src/**/*.{js,jsx,ts,tsx}"],
	outdir: "styled-system",
	theme: {
		extend: {
			tokens: {
				fontWeights: {
					light: { value: "100" },
				},
			},
			keyframes: {
				spin: {
					"0%": { transform: "rotate(0deg)" },
					"100%": { transform: "rotate(360deg)" },
				},
			},
		},
	},
	jsxFramework: "react",
	jsxFactory: "styled",
	jsxStyleProps: "minimal",
});
