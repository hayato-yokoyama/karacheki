import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Alert } from "react-native";
import {
	Button,
	Input,
	Label,
	ScrollView,
	SizableText,
	XStack,
	YStack,
} from "tamagui";
import { addLiftRecord } from "@/services/liftRecordService";
import {
	isLiftExercise,
	LIFT_EXERCISE_LABEL,
	MAX_REPS,
	RM_FORMULA_LABEL,
} from "@/services/oneRepMax";

/** 選べるレップ数の下限 */
const MIN_REPS = 1;

/**
 * レップ数の初期値
 *
 * 1 を初期値にすると、押し忘れたまま保存したときに 1 レップの記録として残り、
 * 「本当に挙げられる重量」であるはずの実測 PR が汚れる
 */
const DEFAULT_REPS = 5;

/** レップ数の表示幅。1 桁と 2 桁で ± ボタンの位置が動かないようにする */
const REPS_VALUE_WIDTH = 32;

export default function Add() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { exercise: exerciseParam } = useLocalSearchParams<{
		exercise?: string;
	}>();

	/**
	 * 記録する種目
	 *
	 * 一覧で選んでいる種目をそのまま記録する。ここで種目を選べると、
	 * ベンチプレスの一覧を見ながらデッドリフトを足せてしまう
	 */
	const exercise = isLiftExercise(exerciseParam) ? exerciseParam : "benchPress";

	const [weight, setWeight] = useState<string>("");
	const [reps, setReps] = useState<number>(DEFAULT_REPS);
	const [performedAt, setPerformedAt] = useState<Date>(new Date());

	const weightNumber = Number(weight);
	// 記録を消す以外に直す手段がないので、あり得ない値は保存させない
	const canSave =
		weight !== "" && Number.isFinite(weightNumber) && weightNumber > 0;

	const { mutate: saveRecord, isPending } = useMutation({
		mutationFn: () =>
			addLiftRecord({
				exercise,
				// 入力を弾かず、扱う桁に合わせて丸める
				weight: Math.round(weightNumber * 10) / 10,
				reps,
				performedAt,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["liftRecords"] });
			router.back();
		},
		onError: () => {
			Alert.alert("エラー", "記録の保存に失敗しました");
		},
	});

	// v9 で date が必須になったため、存在チェックは不要
	const handleDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
		setPerformedAt(date);
	};

	return (
		<ScrollView>
			{/* 何の種目を記録しているのかは、入力欄ではなくタイトルで示す */}
			<Stack.Screen
				options={{ title: `${LIFT_EXERCISE_LABEL[exercise]}の記録` }}
			/>
			<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$6">
				<XStack alignItems="center" justifyContent="space-between">
					<Label htmlFor="weight">重量（kg）</Label>
					<Input
						id="weight"
						placeholder="kg"
						keyboardType="numeric"
						value={weight}
						onChangeText={(text) => setWeight(text)}
						width="$12"
					/>
				</XStack>

				{/* 重量・実施日と同じ「ラベル + 右に入力」の行にして、数字の並びが
				    重量のキーパッドに見えないようにする */}
				<XStack alignItems="center" justifyContent="space-between">
					<Label htmlFor="reps">レップ数</Label>
					<XStack alignItems="center" gap="$3">
						<Button
							size="$3"
							circular
							icon={<Minus />}
							disabled={reps <= MIN_REPS}
							opacity={reps <= MIN_REPS ? 0.5 : 1}
							onPress={() => setReps(Math.max(MIN_REPS, reps - 1))}
						/>
						<SizableText
							size="$6"
							fontWeight="bold"
							width={REPS_VALUE_WIDTH}
							textAlign="center"
						>
							{String(reps)}
						</SizableText>
						<Button
							size="$3"
							circular
							icon={<Plus />}
							disabled={reps >= MAX_REPS}
							opacity={reps >= MAX_REPS ? 0.5 : 1}
							onPress={() => setReps(Math.min(MAX_REPS, reps + 1))}
						/>
					</XStack>
				</XStack>

				<XStack alignItems="center" justifyContent="space-between">
					<Label htmlFor="performedAt">実施日</Label>
					<RNDateTimePicker
						value={performedAt}
						mode="date"
						onValueChange={handleDateChange}
						locale="ja-JP"
					/>
				</XStack>

				<YStack gap="$3">
					<Button
						disabled={!canSave || isPending}
						opacity={canSave ? 1 : 0.5}
						onPress={() => {
							if (canSave) {
								saveRecord();
							}
						}}
					>
						記録を追加
					</Button>
					{/* 何が起きる入力なのかを、保存する前に見せておく */}
					<SizableText size="$1" color="$color11" textAlign="center">
						推定1RM = {RM_FORMULA_LABEL[exercise]}
					</SizableText>
				</YStack>
			</YStack>
		</ScrollView>
	);
}
