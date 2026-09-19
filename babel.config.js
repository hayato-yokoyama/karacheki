module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: [
			// NOTE: v2 の babel-plugin は @tamagui/static-sync の getBabelPlugin() を返すだけで、
			// v1 で渡していた components / config / disableExtraction などのオプションは受け取らない
			"@tamagui/babel-plugin",

			// NOTE: this is only necessary if you are using reanimated for animations
			"react-native-reanimated/plugin",
		],
	};
};
