import { Stack } from "expo-router";

export default function Layout() {
	return (
		// ヘッダーはコンテンツの中の見出しに置き換える（#77）
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="add" options={{ presentation: "modal" }} />
		</Stack>
	);
}
