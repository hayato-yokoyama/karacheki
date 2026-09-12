import { addBodyPhoto } from "@/services/bodyPhotoService";
import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import type { ImageLoadEventData, NativeSyntheticEvent } from "react-native";
import { Alert, Image } from "react-native";
import { Button, Label, Paragraph, ScrollView, XStack, YStack } from "tamagui";

export default function Add() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { uri, takenAt } = useLocalSearchParams<{
		uri: string;
		takenAt: string;
	}>();

	// 読み込むまで縦横比が分からないため、全身写真に多い縦長を仮に置く
	const [aspectRatio, setAspectRatio] = useState(3 / 4);

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

	/** 読み込めた画像の縦横比をプレビューに反映して余白をなくす */
	const handleImageLoad = (event: NativeSyntheticEvent<ImageLoadEventData>) => {
		const { width, height } = event.nativeEvent.source;

		if (width > 0 && height > 0) {
			setAspectRatio(width / height);
		}
	};

	// v9 で date が必須になったため、存在チェックは不要
	const handleDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
		setSelectedDate(date);
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
					style={{ width: "100%", aspectRatio, borderRadius: 8 }}
					resizeMode="contain"
					onLoad={handleImageLoad}
				/>

				<XStack alignItems="center" justifyContent="space-between">
					<Label htmlFor="takenAt">撮影日</Label>
					<RNDateTimePicker
						value={selectedDate}
						mode="date"
						onValueChange={handleDateChange}
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
