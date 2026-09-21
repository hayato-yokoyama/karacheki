import { Tabs } from "expo-router";

import { ChartLine, Dumbbell, House, Images } from "lucide-react-native";
import { AppTabBar } from "@/components/ui";
import { layout } from "@/theme/designTokens";

/** 非アクティブなタブのアイコンは線を細くして、アクティブとの差を付ける */
const strokeWidthOf = (focused: boolean) => (focused ? 2 : 1.8);

export default function TabLayout() {
	return (
		<Tabs
			// OS 標準のタブバーではアクティブなタブの背後にピルを敷けないので差し替える（#77）
			tabBar={(props) => <AppTabBar {...props} />}
			// ヘッダーはコンテンツの中の見出しに置き換える（#77）
			screenOptions={{ headerShown: false }}
			initialRouteName="home"
		>
			<Tabs.Screen
				name="home"
				options={{
					title: "ホーム",
					tabBarIcon: ({ color, focused }) => (
						<House
							color={color}
							size={layout.tabIconSize}
							strokeWidth={strokeWidthOf(focused)}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="graph/index"
				options={{
					title: "グラフ",
					tabBarIcon: ({ color, focused }) => (
						<ChartLine
							color={color}
							size={layout.tabIconSize}
							strokeWidth={strokeWidthOf(focused)}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="lift"
				options={{
					title: "BIG3",
					tabBarIcon: ({ color, focused }) => (
						<Dumbbell
							color={color}
							size={layout.tabIconSize}
							strokeWidth={strokeWidthOf(focused)}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="photo"
				options={{
					title: "Before/After",
					tabBarIcon: ({ color, focused }) => (
						<Images
							color={color}
							size={layout.tabIconSize}
							strokeWidth={strokeWidthOf(focused)}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
