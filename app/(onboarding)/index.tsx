import { Button, Image, useTheme } from "tamagui";
import Onboarding from "react-native-onboarding-swiper";
import { Link } from "expo-router";
import { Dimensions } from "react-native";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

export default function Index() {
	const theme = useTheme();

	return (
		<Onboarding
			DoneButtonComponent={() => {
				return (
					<Button margin="$4">
						<Link href="/(tabs)/home">はじめる</Link>
					</Button>
				);
			}}
			showSkip={false}
			nextLabel="次へ"
			bottomBarHighlight={false}
			pages={[
				{
					backgroundColor: theme.background.val,
					image: (
						<LottieView
							autoPlay
							loop
							style={{
								width: width * 0.9,
								height: width,
							}}
							source={require("@/assets/lottie/graph.json")}
						/>
					),
					title: "からチェキへようこそ！",
					subtitle: "からチェキは、\n正しいボディメイクの考え方へ導きます",
				},
				{
					backgroundColor: theme.background.val,
					image: (
						<Image
							source={{
								uri: require("@/assets/images/weight-scale.png"),
								width: width * 0.9,
								height: width * 0.9,
							}}
							objectFit="contain"
						/>
					),
					title: "同じ時間に体重を測る",
					subtitle: "スマホ連携できる体重計で、簡単に測定する",
				},
				{
					backgroundColor: theme.background.val,
					image: (
						<Image
							source={{
								uri: require("@/assets/images/push-notification-overview.png"),
								width: width,
								height: width,
							}}
							objectFit="contain"
						/>
					),
					title: "毎朝の通知で\n平均の推移を把握する",
					subtitle:
						"1日単位の数値にとらわれず、\n毎朝の通知で週ごとの傾向を確認し、\n正しいボディメイクを続けよう。",
				},
				{
					backgroundColor: theme.background.val,
					image: (
						<Image
							source={{
								uri: require("@/assets/images/graph.png"),
								width: width,
								height: width,
							}}
							objectFit="contain"
						/>
					),
					title: "グラフで長期的な\n変化の傾向をつかむ",
					subtitle:
						"緩やかな変化や停滞を可視化して、\n長期的な視点で正しいボディメイクを\nサポートします。",
				},
			]}
		/>
	);
}
