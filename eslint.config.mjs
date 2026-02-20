import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
	{
		ignores: ["dist/", "lib/", "node_modules/"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	eslintConfigPrettier,
	eslintPluginPrettier,
);
