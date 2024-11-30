import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "からチェキ",
	slug: "karacheki",
	version: "1.0.0",
	orientation: "portrait",
	icon: "./assets/images/icon.png",
	scheme: "myapp",
	userInterfaceStyle: "automatic",
	newArchEnabled: true,
	ios: {
		supportsTablet: true,
		bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
	},
	android: {
		adaptiveIcon: {
			foregroundImage: "./assets/images/adaptive-icon.png",
			backgroundColor: "#ffffff",
		},
		package: process.env.ANDROID_PACKAGE_NAME,
	},
	web: {
		bundler: "metro",
		output: "static",
		favicon: "./assets/images/favicon.png",
	},
	plugins: [
		"expo-router",
		[
			"expo-splash-screen",
			{
				image: "./assets/images/splash-icon.png",
				imageWidth: 200,
				resizeMode: "contain",
				backgroundColor: "#ffffff",
			},
		],
		"expo-font",
		[
			"@kingstinct/react-native-healthkit",
			{
				NSHealthShareUsageDescription:
					"体重データを取得するためにヘルスデータにアクセスします。",
			},
		],
	],
	experiments: {
		typedRoutes: true,
	},
	extra: {
		router: {
			origin: false,
		},
		eas: {
			projectId: "32fa0a06-80f5-451a-8b10-9aed7e3f8cc7",
		},
	},
	runtimeVersion: {
		policy: "appVersion",
	},
	updates: {
		url: "https://u.expo.dev/32fa0a06-80f5-451a-8b10-9aed7e3f8cc7",
	},
});
