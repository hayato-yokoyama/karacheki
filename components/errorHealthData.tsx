import { Link } from "expo-router";
import { Settings } from "lucide-react-native";
import { Button, H2, ListItem, Paragraph, YGroup, YStack } from "tamagui";
import { HEALTH_ACCESS_STEPS } from "@/components/healthAccessGuide";

export const ErrorHealthData = () => {
	return (
		<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
			<H2 size="$7">体重を入力しましょう 🚀</H2>
			<YStack gap="$2">
				<Paragraph>体重データを取得できませんでした。</Paragraph>
				<Paragraph>
					ヘルスケアのアクセス許可を確認して、体重データを入力してください！
				</Paragraph>
			</YStack>

			<Link href="/(tabs)/home/add" asChild>
				<Button>体重を入力する</Button>
			</Link>

			<YGroup>
				<YGroup.Item>
					<ListItem icon={Settings}>
						<ListItem.Text fontWeight="bold">
							ヘルスケアアクセスの設定手順
						</ListItem.Text>
					</ListItem>
				</YGroup.Item>
				{HEALTH_ACCESS_STEPS.map((step, index) => (
					<YGroup.Item key={step}>
						<ListItem>
							<ListItem.Text fontSize="$3">{`${index + 1}. ${step}`}</ListItem.Text>
						</ListItem>
					</YGroup.Item>
				))}
			</YGroup>
		</YStack>
	);
};
