import { Stack } from "expo-router";
import { Paragraph, YStack } from "tamagui";

export default function Graph() {
	return (
		<>
			<Stack.Screen options={{ title: "グラフ" }} />
			<YStack padding="$8" gap="$8">
				<Paragraph>graph</Paragraph>
			</YStack>
		</>
	);
}
