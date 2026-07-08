// Local reproduction of the Obsidian community "scorecard" scanner's CSS/DOM rules.
//
// WHY THIS EXISTS: the repo pins eslint-plugin-obsidianmd@0.1.9, which does NOT
// contain the prefer-active-doc / prefer-create-el rules. The scanner runs a
// newer 0.4.x, so `npm run lint` here can silently pass code the scanner flags
// (that gap let the 1.6.11 <style>-element regression ship). This config lets you
// reproduce the scanner's CSS/DOM findings locally against the 0.4.x ruleset.
//
// HOW TO RUN (0.4.x is not a pinned dependency — install it transiently; the
// tarball is usually already in the npm cache, so this is fast/offline):
//
//   npm install --no-save eslint-plugin-obsidianmd@0.4.1
//   npx eslint --config scanner-gate.config.mjs "src/**/*.ts"
//   npm ci   # restore pinned deps afterward
//
// NOTE: with node_modules installed you will also see "Unused eslint-disable
// directive" warnings on the parked @typescript-eslint/no-unsafe-* suppressions.
// Those are a deps-installed artifact ONLY — the real scanner lints WITHOUT
// node_modules, so those rules fire, the directives are used, and it does not
// report them. Ignore them here; focus on the obsidianmd/* rules below.

import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default [
	{
		files: ["src/**/*.ts"],
		ignores: ["**/*.d.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		// tseslint registered (rules off) so inline @typescript-eslint disable
		// directives resolve to a known rule and don't error as "definition not found".
		plugins: { obsidianmd, "@typescript-eslint": tseslint.plugin },
		rules: {
			"obsidianmd/no-forbidden-elements": "error",
			"obsidianmd/prefer-active-doc": "warn",
			"obsidianmd/prefer-create-el": "warn",
			"obsidianmd/no-static-styles-assignment": "warn",
			"obsidianmd/no-global-this": "warn",
		},
	},
];
