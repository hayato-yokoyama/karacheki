import type { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: IS_DEV ? "からチェキ.dev" : "からチェキ",
	slug: "karacheki",
	// app.json の ios / android 設定を消さないよう展開してから上書きする
	ios: {
		...config.ios,
		bundleIdentifier: IS_DEV
			? "com.h-yokoyama.karacheki.dev"
			: "com.h-yokoyama.karacheki",
		infoPlist: {
			...config.ios?.infoPlist,
			// 独自の暗号化は使っていない（HTTPS通信とKeychainのみ）
			ITSAppUsesNonExemptEncryption: false,
		},
	},
	android: {
		...config.android,
		package: IS_DEV
			? "com.h_yokoyama.karacheki.dev"
			: "com.h_yokoyama.karacheki",
	},
});
