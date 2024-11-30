import { Tabs } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";

import { ChartLine, Home } from "@tamagui/lucide-icons";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: "#ffd33d",
				headerStyle: {
					backgroundColor: "#25292e",
				},
				headerShadowVisible: false,
				headerTintColor: "#fff",
				tabBarStyle: {
					backgroundColor: "#25292e",
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "ホーム",
					tabBarIcon: ({ color }) => <Home color={color} />,
				}}
			/>
			<Tabs.Screen
				name="graph/index"
				options={{
					title: "グラフ",
					tabBarIcon: ({ color }) => <ChartLine color={color} />,
				}}
			/>
		</Tabs>
	);
}
