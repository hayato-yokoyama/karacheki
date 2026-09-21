import * as Linking from "expo-linking";
import {
	Check,
	ExternalLink,
	Heart,
	type LucideIcon,
	Settings,
} from "lucide-react-native";
import { Button, SizableText, useTheme, View, XStack, YStack } from "tamagui";
import { NumberText, SurfaceCard } from "@/components/ui";
import { radius } from "@/theme/designTokens";

/** 体重が無いときにヒーローの位置へ出すプレースホルダ */
export type WeightPlaceholder = {
	/** カード左上のラベル。ホームなら「今週の平均」 */
	label: string;
	/** 対象期間（`9/15 – 9/21`） */
	periodLabel: string;
};

export type EmptyWeightCardProps = {
	/**
	 * 数値のプレースホルダ（`--.--`）を見せるか
	 *
	 * ホームはヒーローの代わりに置くので渡す。
	 * 主役の数値が別にある画面では渡さず、案内文だけにする
	 */
	placeholder?: WeightPlaceholder;
};

/** ヘルスケアの許可設定の手順 */
const PERMISSION_STEPS = [
	"iPhoneの「設定」アプリを開く",
	"「アプリ」→「ヘルスケア」を選択",
	"「データアクセスとデバイス」を選択",
	"「からチェキ」を選択",
	"「すべてオンにする」を選択",
] as const;

/** 手順の番号を入れる丸の大きさ */
const STEP_MARKER_SIZE = 24;

/**
 * 体重データが取れないことを伝えるカード（#78）
 *
 * 実データのカードと同じ形に破線の枠を当てて、
 * 「まだ入っていないだけ」だと分かるようにする
 */
export const EmptyWeightCard = ({ placeholder }: EmptyWeightCardProps) => (
	<YStack
		borderRadius={radius.hero}
		borderWidth={2}
		borderColor="$textPlaceholder"
		borderStyle="dashed"
		paddingHorizontal={20}
		paddingTop={16}
		paddingBottom={14}
		gap={6}
	>
		{placeholder !== undefined && (
			<>
				<XStack alignItems="center" justifyContent="space-between">
					<View
						height={26}
						paddingHorizontal={12}
						borderRadius={13}
						backgroundColor="$segmentTrack"
						justifyContent="center"
					>
						<SizableText fontSize={13} fontWeight="700" color="$textMuted">
							{placeholder.label}
						</SizableText>
					</View>
					<SizableText fontSize={12} color="$textMuted">
						{placeholder.periodLabel}
					</SizableText>
				</XStack>
				<XStack alignItems="baseline" gap={4}>
					<NumberText fontSize={68} lineHeight={66} color="$textPlaceholder">
						--.--
					</NumberText>
					<SizableText fontSize={20} fontWeight="500" color="$textPlaceholder">
						kg
					</SizableText>
				</XStack>
			</>
		)}
		<YStack
			borderTopWidth={placeholder === undefined ? 0 : 1}
			borderColor="$textPlaceholder"
			borderStyle="dashed"
			marginTop={placeholder === undefined ? 0 : 4}
			paddingTop={placeholder === undefined ? 0 : 10}
		>
			<SizableText fontSize={13} lineHeight={20} color="$textMuted">
				<SizableText fontSize={13} fontWeight="700" color="$textPrimary">
					体重データを取得できませんでした。
				</SizableText>
				{"\n"}
				体重を入力するか、ヘルスケアの許可を確認してください。
			</SizableText>
		</YStack>
	</YStack>
);

/** 手順の 1 行 */
const PermissionStep = ({
	step,
	index,
	isLast,
}: {
	step: string;
	index: number;
	isLast: boolean;
}) => {
	const theme = useTheme();

	return (
		<XStack alignItems="flex-start" gap={12} paddingBottom={isLast ? 0 : 14}>
			{/* 手順同士をつなぐ縦線。最後の手順の下には引かない */}
			{!isLast && (
				<View
					position="absolute"
					left={STEP_MARKER_SIZE / 2 - 1}
					top={STEP_MARKER_SIZE + 2}
					bottom={-2}
					width={2}
					borderRadius={1}
					backgroundColor="$cardBorder"
				/>
			)}
			<View
				width={STEP_MARKER_SIZE}
				height={STEP_MARKER_SIZE}
				borderRadius={STEP_MARKER_SIZE / 2}
				backgroundColor={isLast ? "$accentFill" : "$accentSoft"}
				alignItems="center"
				justifyContent="center"
			>
				{isLast ? (
					<Check color={theme.onAccentFill.val} size={14} strokeWidth={3} />
				) : (
					<NumberText fontSize={15} lineHeight={15} color="$accent">
						{index + 1}
					</NumberText>
				)}
			</View>
			<SizableText flex={1} fontSize={14} lineHeight={24} color="$textMuted">
				{step}
			</SizableText>
		</XStack>
	);
};

/** 淡色ボタンのアイコン。文字と同じアクセント色で描く */
const SoftButtonIcon = ({
	icon: Icon,
	size,
}: {
	icon: LucideIcon;
	size: number;
}) => {
	const theme = useTheme();

	return <Icon color={theme.accent.val} size={size} strokeWidth={2} />;
};

/**
 * ヘルスケアの許可設定を案内するカード（#78）
 *
 * アプリからは許可を書き換えられないので、端末の設定まで手順で連れていく
 */
export const HealthPermissionGuide = () => {
	const theme = useTheme();

	return (
		<SurfaceCard padding={16}>
			<XStack alignItems="center" gap={8} marginBottom={14}>
				<View
					width={28}
					height={28}
					borderRadius={14}
					backgroundColor="$accentSoft"
					alignItems="center"
					justifyContent="center"
				>
					<Heart color={theme.accent.val} size={15} strokeWidth={2.2} />
				</View>
				<SizableText fontSize={15} fontWeight="800" color="$textPrimary">
					ヘルスケアの許可設定
				</SizableText>
			</XStack>
			<YStack>
				{PERMISSION_STEPS.map((step, index) => (
					<PermissionStep
						key={step}
						step={step}
						index={index}
						isLast={index === PERMISSION_STEPS.length - 1}
					/>
				))}
			</YStack>
			<Button
				marginTop={16}
				height={44}
				borderRadius={22}
				borderWidth={0}
				backgroundColor="$accentSoft"
				color="$accent"
				fontSize={14}
				fontWeight="700"
				pressStyle={{ backgroundColor: "$accentSoft", opacity: 0.85 }}
				onPress={() => Linking.openSettings()}
				icon={<SoftButtonIcon icon={Settings} size={18} />}
				iconAfter={<SoftButtonIcon icon={ExternalLink} size={15} />}
			>
				設定アプリを開く
			</Button>
		</SurfaceCard>
	);
};

/**
 * 体重データが取れないときの画面の中身
 *
 * 案内文と許可設定の手順をまとめたもの。
 * ホームはヒーローの位置にプレースホルダを出すため、2 つを自分で並べる
 */
export const ErrorHealthData = () => (
	<>
		<EmptyWeightCard />
		<HealthPermissionGuide />
	</>
);
