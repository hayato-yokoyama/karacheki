import { Tabs } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";

import { ChartLine, Home, Settings } from "@tamagui/lucide-icons";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarLabelStyle: {
					fontSize: 8,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "ホーム",
					tabBarIcon: ({ color }) => <Home color={color} size="$1" />,
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
