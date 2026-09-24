// ESLint 9 "flat config". Bewusst schlank gehalten: Ziel ist es, echte
// Fehlerquellen abzufangen (unbenutzte Variablen, versehentliches var,
// lockere Gleichheitsvergleiche, echte Tippfehler bei Bezeichnern), nicht
// Stilfragen zu erzwingen.
//
// Nutzt das offizielle "globals"-Paket statt einer selbst gepflegten Liste
// - sonst müsste jede neu verwendete eingebaute Funktion (Math, JSON,
// Promise, ...) oder jeder neue Browser-Global hier von Hand nachgetragen
// werden, was schnell veraltet und zu falschen "no-undef"-Fehlern führt.
import globals from "globals";

export default [
  {
    files: ["rezeptbuch-card.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "all" }],
      "no-var": "error",
      eqeqeq: ["error", "smart"],
      "no-undef": "error",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "all" }],
      "no-var": "error",
      eqeqeq: ["error", "smart"],
      "no-undef": "error",
    },
  },
];
