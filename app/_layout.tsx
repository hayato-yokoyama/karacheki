import tamaguiConfig from "@/tamagui.config";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { TamaguiProvider } from "@tamagui/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const queryClient = new QueryClient();

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [isFirstLaunch, setIsFirstLaunch] = useState<null | boolean>(null);

	// フォントのロード
	const [loaded] = useFonts({
		Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
		InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
	});

	// 初回起動チェック
	useEffect(() => {
		const checkFirstLaunch = async () => {
			try {
				const value = await AsyncStorage.getItem("isFirstLaunch");
				if (value === null) {
					// 初回起動
					setIsFirstLaunch(true);
					await AsyncStorage.setItem("isFirstLaunch", "false");
				} else {
					// 2回目以降の起動
					setIsFirstLaunch(false);
				}
			} catch (error) {
				console.error("Error checking first launch:", error);
			}
		};
		checkFirstLaunch();
	}, []);

	// スプラッシュ画面を隠す処理
	useEffect(() => {
		if (loaded && isFirstLaunch !== null) {
			// can hide splash screen here
		}
	}, [loaded, isFirstLaunch]);

	// フォントまたは初回起動チェックのロード中はローディングインジケーターを表示
	if (!loaded || isFirstLaunch === null) {
		return;
	}

	return (
		<TamaguiProvider
			config={tamaguiConfig}
			defaultTheme={colorScheme ?? undefined}
		>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<QueryClientProvider client={queryClient}>
					<Stack
						// TODO: ここの分岐は動かない
						initialRouteName={
							isFirstLaunch === false ? "(tabs)" : "(onboarding)/index"
						}
					>
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
