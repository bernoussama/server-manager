import { defineConfig } from "tsup";
import { fixExtensionsPlugin } from "esbuild-fix-imports-plugin";

export const tsup = defineConfig({
	splitting: true,
	clean: true,
	dts: true,
	format: ["esm"],
	bundle: true,
	minify: false,
	entry: ["src/**/!(*.spec).ts", "src/**/!(*.e2e).ts"],
	sourcemap: true,
	target: "esnext",
	platform: "node",
	esbuildPlugins: [
		fixExtensionsPlugin(),
	],
	banner: {
		// This is fine for Node.js backend
		js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
	},
});