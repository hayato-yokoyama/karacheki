import { getBodyPhotoUri, listBodyPhotos } from "@/services/bodyPhotoService";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import { useQuery } from "@tanstack/react-query";
import {
	differenceInCalendarDays,
	format,
	intervalToDuration,
	startOfDay,
} from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { Image } from "react-native";
import {
	Paragraph,
	SizableText,
	Spinner,
	XStack,
	YStack,
	useTheme,
} from "tamagui";

/** 並べる写真の縦横比。一覧のセルと揃えている */
const PHOTO_ASPECT_RATIO = 3 / 4;

/** 年月で表さず日数のままにする間隔の上限 */
const DAYS_SHOWN_AS_DAYS = 30;

/**
 * 2枚の間隔を表示用の文言にする
 *
 * 短期は日数、長期は年月で表す。1年半離れた2枚を「523日後」と言われても
 * どれくらいの期間なのか実感と結びつかないため
 */
const formatElapsedLabel = (before: Date, after: Date) => {
	// 表示しているのは日付だけなので、時刻を落としてから間隔を求める。
	// 時刻を含めたまま数えると、同じ日付の組み合わせでもEXIFの時刻次第で
	// 「1ヶ月後」と「31日後」に割れる
	const start = startOfDay(before);
	const end = startOfDay(after);
	const days = differenceInCalendarDays(end, start);

	if (days === 0) {
		return "同じ日";
	}

	if (days < DAYS_SHOWN_AS_DAYS) {
		return `${days}日後`;
	}

	const { years = 0, months = 0 } = intervalToDuration({ start, end });

	// 30日を超えていても1ヶ月に満たないこと（1/1→1/31 など）があるため日数に戻す
	if (years === 0 && months === 0) {
		return `${days}日後`;
	}

	if (years === 0) {
		return `${months}ヶ月後`;
	}

	return months === 0 ? `${years}年後` : `${years}年${months}ヶ月後`;
};

export default function Compare() {
	const theme = useTheme();
	const { beforeId, afterId } = useLocalSearchParams<{
		beforeId: string;
		afterId: string;
	}>();

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	const before = photos?.find((photo) => photo.id === beforeId);
	const after = photos?.find((photo) => photo.id === afterId);

	if (isLoading) {
		return (
			<YStack flex={1} alignItems="center" justifyContent="center">
				<Spinner size="small" />
			</YStack>
		);
	}

	// 読み込みに失敗したときに「削除された」と誤解させない
	if (error) {
		return (
			<YStack paddingVertical="$8" paddingHorizontal="$4">
				<Paragraph>写真を読み込めませんでした。</Paragraph>
			</YStack>
		);
	}

	// 実体ファイルが失われた写真が一覧から取り除かれた直後などに到達しうる
	if (!before || !after) {
		return (
			<YStack paddingVertical="$8" paddingHorizontal="$4">
				<Paragraph>写真が見つかりませんでした。</Paragraph>
			</YStack>
		);
	}

	const comparedPhotos: { label: string; photo: BodyPhoto }[] = [
		{ label: "Before", photo: before },
		{ label: "After", photo: after },
	];

	return (
		<YStack flex={1} paddingVertical="$6" paddingHorizontal="$4" gap="$5">
			<XStack gap="$2">
				{comparedPhotos.map(({ label, photo }) => (
					<YStack key={label} flex={1} gap="$2">
						<Image
							source={{ uri: getBodyPhotoUri(photo) }}
							style={{
								width: "100%",
								aspectRatio: PHOTO_ASPECT_RATIO,
								borderRadius: 8,
								backgroundColor: theme.background05.val,
							}}
							// 縦横比の違う2枚でも表示の大きさを揃え、体の変化だけを見比べられるようにする
							resizeMode="cover"
						/>
						<YStack alignItems="center">
							<SizableText size="$2" fontWeight="bold">
								{label}
							</SizableText>
							<SizableText size="$2">
								{format(new Date(photo.takenAt), "yyyy/MM/dd")}
							</SizableText>
						</YStack>
					</YStack>
				))}
			</XStack>

			<SizableText size="$6" fontWeight="bold" textAlign="center">
				{formatElapsedLabel(new Date(before.takenAt), new Date(after.takenAt))}
			</SizableText>
		</YStack>
	);
}
