import { Tabs } from "expo-router";

import { ChartLine, Dumbbell, House, Images } from "lucide-react-native";
import { useTheme } from "tamagui";

/** タブバーのアイコンサイズ。Tamagui の size="$1" と同じ値 */
const TAB_ICON_SIZE = 20;

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
						<House color={color} size={TAB_ICON_SIZE} />
					),
					headerShown: false,
				}}
			/>
			<Tabs.Screen
				name="graph/index"
				options={{
					title: "グラフ",
					tabBarIcon: ({ color }) => (
						<ChartLine color={color} size={TAB_ICON_SIZE} />
					),
				}}
			/>
			<Tabs.Screen
				name="lift"
				options={{
					title: "BIG3",
					tabBarIcon: ({ color }) => (
						<Dumbbell color={color} size={TAB_ICON_SIZE} />
					),
					headerShown: false,
				}}
			/>
			<Tabs.Screen
				name="photo"
				options={{
					title: "Before/After",
					tabBarIcon: ({ color }) => (
						<Images color={color} size={TAB_ICON_SIZE} />
					),
					headerShown: false,
				}}
			/>
		</Tabs>
	);
}
