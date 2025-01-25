import { Settings, SquarePlus } from "@tamagui/lucide-icons";
import { Link } from "expo-router";
import { Button, H2, ListItem, Paragraph, YGroup, YStack } from "tamagui";

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
					<ListItem icon={Settings} fontWeight="bold">
						ヘルスケアアクセスの設定手順
					</ListItem>
				</YGroup.Item>
				<YGroup.Item>
					<ListItem fontSize="$3">1. iPhoneの「設定」アプリを開く</ListItem>
				</YGroup.Item>
				<YGroup.Item>
					<ListItem fontSize="$3">2.「アプリ」→「ヘルスケア」を選択</ListItem>
				</YGroup.Item>
				<YGroup.Item>
					<ListItem fontSize="$3">
						3.「データアクセスとデバイス」を選択
					</ListItem>
				</YGroup.Item>
				<YGroup.Item>
					<ListItem fontSize="$3">4.「からチェキ」を選択</ListItem>
				</YGroup.Item>
				<YGroup.Item>
					<ListItem fontSize="$3">5.「すべてオンにする」を選択</ListItem>
				</YGroup.Item>
			</YGroup>
		</YStack>
	);
};
