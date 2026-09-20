import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
import { LiftExerciseTabs } from "@/components/liftExerciseTabs";
import { addLiftRecord } from "@/services/liftRecordService";
import {
	type LiftExercise,
	MAX_REPS,
	RM_FORMULA_LABEL,
} from "@/services/oneRepMax";

/** レップ数の選択肢。換算の精度が落ちる 13 以上は選べないようにする */
const REPS_OPTIONS = Array.from({ length: MAX_REPS }, (_, index) => index + 1);

/** レップ数のボタンを並べる列数 */
const REPS_COLUMN_COUNT = 4;

export default function Add() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [exercise, setExercise] = useState<LiftExercise>("benchPress");
	const [weight, setWeight] = useState<string>("");
	/**
	 * レップ数。初期値を入れない
	 *
	 * 1 を初期値にすると、押し忘れたまま保存したときに 1 レップの記録として残り、
	 * 「本当に挙げられる重量」であるはずの実測 PR が汚れる
	 */
	const [reps, setReps] = useState<number | null>(null);
	const [performedAt, setPerformedAt] = useState<Date>(new Date());

	const weightNumber = Number(weight);
	// 記録を消す以外に直す手段がないので、あり得ない値は保存させない
	const canSave =
		weight !== "" &&
		Number.isFinite(weightNumber) &&
		weightNumber > 0 &&
		reps !== null;

	const { mutate: saveRecord, isPending } = useMutation({
		mutationFn: () => {
			if (reps === null) {
				throw new Error("レップ数が選ばれていません。");
			}

			return addLiftRecord({
				exercise,
				// 入力を弾かず、扱う桁に合わせて丸める
				weight: Math.round(weightNumber * 10) / 10,
				reps,
				performedAt,
			});
		},
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
			<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$6">
				<LiftExerciseTabs exercise={exercise} onChange={setExercise} />

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

				<YStack gap="$2">
					<Label htmlFor="reps">レップ数</Label>
					<XStack flexWrap="wrap" gap="$2">
						{REPS_OPTIONS.map((option) => (
							<Button
								key={option}
								// キーボードを出さずに選べるよう、1〜12 をそのまま並べる
								width={`${100 / REPS_COLUMN_COUNT - 3}%`}
								theme={option === reps ? "accent" : undefined}
								onPress={() => setReps(option)}
							>
								{/* Button が文字列の子しか Text で包まないため、数値のまま渡さない */}
								{String(option)}
							</Button>
						))}
					</XStack>
				</YStack>

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
						推定 1RM = {RM_FORMULA_LABEL[exercise]}
					</SizableText>
				</YStack>
			</YStack>
		</ScrollView>
	);
}
