import * as path from "node:path";
import basicSsl from '@vitejs/plugin-basic-ssl'
import type { UserConfig } from "vite";
import checker from "vite-plugin-checker";

export default {
	root: path.resolve(__dirname, "./src"),
	mode: process.env.NODE_ENV ?? "development",
	build: {
		outDir: path.resolve(__dirname, "./build"),
		emptyOutDir: true
	},
	base: "./",
	server: {
		https: {},
		host: true,
		watch: {
			usePolling: true
		}
	},
	plugins: [
		checker({
			typescript: true,
		}),
		basicSsl({
			name: 'vite-ssl-dev',
			domains: [
				'localhost:5173',
				'192.168.2.115:5173',
			],
			certDir: './cert',
		}),
	],
} satisfies UserConfig;
