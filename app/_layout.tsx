import tamaguiConfig from "@/tamagui.config";
import { TamaguiProvider } from "@tamagui/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
// SDK 56 以降、expo-router は react-navigation と併用できない。
// テーマ関連は expo-router が再エクスポートしているものを使う
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

const queryClient = new QueryClient();

export default function RootLayout() {
	const colorScheme = useColorScheme();

	// フォントのロード
	const [loaded] = useFonts({
		Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
		InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
	});

	useEffect(() => {
		if (loaded) {
			// can hide splash screen here
		}
	}, [loaded]);

	return (
		<TamaguiProvider
			config={tamaguiConfig}
			defaultTheme={colorScheme ?? undefined}
		>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<QueryClientProvider client={queryClient}>
					<Stack>
						<Stack.Screen
							name="(onboarding)/index"
							options={{ headerShown: false }}
						/>
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="+not-found" options={{ headerShown: false }} />
					</Stack>
				</QueryClientProvider>
			</ThemeProvider>
		</TamaguiProvider>
	);
}
