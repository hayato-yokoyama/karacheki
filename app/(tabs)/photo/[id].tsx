import {
	deleteBodyPhoto,
	getBodyPhotoUri,
	listBodyPhotos,
} from "@/services/bodyPhotoService";
import { Trash2 } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image } from "react-native";
import { Button, Paragraph, SizableText, Spinner, YStack } from "tamagui";

export default function PhotoDetail() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { id } = useLocalSearchParams<{ id: string }>();

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	const photo = photos?.find((item) => item.id === id);

	const { mutate: removePhoto, isPending } = useMutation({
		mutationFn: () => deleteBodyPhoto(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["bodyPhotos"] });
			router.back();
		},
		onError: () => {
			Alert.alert("エラー", "写真の削除に失敗しました");
		},
	});

	const handlePressDelete = () => {
		Alert.alert("写真を削除しますか？", "削除した写真は元に戻せません。", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "削除",
				style: "destructive",
				onPress: () => removePhoto(),
			},
		]);
	};

	if (isLoading) {
		return (
			<YStack flex={1} alignItems="center" justifyContent="center">
				<Spinner size="small" />
			</YStack>
		);
	}

	// 読み込みに失敗したときに「削除された」と誤解させない
	if (error) {
		return (
			<YStack paddingVertical="$8" paddingHorizontal="$4">
				<Paragraph>写真を読み込めませんでした。</Paragraph>
			</YStack>
		);
	}

	// 一覧から削除された直後などに到達しうる
	if (!photo) {
		return (
			<YStack paddingVertical="$8" paddingHorizontal="$4">
				<Paragraph>写真が見つかりませんでした。</Paragraph>
			</YStack>
		);
	}

	const takenAt = format(new Date(photo.takenAt), "yyyy年M月d日");

	return (
		<>
			<Stack.Screen options={{ title: takenAt }} />
			<YStack flex={1} padding="$4" gap="$4">
				<Image
					source={{ uri: getBodyPhotoUri(photo) }}
					style={{ flex: 1, width: "100%", borderRadius: 8 }}
					resizeMode="contain"
				/>
				<SizableText textAlign="center">{takenAt}</SizableText>
				<Button
					icon={<Trash2 color="$red10" />}
					color="$red10"
					onPress={handlePressDelete}
					disabled={isPending}
				>
					削除する
				</Button>
			</YStack>
		</>
	);
}
