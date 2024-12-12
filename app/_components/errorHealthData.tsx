import { Settings } from "@tamagui/lucide-icons";
import { H2, ListItem, Paragraph, YGroup, YStack } from "tamagui";

export const ErrorHealthData = () => {
	return (
		<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
			<H2 size="$7">Sorry</H2>
			<YStack gap="$2">
				<Paragraph>体重データを取得できませんでした。</Paragraph>
				<Paragraph>
					ヘルスケアアプリに体重データが保存されていることを確認してください。
				</Paragraph>
				<Paragraph>
					保存されている場合は、ヘルスケアアプリの設定から「からチェキ」のアクセスが許可されていることを確認してください。
				</Paragraph>
			</YStack>

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
