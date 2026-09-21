import {
	BarlowCondensed_600SemiBold,
	BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import { setupGestureHandler } from "@tamagui/native/setup-gesture-handler";
// `@tamagui/core` ではなく `tamagui` の Provider を使う。
// こちらは中で `PortalProvider` を張っており、これが無いと
// `Sheet modal`（`components/ui/bottomSheet.tsx`）が
// 「'PortalDispatchContext' cannot be null」で落ちる
import { TamaguiProvider } from "tamagui";
// Tamagui の LinearGradient に expo-linear-gradient を登録する。
// これが無いと native でグラデーションが描かれず警告だけ出る
// （`components/ui/heroCard.tsx` / `components/ui/primaryButton.tsx`）
import "@tamagui/native/setup-expo-linear-gradient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import tamaguiConfig from "@/tamagui.config";
import { darkColorTokens, lightColorTokens } from "@/theme/designTokens";

// Sheet の下スワイプを react-native-gesture-handler に任せる（`components/ui/bottomSheet.tsx`）。
// 入れなくても PanResponder で動くが、ジェスチャがネイティブ側で処理される方が滑らか。
// pressEvents は既定の true だと全 Tamagui コンポーネントのタップ処理が差し替わるので、
// 影響範囲を Sheet に閉じるため明示的に切っている
setupGestureHandler({ pressEvents: false, sheet: true });

const queryClient = new QueryClient();

// 数値用のフォントが乗る前の画面を見せないよう、読み込みが終わるまでスプラッシュを出しておく
SplashScreen.preventAutoHideAsync();

/** react-navigation 側にもリデザインの色を渡して、画面遷移中の地が白く光らないようにする */
const buildNavigationTheme = (isDark: boolean) => {
	const base = isDark ? DarkTheme : DefaultTheme;
	const tokens = isDark ? darkColorTokens : lightColorTokens;

	return {
		...base,
		colors: {
			...base.colors,
			background: tokens.screenBackground,
			card: tokens.cardBackground,
			border: tokens.cardBorder,
			primary: tokens.accent,
			text: tokens.textPrimary,
		},
	};
};

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const isDark = colorScheme === "dark";

	// フォントのロード。日本語は OS 標準に任せるので、同梱するのは数値用の Barlow Condensed だけ
	const [loaded, fontError] = useFonts({
		BarlowCondensed_600SemiBold,
		BarlowCondensed_700Bold,
	});

	// 読み込みに失敗しても先へ進める。数値が OS 標準の書体になるだけで、
	// スプラッシュから戻れなくなる方が困る
	const canRender = loaded || fontError !== null;

	useEffect(() => {
		if (canRender) {
			SplashScreen.hideAsync();
		}
	}, [canRender]);

	if (!canRender) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<TamaguiProvider
				config={tamaguiConfig}
				defaultTheme={colorScheme ?? undefined}
			>
				<ThemeProvider value={buildNavigationTheme(isDark)}>
					<QueryClientProvider client={queryClient}>
						<Stack
							screenOptions={{
								headerShown: false,
								contentStyle: {
									backgroundColor: isDark
										? darkColorTokens.screenBackground
										: lightColorTokens.screenBackground,
								},
							}}
						>
							<Stack.Screen name="(onboarding)/index" />
							<Stack.Screen name="(tabs)" />
							<Stack.Screen name="+not-found" />
						</Stack>
					</QueryClientProvider>
				</ThemeProvider>
			</TamaguiProvider>
		</GestureHandlerRootView>
	);
}
