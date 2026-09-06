import { addBodyPhoto } from "@/services/bodyPhotoService";
import RNDateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image } from "react-native";
import { Button, Label, Paragraph, ScrollView, XStack, YStack } from "tamagui";

export default function Add() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { uri, takenAt } = useLocalSearchParams<{
		uri: string;
		takenAt: string;
	}>();

	// EXIFから取れた撮影日を初期値にする。保存前にここで直せる
	const [selectedDate, setSelectedDate] = useState<Date>(() => {
		const parsed = takenAt ? new Date(takenAt) : new Date();
		return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	});

	const { mutate: savePhoto, isPending } = useMutation({
		mutationFn: () => addBodyPhoto(uri, selectedDate),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["bodyPhotos"] });
			router.back();
		},
		onError: () => {
			Alert.alert("エラー", "写真の保存に失敗しました");
		},
	});

	const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
		if (date) {
			setSelectedDate(date);
		}
	};

	if (!uri) {
		return (
			<YStack paddingVertical="$8" paddingHorizontal="$4">
				<Paragraph>写真が選ばれていません。</Paragraph>
			</YStack>
		);
	}

	return (
		<ScrollView>
			<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
				<Image
					source={{ uri }}
					style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 8 }}
					resizeMode="contain"
				/>

				<XStack alignItems="center" justifyContent="space-between">
					<Label htmlFor="takenAt">撮影日</Label>
					<RNDateTimePicker
						value={selectedDate}
						mode="date"
						onChange={handleDateChange}
						locale="ja-JP"
					/>
				</XStack>

				<Button onPress={() => savePhoto()} disabled={isPending}>
					{isPending ? "保存中..." : "写真を保存"}
				</Button>
			</YStack>
		</ScrollView>
	);
}
