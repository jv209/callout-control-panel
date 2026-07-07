import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		// The no-unsafe suppressions target the Obsidian scorecard scanner,
		// which lints without node_modules (so dependency types resolve to
		// `any`). With deps installed those directives are "unused", so don't
		// report them as problems here.
		linterOptions: {
			reportUnusedDisableDirectives: false,
		},
		languageOptions: {
			globals: {
				...globals.browser,
				activeDocument: "readonly",
				activeWindow: "readonly",
				createEl: "readonly",
				createDiv: "readonly",
				createSpan: "readonly",
				createFragment: "readonly",
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json',
						'vitest.config.ts'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		extends: [tseslint.configs.recommendedTypeChecked],
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"plugin A",
		"plugin B",
		"plugin C",
	]),
);
