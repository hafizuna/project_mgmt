import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Custom rule to prevent new PrismaClient() usage
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='PrismaClient']",
          message: "Do not create new PrismaClient instances. Import the singleton from '../lib/database.js' instead.",
        },
        {
          selector: "NewExpression[callee.property.name='PrismaClient']",
          message: "Do not create new PrismaClient instances. Import the singleton from '../lib/database.js' instead.",
        },
      ],
      
      // Prevent importing PrismaClient directly except in the database service
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              importNames: ["PrismaClient"],
              message: "Import 'prisma' from '../lib/database.js' instead of creating new PrismaClient instances.",
            },
          ],
        },
      ],
    },
  },
  // Exception for the database service file
  {
    files: ["src/lib/database.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
);