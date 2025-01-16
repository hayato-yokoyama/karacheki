import { Link, Stack } from "expo-router";
import { Button, Paragraph, YStack } from "tamagui";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<YStack padding="$8" gap="$8">
				<Paragraph>ご指定のページが見つかりません。</Paragraph>
				<Link href="/(tabs)/home" asChild>
					<Button>ホームに戻る</Button>
				</Link>
			</YStack>
		</>
	);
}
