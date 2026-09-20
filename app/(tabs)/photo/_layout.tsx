import { Stack } from "expo-router";

export default function Layout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Before/After" }} />
			{/* トリミングから撮影日の確認へ進むので、モーダルを開くのは crop の側。
			    add を modal のままにするとシートが二段に重なる */}
			<Stack.Screen
				name="crop"
				options={{
					presentation: "modal",
					headerShown: false,
				}}
			/>
			<Stack.Screen name="add" options={{ title: "写真の追加" }} />
			<Stack.Screen name="[id]" options={{ title: "写真" }} />
			<Stack.Screen name="compare" options={{ title: "比較" }} />
		</Stack>
	);
}
