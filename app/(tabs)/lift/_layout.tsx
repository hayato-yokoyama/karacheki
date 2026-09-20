import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "BIG3" }} />
			<Stack.Screen
				name="add"
				options={{
					presentation: "modal",
					title: "記録の追加",
				}}
			/>
		</Stack>
	);
}
