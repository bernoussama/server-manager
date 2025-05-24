import { defineConfig } from "tsup";

export const tsup = defineConfig({
	splitting: false,
	clean: true,
	dts: true,
	format: ["esm", "cjs"],
	bundle: true,
	minify: false,
	entry: {
		index: "src/index.ts",
		"validators/index": "src/validators/index.ts"
	},
	sourcemap: true,
	target: "es2020",
	platform: "neutral",
	// Remove the Node.js specific banner for browser compatibility
	external: [],
});