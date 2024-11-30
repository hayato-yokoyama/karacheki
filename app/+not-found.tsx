import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Paragraph, YStack } from "tamagui";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<YStack padding="$8" gap="$8">
				<Paragraph>ご指定のページが見つかりません。</Paragraph>
				<Button>
					<Link href="/">ホームに戻る</Link>
				</Button>
			</YStack>
		</>
	);
}
