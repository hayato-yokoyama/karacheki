import { Check } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { SizableText, useTheme, View, XStack } from "tamagui";

/** トーストを出しておく時間（ms） */
const TOAST_DURATION = 2000;
const TOAST_HEIGHT = 44;
const TOAST_ICON_SIZE = 24;
/**
 * 画面の下端からの位置
 *
 * デザインはタブバーの上から 107px。下部固定ボタン（52px ＋ 上下 12px）より上に出す
 */
const TOAST_BOTTOM = 107;

/**
 * 操作の結果を短く知らせるトースト（#66）
 *
 * 画面の下寄りに重ねて出し、しばらくすると消える。
 * 押しても何も起きないので、下の操作を邪魔しないよう触れないようにしておく
 */
const Toast = ({ message }: { message: string }) => {
	const theme = useTheme();

	return (
		<XStack
			position="absolute"
			left={0}
			right={0}
			bottom={TOAST_BOTTOM}
			justifyContent="center"
			pointerEvents="none"
		>
			<XStack
				height={TOAST_HEIGHT}
				borderRadius={TOAST_HEIGHT / 2}
				paddingLeft={12}
				paddingRight={18}
				gap={8}
				alignItems="center"
				backgroundColor="$toastBackground"
				shadowColor="rgba(0,0,0,0.25)"
				shadowOffset={{ width: 0, height: 10 }}
				shadowOpacity={1}
				shadowRadius={30}
				accessibilityRole="alert"
				accessibilityLiveRegion="polite"
			>
				<View
					width={TOAST_ICON_SIZE}
					height={TOAST_ICON_SIZE}
					borderRadius={TOAST_ICON_SIZE / 2}
					backgroundColor="$toastIcon"
					alignItems="center"
					justifyContent="center"
				>
					<Check color={theme.onHero.val} size={14} strokeWidth={3} />
				</View>
				<SizableText fontSize={14} fontWeight="700" color="$toastText">
					{message}
				</SizableText>
			</XStack>
		</XStack>
	);
};

/**
 * トーストを出す
 *
 * 戻り値の `toast` を画面の最後（ほかの要素より手前）に置き、`showToast` で出す。
 * 続けて出したときは、後の文言で時間を数え直す
 */
export const useToast = () => {
	const [message, setMessage] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = useCallback((nextMessage: string) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		setMessage(nextMessage);
		timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION);
	}, []);

	// 出している途中で画面を離れたら、消す予定だけ残さない
	useEffect(
		() => () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		},
		[],
	);

	return {
		showToast,
		toast: message === null ? null : <Toast message={message} />,
	};
};
