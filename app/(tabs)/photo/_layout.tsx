import { Stack } from "expo-router";

export default function Layout() {
	return (
		// ヘッダーはコンテンツの中の見出しに置き換える（#77）
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			{/* トリミングから撮影日の確認へ進むので、モーダルを開くのは crop の側。
			    add を modal のままにするとシートが二段に重なる */}
			<Stack.Screen name="crop" options={{ presentation: "modal" }} />
			<Stack.Screen name="add" />
			<Stack.Screen name="[id]" />
			<Stack.Screen name="compare" />
		</Stack>
	);
}
