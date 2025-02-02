import { saveWeight } from "@/app/_services/weightService";
import RNDateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Lightbulb } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import {
	Button,
	Card,
	Input,
	Label,
	Paragraph,
	ScrollView,
	SizableText,
	Text,
	XStack,
	YStack,
} from "tamagui";

export default function Add() {
	return (
		<ScrollView>
			<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
				<Card padding="$4">
					<YStack gap="$2">
						<XStack gap="$2">
							<Lightbulb />
							<SizableText fontWeight="bold">
								体重の自動入力をお勧めしています
							</SizableText>
						</XStack>
						<YStack flex={1} gap="$4">
							<Paragraph flex={1} fontSize="$4">
								スマート体重計を用意してスマホを連携すれば、体重測定するだけでスマホに自動で記録できます。
							</Paragraph>
						</YStack>
					</YStack>
				</Card>
				<WeightInputForm />
			</YStack>
		</ScrollView>
	);
}

const WeightInputForm = () => {
	const router = useRouter();

	const [weight, setWeight] = useState<string>("");
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
		if (date) {
			setSelectedDate(date);
		}
	};

	const handlePressSave = async () => {
		if (!weight) {
			return;
		}
		try {
			const weightNumber = Number(weight);
			await saveWeight(weightNumber, selectedDate);

			Alert.alert("完了", "体重を追加しました");
			router.back();
		} catch (error) {
			Alert.alert("エラー", "体重の追加に失敗しました。  \n設定アプリからヘルスケアのアクセスが許可されていることを確認してください。");
		}
	};

	return (
		<YStack gap="$4">
			<XStack alignItems="center" justifyContent="space-between">
				<Label htmlFor="weight">体重（kg）</Label>
				<Input
					placeholder="kg"
					keyboardType="numeric"
					value={weight}
					onChangeText={(text) => setWeight(text)}
					width="$12"
				/>
			</XStack>
			<XStack alignItems="center" justifyContent="space-between">
				<Label htmlFor="datetime">日時</Label>

				<RNDateTimePicker
					value={selectedDate}
					mode="datetime"
					onChange={handleDateChange}
					locale="ja-JP"
				/>
			</XStack>

			<Button onPress={handlePressSave}>体重を追加</Button>
		</YStack>
	);
};
