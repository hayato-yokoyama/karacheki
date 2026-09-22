import { Stack } from "expo-router";

export default function Layout() {
	return (
		// ヘッダーはコンテンツの中の見出しに置き換える（#77）
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			{/* 記録の追加・編集と換算表は、タブバーを隠して入力と表に集中させる */}
			<Stack.Screen name="add" options={{ presentation: "modal" }} />
			<Stack.Screen name="table" options={{ presentation: "modal" }} />
		</Stack>
	);
}
