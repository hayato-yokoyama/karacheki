import type { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: IS_DEV ? "からチェキ.dev" : "からチェキ",
	slug: "karacheki",
	ios: {
		bundleIdentifier: IS_DEV
			? "com.h-yokoyama.karacheki.dev"
			: "com.h-yokoyama.karacheki",
	},
	android: {
		package: IS_DEV
			? "com.h_yokoyama.karacheki.dev"
			: "com.h_yokoyama.karacheki",
	},
});
