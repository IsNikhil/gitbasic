import js from "@eslint/js";
export default [
  { ignores: ["node_modules/**", "test-results/**", "script.js"] },
  {
    files: [
      "games/**/*.mjs",
      "tests/**/*.mjs",
      "scripts/**/*.mjs",
      "eslint.config.mjs",
    ],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: Object.fromEntries(
        [
          "console",
          "process",
          "URL",
          "document",
          "window",
          "localStorage",
          "structuredClone",
          "setTimeout",
          "HTMLElement",
          "HTMLFormElement",
          "HTMLSelectElement",
          "HTMLInputElement",
          "HTMLTextAreaElement",
          "HTMLButtonElement",
          "SubmitEvent",
          "FormData",
          "Storage",
          "innerWidth",
        ].map((name) => [name, "readonly"]),
      ),
    },
  },
];
