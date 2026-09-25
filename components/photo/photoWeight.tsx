import { useQuery } from "@tanstack/react-query";
import { SizableText, XStack } from "tamagui";
import { NumberText } from "@/components/ui";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import {
	fetchAllWeights,
	findPhotoWeight,
	formatPhotoWeightOffset,
	type PhotoWeight,
	type WeightSample,
} from "@/services/weightService";

/** 測定日のずれのピル。写真の上なので、地はテーマによらず白の半透明 */
const OFFSET_PILL_HEIGHT = 20;
const OFFSET_PILL_BACKGROUND = "rgba(255,255,255,0.22)";

/**
 * 写真に添える体重のもとになる、全期間の体重（#50）
 *
 * ホーム・グラフと同じキャッシュを使うので、ホームで記録した体重がそのまま反映される。
 * 読み込み中や取得に失敗したときは undefined で、呼び出し側は体重の欄ごと出さない。
 * 取得の失敗を「記録なし」と出すと、記録があるのに無いと誤解させてしまうため
 */
export const useAllWeights = () => {
	const { data } = useQuery({
		queryKey: ["weights", "all"],
		queryFn: fetchAllWeights,
	});

	return data;
};

/** 写真の撮影日の体重を探す（#50） */
export const getPhotoWeight = (
	weights: readonly WeightSample[],
	photo: BodyPhoto,
) => findPhotoWeight(weights, new Date(photo.takenAt));

/**
 * 写真の上に重ねる体重（#50）
 *
 * 撮影日の記録でなければ、測った日のずれ（「1日後」）をピルで添える。
 * 記録が見つからなければ「— 記録なし」と出す
 */
export const PhotoWeightValue = ({
	photoWeight,
	fontSize,
	lineHeight,
}: {
	photoWeight: PhotoWeight | null;
	fontSize: number;
	lineHeight: number;
}) => {
	if (photoWeight === null) {
		return (
			<XStack marginTop={2} gap={6} alignItems="baseline">
				<NumberText
					fontSize={fontSize}
					lineHeight={lineHeight}
					color="$onHero"
					opacity={0.7}
				>
					—
				</NumberText>
				<SizableText
					fontSize={11}
					fontWeight="600"
					color="$onHero"
					opacity={0.8}
				>
					記録なし
				</SizableText>
			</XStack>
		);
	}

	const offsetLabel = formatPhotoWeightOffset(photoWeight.offsetDays);

	return (
		<XStack marginTop={2} gap={4} alignItems="baseline">
			<NumberText fontSize={fontSize} lineHeight={lineHeight} color="$onHero">
				{photoWeight.weight.toFixed(1)}
			</NumberText>
			<SizableText fontSize={12} fontWeight="600" color="$onHero" opacity={0.9}>
				kg
			</SizableText>
			{offsetLabel !== null && (
				<SizableText
					marginLeft={2}
					height={OFFSET_PILL_HEIGHT}
					lineHeight={OFFSET_PILL_HEIGHT}
					paddingHorizontal={7}
					borderRadius={OFFSET_PILL_HEIGHT / 2}
					overflow="hidden"
					backgroundColor={OFFSET_PILL_BACKGROUND}
					fontSize={11}
					fontWeight="700"
					color="$onHero"
				>
					{offsetLabel}
				</SizableText>
			)}
		</XStack>
	);
};
