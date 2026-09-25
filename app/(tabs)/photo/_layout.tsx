import { Stack } from "expo-router";

export default function Layout() {
	return (
		// ヘッダーはコンテンツの中の見出しに置き換える（#77）
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			{/* トリミングから撮影日の確認へ進むので、モーダルを開くのは crop の側。
			    add を modal のままにするとシートが二段に重なる */}
			{/* 撮影画面はプレビューを大きく取るため全画面で開く。
			    撮った後のトリミングはこの上に重ねるので、キャンセルで撮り直しに戻れる */}
			<Stack.Screen
				name="camera"
				options={{ presentation: "fullScreenModal" }}
			/>
			<Stack.Screen name="crop" options={{ presentation: "modal" }} />
			<Stack.Screen name="add" />
			<Stack.Screen name="[id]" />
			<Stack.Screen name="compare" />
		</Stack>
	);
}
