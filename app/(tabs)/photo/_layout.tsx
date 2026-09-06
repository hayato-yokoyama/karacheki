import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Before/After" }} />
			<Stack.Screen
				name="add"
				options={{
					presentation: "modal",
					title: "写真の追加",
				}}
			/>
			<Stack.Screen name="[id]" options={{ title: "写真" }} />
		</Stack>
	);
}
