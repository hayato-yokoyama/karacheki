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
					borderBottomColor="$borderColor"
				>
					<SizableText size="$1" color="$color11" width={WEIGHT_COLUMN_WIDTH}>
						kg
					</SizableText>
					{RM_TABLE_REPS.map((reps) => (
						<SizableText
							key={reps}
							size="$1"
							color="$color11"
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
				contentContainerStyle={{ paddingHorizontal: TABLE_PADDING }}
				renderItem={({ item }) => (
					<TableRow exercise={exercise} weight={item} />
				)}
			/>
		</YStack>
	);
}

/** 換算表の 1 行 */
const TableRow = ({
	exercise,
	weight,
}: {
	exercise: LiftExercise;
	weight: number;
}) => (
	<XStack
		paddingVertical="$2"
		borderBottomWidth={1}
		borderBottomColor="$borderColor"
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
