import { LinearGradient } from "@tamagui/linear-gradient";
import { useQuery } from "@tanstack/react-query";
import {
	differenceInCalendarDays,
	format,
	intervalToDuration,
	startOfDay,
} from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView } from "react-native";
import { SizableText, Spinner, View, XStack, YStack } from "tamagui";
import {
	getPhotoWeight,
	PhotoWeightValue,
	useAllWeights,
} from "@/components/photo/photoWeight";
import {
	BackLink,
	NumberText,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SurfaceCard,
} from "@/components/ui";
import type { BodyPhoto, ComparedPhotos } from "@/services/bodyPhotoService";
import {
	getBodyPhotoUri,
	listBodyPhotos,
	replaceComparedPhoto,
} from "@/services/bodyPhotoService";
import { formatDiffWeight } from "@/services/graphWindow";
import type { PhotoWeight } from "@/services/weightService";
import { radius } from "@/theme/designTokens";

/** 並べる2枚の高さ */
const PHOTO_HEIGHT = 240;

/** 日付と体重を読めるようにするため、写真の下端に敷く黒へのグラデーション */
const PHOTO_SCRIM_HEIGHT = 88;
const PHOTO_SCRIM_COLORS: string[] = ["rgba(0,0,0,0)", "rgba(0,0,0,0.62)"];

/** BEFORE の札。写真の上なので、地はテーマによらず黒の半透明 */
const BEFORE_BADGE_BACKGROUND = "rgba(0,0,0,0.55)";

/** 2枚の下に置く「◯日後 · 体重差」のピル。左右に区切り線を伸ばす */
const ELAPSED_PILL_HEIGHT = 30;
const ELAPSED_ROW_GAP = 10;

/** 選び直すためのサムネ */
const THUMBNAIL_WIDTH = 64;
const THUMBNAIL_HEIGHT = 86;
const THUMBNAIL_RADIUS = 12;
const THUMBNAIL_GAP = 8;
/** 選択中のサムネを囲む枠の太さ */
const THUMBNAIL_RING_WIDTH = 2.5;
/** サムネの下端に出す A / B のバッジ */
const THUMBNAIL_BADGE_WIDTH = 32;
const THUMBNAIL_BADGE_HEIGHT = 18;

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

/** サムネが比較中の2枚のどちらなのか。比較していなければ null */
const getComparedRole = (compared: ComparedPhotos, photo: BodyPhoto) => {
	if (photo.id === compared.after.id) {
		return "after";
	}

	return photo.id === compared.before.id ? "before" : null;
};

export default function Compare() {
	const { beforeId, afterId } = useLocalSearchParams<{
		beforeId: string;
		afterId: string;
	}>();

	/**
	 * 比較する2枚のID
	 *
	 * 一覧で選んだ2枚を初期値にして、この画面の中でも選び直せるようにする（#82）
	 */
	const [comparedIds, setComparedIds] = useState({ beforeId, afterId });

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	const before = photos?.find((photo) => photo.id === comparedIds.beforeId);
	const after = photos?.find((photo) => photo.id === comparedIds.afterId);

	const compared = useMemo<ComparedPhotos | null>(
		() => (before && after ? { before, after } : null),
		[before, after],
	);

	// 読み込み中や取得に失敗したときは undefined のままにして、体重の欄ごと出さない（#50）
	const weights = useAllWeights();

	const comparedWeights = useMemo(
		() =>
			weights && compared
				? {
						before: getPhotoWeight(weights, compared.before),
						after: getPhotoWeight(weights, compared.after),
					}
				: undefined,
		[weights, compared],
	);

	// 片方でも体重が無ければ、差は求められないので出さない
	const diffWeight =
		comparedWeights?.before && comparedWeights.after
			? comparedWeights.after.weight - comparedWeights.before.weight
			: null;

	/** サムネをタップした1枚で、比較する2枚のどちらかを差し替える */
	const handlePressThumbnail = (picked: BodyPhoto) => {
		if (compared === null) {
			return;
		}

		const next = replaceComparedPhoto(compared, picked);

		setComparedIds({ beforeId: next.before.id, afterId: next.after.id });
	};

	if (isLoading) {
		return (
			<Screen>
				<ScreenScrollView>
					<BackLink>Before/After</BackLink>
					<YStack height={400} alignItems="center" justifyContent="center">
						<Spinner size="small" />
					</YStack>
				</ScreenScrollView>
			</Screen>
		);
	}

	// 読み込みに失敗したときに「削除された」と誤解させない。
	// 実体ファイルが失われた写真が一覧から取り除かれた直後などにも到達しうる
	if (error || compared === null || !photos) {
		return (
			<Screen>
				<ScreenScrollView>
					<BackLink>Before/After</BackLink>
					<SizableText fontSize={14} lineHeight={23} color="$textMuted">
						{error
							? "写真を読み込めませんでした。"
							: "写真が見つかりませんでした。"}
					</SizableText>
				</ScreenScrollView>
			</Screen>
		);
	}

	const beforeTakenAt = new Date(compared.before.takenAt);
	const afterTakenAt = new Date(compared.after.takenAt);

	return (
		<Screen>
			<ScreenScrollView>
				<BackLink>Before/After</BackLink>
				<ScreenHeader
					label={`${format(beforeTakenAt, "yyyy/M/d")} → ${format(afterTakenAt, "yyyy/M/d")}`}
					title="比較"
				/>

				<XStack gap={8}>
					<ComparedPhoto
						label="BEFORE"
						photo={compared.before}
						photoWeight={comparedWeights?.before}
					/>
					<ComparedPhoto
						label="AFTER"
						photo={compared.after}
						photoWeight={comparedWeights?.after}
					/>
				</XStack>

				{/* 2枚に重ねず、区切り線の間に置く。写真の端が隠れない */}
				<XStack
					marginTop={2}
					marginBottom={4}
					gap={ELAPSED_ROW_GAP}
					alignItems="center"
				>
					<View flex={1} height={1} backgroundColor="$cardBorder" />
					<XStack
						height={ELAPSED_PILL_HEIGHT}
						paddingHorizontal={14}
						borderRadius={ELAPSED_PILL_HEIGHT / 2}
						backgroundColor="$segmentTrack"
						gap={7}
						alignItems="center"
					>
						<SizableText fontSize={13} fontWeight="800" color="$textPrimary">
							{formatElapsedLabel(beforeTakenAt, afterTakenAt)}
						</SizableText>
						{diffWeight !== null && (
							<>
								<View
									width={3}
									height={3}
									borderRadius={2}
									backgroundColor="$textMuted"
								/>
								<XStack gap={4} alignItems="baseline">
									<NumberText fontSize={17}>
										{formatDiffWeight(diffWeight)}
									</NumberText>
									<SizableText
										fontSize={12}
										fontWeight="600"
										color="$textMuted"
									>
										kg
									</SizableText>
								</XStack>
							</>
						)}
					</XStack>
					<View flex={1} height={1} backgroundColor="$cardBorder" />
				</XStack>

				<SurfaceCard paddingTop={14} paddingBottom={12}>
					<XStack
						paddingHorizontal={16}
						marginBottom={12}
						alignItems="flex-end"
						justifyContent="space-between"
					>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							撮影した写真から選ぶ
						</SizableText>
						<SizableText fontSize={12} color="$textMuted">
							{photos.length}枚
						</SizableText>
					</XStack>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						// 選択中のサムネに付く枠がはみ出すので、その分だけ内側に余白を取る
						contentContainerStyle={{
							gap: THUMBNAIL_GAP,
							paddingHorizontal: 16,
							paddingTop: THUMBNAIL_RING_WIDTH,
						}}
					>
						{photos.map((photo) => (
							<Thumbnail
								key={photo.id}
								photo={photo}
								role={getComparedRole(compared, photo)}
								onPress={() => handlePressThumbnail(photo)}
							/>
						))}
					</ScrollView>
				</SurfaceCard>
			</ScreenScrollView>
		</Screen>
	);
}

/** 並べて見せる1枚。左上に BEFORE / AFTER の札、下端に撮影日と体重を載せる */
const ComparedPhoto = ({
	label,
	photo,
	photoWeight,
}: {
	label: "BEFORE" | "AFTER";
	photo: BodyPhoto;
	/** 撮影日の体重。読み込み中や取得に失敗したときは undefined で、体重の欄ごと出さない */
	photoWeight: PhotoWeight | null | undefined;
}) => (
	<View
		flex={1}
		height={PHOTO_HEIGHT}
		borderRadius={radius.cardSmall}
		overflow="hidden"
		// 画像が読み込まれるまでの下地。写真で覆われるので単色で足りる
		backgroundColor="$photoPlaceholderStart"
	>
		<Image
			source={{ uri: getBodyPhotoUri(photo) }}
			style={{ width: "100%", height: "100%" }}
			// 縦横比の違う2枚でも表示の大きさを揃え、体の変化だけを見比べられるようにする
			resizeMode="cover"
		/>
		<LinearGradient
			colors={PHOTO_SCRIM_COLORS}
			position="absolute"
			left={0}
			right={0}
			bottom={0}
			height={PHOTO_SCRIM_HEIGHT}
			pointerEvents="none"
		/>
		<SizableText
			position="absolute"
			left={10}
			top={10}
			height={24}
			lineHeight={24}
			paddingHorizontal={10}
			borderRadius={12}
			fontFamily="$numeric"
			fontSize={14}
			fontWeight="700"
			letterSpacing={1.12}
			backgroundColor={
				label === "BEFORE" ? BEFORE_BADGE_BACKGROUND : "$accentFill"
			}
			color="$onHero"
		>
			{label}
		</SizableText>
		<YStack position="absolute" left={12} right={10} bottom={10}>
			<NumberText fontSize={15} lineHeight={16} color="$onHero" opacity={0.9}>
				{format(new Date(photo.takenAt), "yy/M/d")}
			</NumberText>
			{photoWeight !== undefined && (
				<PhotoWeightValue
					photoWeight={photoWeight}
					fontSize={26}
					lineHeight={28}
				/>
			)}
		</YStack>
	</View>
);

/**
 * 選び直すためのサムネ
 *
 * 比較中の2枚には枠と A / B のバッジが付く。
 * 色は上の札に合わせて、After（A）がアクセント、Before（B）が補助色
 */
const Thumbnail = ({
	photo,
	role,
	onPress,
}: {
	photo: BodyPhoto;
	role: "before" | "after" | null;
	onPress: () => void;
}) => {
	// A（After）は枠と バッジで色が違う。ダークでは枠の方が明るく、
	// 写真の上でも線として見える。B（Before）は枠も バッジも補助色
	const ringColor = role === "after" ? "$accent" : "$textMuted";
	const badgeColor = role === "after" ? "$accentFill" : "$textMuted";

	return (
		<YStack
			width={THUMBNAIL_WIDTH}
			gap={6}
			alignItems="center"
			// Tamagui は tabIndex が 0 のときしか accessible を補わないので自分で付ける。
			// 付けないと VoiceOver がボタンとして拾わず、ラベルも読まれない
			accessible
			accessibilityRole="button"
			accessibilityLabel={`${format(new Date(photo.takenAt), "yyyy年M月d日")}の写真を比較に使う`}
			accessibilityState={{ selected: role !== null }}
			pressStyle={{ opacity: 0.85 }}
			onPress={onPress}
		>
			<View
				width={THUMBNAIL_WIDTH}
				height={THUMBNAIL_HEIGHT}
				borderRadius={THUMBNAIL_RADIUS}
				// 画像が読み込まれるまでの下地。写真で覆われるので単色で足りる
				backgroundColor="$photoPlaceholderStart"
			>
				<Image
					source={{ uri: getBodyPhotoUri(photo) }}
					style={{
						width: THUMBNAIL_WIDTH,
						height: THUMBNAIL_HEIGHT,
						borderRadius: THUMBNAIL_RADIUS,
					}}
					resizeMode="cover"
				/>
				{role !== null && (
					<>
						{/* 枠はサムネの外側に出すので、画像とは別に重ねる */}
						<View
							pointerEvents="none"
							position="absolute"
							top={-THUMBNAIL_RING_WIDTH}
							left={-THUMBNAIL_RING_WIDTH}
							right={-THUMBNAIL_RING_WIDTH}
							bottom={-THUMBNAIL_RING_WIDTH}
							borderWidth={THUMBNAIL_RING_WIDTH}
							borderColor={ringColor}
							borderRadius={THUMBNAIL_RADIUS + THUMBNAIL_RING_WIDTH}
						/>
						<View
							position="absolute"
							left="50%"
							bottom={-1}
							marginLeft={-THUMBNAIL_BADGE_WIDTH / 2}
							width={THUMBNAIL_BADGE_WIDTH}
							height={THUMBNAIL_BADGE_HEIGHT}
							borderRadius={THUMBNAIL_BADGE_HEIGHT / 2}
							backgroundColor={badgeColor}
							alignItems="center"
							justifyContent="center"
						>
							<NumberText
								fontSize={12}
								color={role === "after" ? "$onAccentFill" : "$cardBackground"}
							>
								{role === "after" ? "A" : "B"}
							</NumberText>
						</View>
					</>
				)}
			</View>
			<NumberText weight="600" fontSize={14} color="$textMuted">
				{format(new Date(photo.takenAt), "yy/M/d")}
			</NumberText>
		</YStack>
	);
};
