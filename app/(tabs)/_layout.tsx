import { Tabs } from "expo-router";

import { ChartLine, Home, Images } from "@tamagui/lucide-icons";
import type { ColorValue } from "react-native";
import { useTheme } from "tamagui";

/**
 * タブアイコンの色をTamaguiのアイコンに渡せる形にする
 *
 * React Navigation は PlatformColor も取りうる ColorValue を渡してくるが、
 * 実際に渡ってくるのは screenOptions で指定した色文字列
 */
const toIconColor = (color: ColorValue) => color as string;

export default function TabLayout() {
	const theme = useTheme();

	return (
		<Tabs
			screenOptions={{
				tabBarStyle: { backgroundColor: theme.background0.val },
				tabBarActiveTintColor: theme.accentColor.val,
			}}
			initialRouteName="home"
		>
			<Tabs.Screen
				name="home"
				options={{
					title: "ホーム",
					tabBarIcon: ({ color }) => (
						<Home color={toIconColor(color)} size="$1" />
					),
					headerShown: false,
				}}
			/>
			<Tabs.Screen
				name="graph/index"
				options={{
					title: "グラフ",
					tabBarIcon: ({ color }) => (
						<ChartLine color={toIconColor(color)} size="$1" />
					),
				}}
			/>
			<Tabs.Screen
				name="photo"
				options={{
					title: "Before/After",
					tabBarIcon: ({ color }) => (
						<Images color={toIconColor(color)} size="$1" />
					),
					headerShown: false,
				}}
			/>
		</Tabs>
	);
}
