import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList } from "react-native";
import { SizableText, XStack, YStack } from "tamagui";
import {
	buildRmTableRow,
	isLiftExercise,
	LIFT_EXERCISE_LABEL,
	type LiftExercise,
	RM_FORMULA_LABEL,
	RM_TABLE_REPS,
	RM_TABLE_WEIGHTS,
} from "@/services/oneRepMax";

/** 重量の列の幅。「297.5」の 5 文字が収まる幅 */
const WEIGHT_COLUMN_WIDTH = 52;

/** 表の左右の余白 */
const TABLE_PADDING = 12;

/**
 * 1 行おきに敷く色
 *
 * 12 列を横に追うと目が滑るので縞を入れる。テーマのトークンは明暗で意味が
 * 変わるため、どちらでも薄く乗る不透明度の低いグレーを直接指定する
 */
const ZEBRA_BACKGROUND = "rgba(127, 127, 127, 0.09)";

/**
 * RM 換算表
 *
 * 「100kg を挙げるなら今の 85kg を何レップやればいいか」を逆に引くためのもの。
 * 目的の行の前後も同時に見えるので、狙うレップ数まで決められる
 */
export default function Table() {
	const { exercise: exerciseParam } = useLocalSearchParams<{
		exercise?: string;
	}>();
	const exercise = isLiftExercise(exerciseParam) ? exerciseParam : "benchPress";

	return (
		<YStack flex={1}>
			<Stack.Screen
				options={{ title: `換算表（${LIFT_EXERCISE_LABEL[exercise]}）` }}
			/>

			<YStack paddingHorizontal={TABLE_PADDING} paddingTop="$3">
				<SizableText size="$1" color="$color11">
					推定1RM は {RM_FORMULA_LABEL[exercise]} で換算
				</SizableText>

				{/* 見出しはスクロールの外に置き、行を追っている間もレップ数が見えるようにする */}
				<XStack
					paddingVertical="$2"
					borderBottomWidth={1}
					borderBottomColor="$color11"
				>
					<SizableText size="$1" fontWeight="bold" width={WEIGHT_COLUMN_WIDTH}>
						kg
					</SizableText>
					{RM_TABLE_REPS.map((reps) => (
						<SizableText
							key={reps}
							size="$1"
							fontWeight="bold"
							flex={1}
							textAlign="center"
						>
							{String(reps)}
						</SizableText>
					))}
				</XStack>
			</YStack>

			<FlatList
				data={RM_TABLE_WEIGHTS}
				keyExtractor={(weight) => String(weight)}
				renderItem={({ item, index }) => (
					<TableRow
						exercise={exercise}
						weight={item}
						isStriped={index % 2 === 1}
					/>
				)}
			/>
		</YStack>
	);
}

/** 換算表の 1 行 */
const TableRow = ({
	exercise,
	weight,
	isStriped,
}: {
	exercise: LiftExercise;
	weight: number;
	isStriped: boolean;
}) => (
	// 縞が画面の端まで届くよう、左右の余白は行の内側で取る
	<XStack
		paddingVertical="$2"
		paddingHorizontal={TABLE_PADDING}
		backgroundColor={isStriped ? ZEBRA_BACKGROUND : undefined}
	>
		<SizableText size="$1" fontWeight="bold" width={WEIGHT_COLUMN_WIDTH}>
			{weight.toFixed(1)}
		</SizableText>
		{buildRmTableRow(exercise, weight).map((value, index) => (
			<SizableText
				key={RM_TABLE_REPS[index]}
				size="$1"
				color="$color11"
				flex={1}
				textAlign="center"
			>
				{String(value)}
			</SizableText>
		))}
	</XStack>
);
