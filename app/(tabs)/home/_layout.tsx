import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack>
			<Stack.Screen name="home" />
			<Stack.Screen
				name="add"
				options={{
					presentation: "modal",
					title: "体重の入力",
				}}
			/>
		</Stack>
	);
}
