import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

/** 重量の列の幅。見出しの「kg/回数」が収まる幅 */
const WEIGHT_COLUMN_WIDTH = 56;

/** レップ数の列の幅。横スクロールなしで 8 列ぶん見える幅 */
const REP_COLUMN_WIDTH = 40;

/** 表の左右の余白 */
const TABLE_PADDING = 12;

/**
 * 1 行おきに敷く色
 *
 * 列が多いと横に目が滑るので縞を入れる。テーマのトークンは明暗で意味が
 * 変わるため、どちらでも薄く乗る不透明度の低いグレーを直接指定する
 */
const ZEBRA_BACKGROUND = "rgba(127, 127, 127, 0.09)";

/** 表の重量表示。刻みが 2.5kg なので、半端なときだけ小数を出す */
const formatTableWeight = (weight: number) =>
	Number.isInteger(weight) ? String(weight) : weight.toFixed(1);

/**
 * RM 換算表
 *
 * 「100kg を挙げるなら今の 85kg を何レップやればいいか」を逆に引くためのもの。
 * 目的の行の前後も同時に見えるので、狙うレップ数まで決められる
 */
export default function Table() {
	const insets = useSafeAreaInsets();
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
			</YStack>

			{/* 列が画面に収まりきらないので、表ごと横にスクロールさせる */}
			<ScrollView horizontal style={{ flex: 1 }}>
				<YStack>
					{/* 見出しは縦スクロールの外に置き、行を追っている間もレップ数が見えるようにする */}
					<XStack
						paddingHorizontal={TABLE_PADDING}
						paddingVertical="$2"
						borderBottomWidth={1}
						borderBottomColor="$color11"
					>
						<SizableText
							size="$1"
							fontWeight="bold"
							width={WEIGHT_COLUMN_WIDTH}
						>
							kg/回数
						</SizableText>
						{RM_TABLE_REPS.map((reps) => (
							<SizableText
								key={reps}
								size="$1"
								fontWeight="bold"
								width={REP_COLUMN_WIDTH}
								textAlign="center"
							>
								{String(reps)}
							</SizableText>
						))}
					</XStack>

					<FlatList
						style={{ flex: 1 }}
						data={RM_TABLE_WEIGHTS}
						keyExtractor={(weight) => String(weight)}
						// 最後の行がホームインジケータに隠れないようにする
						contentContainerStyle={{ paddingBottom: insets.bottom }}
						renderItem={({ item, index }) => (
							<TableRow
								exercise={exercise}
								weight={item}
								isStriped={index % 2 === 1}
							/>
						)}
					/>
				</YStack>
			</ScrollView>
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
	<XStack
		paddingVertical="$2"
		paddingHorizontal={TABLE_PADDING}
		backgroundColor={isStriped ? ZEBRA_BACKGROUND : undefined}
	>
		<SizableText size="$1" fontWeight="bold" width={WEIGHT_COLUMN_WIDTH}>
			{formatTableWeight(weight)}
		</SizableText>
		{buildRmTableRow(exercise, weight).map((value, index) => (
			<SizableText
				key={RM_TABLE_REPS[index]}
				size="$1"
				color="$color11"
				width={REP_COLUMN_WIDTH}
				textAlign="center"
			>
				{String(value)}
			</SizableText>
		))}
	</XStack>
);
