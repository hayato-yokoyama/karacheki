import tamaguiConfig from "@/tamagui.config";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { TamaguiProvider } from "@tamagui/core";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

export default function RootLayout() {
	const colorScheme = useColorScheme();

	const [loaded] = useFonts({
		Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
		InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
	});

	useEffect(() => {
		if (loaded) {
			// can hide splash screen here
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return (
		<TamaguiProvider
			config={tamaguiConfig}
			defaultTheme={colorScheme ?? undefined}
		>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Stack>
					<Stack.Screen name="index" />
					<Stack.Screen name="details" />
				</Stack>
			</ThemeProvider>
		</TamaguiProvider>
	);
}
