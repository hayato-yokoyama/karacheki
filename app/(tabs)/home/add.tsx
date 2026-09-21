import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Lightbulb, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Alert } from "react-native";
import { Input, SizableText, useTheme, View, XStack, YStack } from "tamagui";
import {
	BottomActionBar,
	NumberText,
	PrimaryButton,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SurfaceCard,
} from "@/components/ui";
import {
	fetchAllWeights,
	getLatestWeight,
	saveWeight,
} from "@/services/weightService";
import { layout, radius } from "@/theme/designTokens";

/** 体重の入力欄の高さ。数字の大きさに合わせる */
const WEIGHT_INPUT_SIZE = 76;

export default function Add() {
	const theme = useTheme();
	const router = useRouter();
	const queryClient = useQueryClient();

	const [weight, setWeight] = useState<string>("");
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	// ホームと同じキャッシュを見るので、前回の値を出すためだけの問い合わせは起きない
	const { data: weights } = useQuery({
		queryKey: ["weights", "all"],
		queryFn: fetchAllWeights,
	});

	const latestWeight = getLatestWeight(weights ?? []);

	// v9 で date が必須になったため、存在チェックは不要
	const handleDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
		setSelectedDate(date);
	};

	/** 数字とピリオド以外は受け付けない。テンキー以外のキーボードから入っても弾く */
	const handleChangeWeight = (text: string) => {
		setWeight(text.replace(/[^0-9.]/g, ""));
	};

	const weightNumber = Number(weight);
	const canSave =
		weight !== "" && Number.isFinite(weightNumber) && weightNumber > 0;

	const { mutate: addWeight, isPending } = useMutation({
		mutationFn: () => saveWeight(weightNumber, selectedDate),
		onSuccess: async () => {
			// 戻った先のホームに入力した値をすぐ反映する
			await queryClient.invalidateQueries({ queryKey: ["weights", "all"] });

			Alert.alert("完了", "体重を追加しました");
			router.back();
		},
		onError: () => {
			Alert.alert(
				"エラー",
				"体重の追加に失敗しました。  \n設定アプリからヘルスケアのアクセスが許可されていることを確認してください。",
			);
		},
	});

	// 保存中に二重で押されないよう、送信中も押せなくする
	const isDisabled = !canSave || isPending;

	return (
		<Screen>
			<ScreenScrollView withTabBar={false} withBottomAction>
				<ScreenHeader
					label="体重"
					title="体重を入力"
					right={
						<SurfaceCard
							width={layout.touchTargetHeight}
							height={layout.touchTargetHeight}
							borderRadius={layout.touchTargetHeight / 2}
							alignItems="center"
							justifyContent="center"
							accessibilityRole="button"
							accessibilityLabel="閉じる"
							pressStyle={{ opacity: 0.85 }}
							onPress={() => router.back()}
						>
							<X color={theme.textPrimary.val} size={22} strokeWidth={1.8} />
						</SurfaceCard>
					}
				/>

				<SurfaceCard padding={16} gap={8}>
					<XStack
						height={28}
						alignItems="center"
						justifyContent="space-between"
					>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							体重
						</SizableText>
						{latestWeight !== null && (
							<XStack
								height={28}
								paddingHorizontal={12}
								borderRadius={14}
								backgroundColor="$accentSoft"
								alignItems="center"
								gap={4}
							>
								<SizableText fontSize={12} fontWeight="700" color="$accent">
									前回
								</SizableText>
								<NumberText fontSize={15} color="$accent">
									{latestWeight.toFixed(1)}
								</NumberText>
								<SizableText fontSize={12} fontWeight="700" color="$accent">
									kg
								</SizableText>
							</XStack>
						)}
					</XStack>
					<XStack alignItems="baseline" gap={8}>
						<Input
							flex={1}
							unstyled
							height={WEIGHT_INPUT_SIZE}
							padding={0}
							borderWidth={0}
							backgroundColor="transparent"
							fontFamily="$numeric"
							fontSize={WEIGHT_INPUT_SIZE}
							lineHeight={WEIGHT_INPUT_SIZE}
							fontWeight="700"
							color="$textPrimary"
							placeholder="0.0"
							placeholderTextColor="$textPlaceholder"
							keyboardType="decimal-pad"
							value={weight}
							onChangeText={handleChangeWeight}
							accessibilityLabel="体重（kg）"
						/>
						<SizableText fontSize={22} fontWeight="500" color="$textMuted">
							kg
						</SizableText>
					</XStack>
				</SurfaceCard>

				<SurfaceCard paddingVertical={12} paddingHorizontal={16}>
					<XStack
						height={36}
						alignItems="center"
						justifyContent="space-between"
					>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							日時
						</SizableText>
						<RNDateTimePicker
							value={selectedDate}
							mode="datetime"
							onValueChange={handleDateChange}
							locale="ja-JP"
						/>
					</XStack>
				</SurfaceCard>

				<XStack
					borderRadius={radius.card}
					backgroundColor="$accentSoft"
					paddingVertical={14}
					paddingHorizontal={16}
					gap={12}
					alignItems="flex-start"
				>
					<View
						width={32}
						height={32}
						borderRadius={16}
						backgroundColor="$cardBackground"
						alignItems="center"
						justifyContent="center"
					>
						<Lightbulb color={theme.accent.val} size={18} strokeWidth={2} />
					</View>
					<YStack flex={1} gap={3}>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							体重の自動入力をお勧めしています
						</SizableText>
						<SizableText fontSize={12} lineHeight={19} color="$textMuted">
							スマート体重計を用意してスマホを連携すれば、体重測定するだけでスマホに自動で記録できます。
						</SizableText>
					</YStack>
				</XStack>
			</ScreenScrollView>

			<BottomActionBar withTabBar={false}>
				<PrimaryButton
					disabled={isDisabled}
					icon={
						<Plus
							color={isDisabled ? theme.textMuted.val : theme.onAccentFill.val}
							size={20}
							strokeWidth={2.2}
						/>
					}
					onPress={() => addWeight()}
				>
					体重を追加
				</PrimaryButton>
			</BottomActionBar>
		</Screen>
	);
}
