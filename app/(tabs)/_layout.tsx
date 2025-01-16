import { Tabs } from "expo-router";

import { ChartLine, Home } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";

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
					tabBarIcon: ({ color }) => <Home color={color} size="$1" />,
					headerShown: false,
				}}
			/>
			<Tabs.Screen
				name="graph/index"
				options={{
					title: "グラフ",
					tabBarIcon: ({ color }) => <ChartLine color={color} size="$1" />,
				}}
			/>
		</Tabs>
	);
}
