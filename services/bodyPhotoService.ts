import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Image } from "react-native";
import type { CropRect } from "@/services/cropRect";

/** Before/After 写真のメタデータの保存キー */
const STORAGE_KEY = "bodyPhotos";

/** 追加した写真をカメラロールにも保存するかどうかの保存キー（#66） */
const SAVE_TO_CAMERA_ROLL_KEY = "bodyPhotoSaveToCameraRoll";

/** 撮影画面で最後に選んだタイマーとカメラの保存キー */
const CAMERA_SETTINGS_KEY = "bodyPhotoCameraSettings";

/**
 * 保存する画像の長辺の上限（px）
 *
 * 一覧のセルは約130px、詳細は全画面（3x端末で約1200px）なのでこれで足りる。
 * iPhone の原寸のまま溜めると1枚で数MBになり、端末内に持ち続けるには重い
 */
const MAX_LONG_SIDE = 1440;

/**
 * 保存する JPEG の品質
 *
 * 取り込みは無圧縮（quality: 1）にして、トリミング後のここで1度だけ圧縮する。
 * 取り込みと保存で2回エンコードすると、そのぶん画質が落ちる
 */
const SAVE_COMPRESS = 0.8;

/** Before/After 写真のメタデータ */
export type BodyPhoto = {
	id: string;
	/** 実体ファイル名。写真ディレクトリからの相対 */
	fileName: string;
	/** 撮影日（ISO文字列）。一覧の並び順の基準 */
	takenAt: string;
	/** 保存日時（ISO文字列） */
	createdAt: string;
};

/**
 * 写真の保存先ディレクトリを返す
 *
 * アプリコンテナの絶対パスは再インストールやOSアップデートで変わるため、
 * メタデータには保存せず参照のたびに組み立てる
 */
const getPhotoDir = () => new Directory(Paths.document, "photos");

/** 写真の実体ファイルを指す。存在するかどうかは問わない */
const getPhotoFile = (fileName: string) => new File(getPhotoDir(), fileName);

/** 写真のメタデータから表示用のURIを組み立てる */
export const getBodyPhotoUri = (photo: BodyPhoto) =>
	getPhotoFile(photo.fileName).uri;

/** 写真の保存先ディレクトリを用意する */
const ensurePhotoDir = () => {
	getPhotoDir().create({ intermediates: true, idempotent: true });
};

/**
 * 写真の実体ファイルを消す。すでに無ければ何もしない
 *
 * 新 API の delete() は存在しないファイルに対して例外を投げるため、先に確かめる
 */
const deletePhotoFile = (fileName: string) => {
	const file = getPhotoFile(fileName);

	if (file.exists) {
		file.delete();
	}
};

/** メタデータを読み出す */
const readPhotoMeta = async (): Promise<BodyPhoto[]> => {
	const stored = await AsyncStorage.getItem(STORAGE_KEY);

	if (!stored) {
		return [];
	}

	try {
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? (parsed as BodyPhoto[]) : [];
	} catch {
		// 壊れた値が入っていても一覧を開けるようにする
		return [];
	}
};

/** メタデータを書き込む */
const writePhotoMeta = async (photos: BodyPhoto[]) => {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
};

/** 撮影日の降順（同じ撮影日なら保存日時の降順）に並べる */
const sortByTakenAtDesc = (photos: BodyPhoto[]) =>
	[...photos].sort((a, b) => {
		const takenAtDiff =
			new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();

		if (takenAtDiff !== 0) {
			return takenAtDiff;
		}

		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});

/**
 * 保存済みの写真を撮影日の降順で取得する
 *
 * 実体ファイルが失われたメタデータはここで取り除く
 */
export const listBodyPhotos = async () => {
	ensurePhotoDir();
	const storedPhotos = await readPhotoMeta();

	const existingPhotos = storedPhotos.filter(
		(photo) => getPhotoFile(photo.fileName).exists,
	);

	if (existingPhotos.length !== storedPhotos.length) {
		await writePhotoMeta(existingPhotos);
	}

	return sortByTakenAtDesc(existingPhotos);
};

/** 選択された画像をアプリ内にコピーして保存する */
export const addBodyPhoto = async (sourceUri: string, takenAt: Date) => {
	ensurePhotoDir();

	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	const fileName = `${id}.jpg`;

	await new File(sourceUri).copy(getPhotoFile(fileName));

	const photo: BodyPhoto = {
		id,
		fileName,
		takenAt: takenAt.toISOString(),
		createdAt: new Date().toISOString(),
	};

	try {
		const storedPhotos = await readPhotoMeta();
		await writePhotoMeta([...storedPhotos, photo]);
	} catch (error) {
		// メタデータを書けなかったら、参照されないファイルを残さない
		deletePhotoFile(fileName);
		throw error;
	}

	return photo;
};

/**
 * 写真をメタデータと実体ファイルの両方から削除する
 *
 * ファイルを先に消す。メタデータを先に消すと、ファイル削除に失敗したときに
 * 「失敗」と伝えながら削除は成立していて、参照されないファイルだけが残る
 */
export const deleteBodyPhoto = async (id: string) => {
	const storedPhotos = await readPhotoMeta();
	const target = storedPhotos.find((photo) => photo.id === id);

	if (target) {
		deletePhotoFile(target.fileName);
	}

	await writePhotoMeta(storedPhotos.filter((photo) => photo.id !== id));
};

/**
 * 追加した写真をカメラロールにも保存するかを読み出す（#66）
 *
 * 体の写真は人に見られたくないこともあるので、選ばれるまではアプリの中だけに置く
 */
export const getSaveToCameraRoll = async () =>
	(await AsyncStorage.getItem(SAVE_TO_CAMERA_ROLL_KEY)) === "true";

/** 追加した写真をカメラロールにも保存するかを書き込む。次の追加でもこの設定を使う */
export const setSaveToCameraRoll = async (value: boolean) => {
	await AsyncStorage.setItem(SAVE_TO_CAMERA_ROLL_KEY, String(value));
};

/** 撮影画面のセルフタイマーで選べる秒数。0 はタイマーを使わない */
export const CAMERA_TIMER_SECONDS = [0, 3, 10] as const;

export type CameraTimerSeconds = (typeof CAMERA_TIMER_SECONDS)[number];

/** 撮影に使うカメラ。`expo-camera` の `CameraType` と同じ値 */
export type CameraFacing = "front" | "back";

/** 撮影画面で最後に選んだタイマーとカメラ */
export type CameraSettings = {
	timerSeconds: CameraTimerSeconds;
	facing: CameraFacing;
};

/**
 * 撮影画面の初期値
 *
 * タイマーは純正カメラと同じく切っておく。
 * カメラは壁に立てかけて撮っても立ち位置を画面で確かめられるよう、前面にする
 */
export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
	timerSeconds: 0,
	facing: "front",
};

/**
 * 撮影画面で最後に選んだタイマーとカメラを読み出す
 *
 * 毎日同じ場所で撮るとき、開くたびに選び直さなくて済むようにする。
 * 壊れた値や選択肢に無い値は、項目ごとに初期値へ戻す
 */
export const getCameraSettings = async (): Promise<CameraSettings> => {
	const stored = await AsyncStorage.getItem(CAMERA_SETTINGS_KEY);

	if (!stored) {
		return DEFAULT_CAMERA_SETTINGS;
	}

	let parsed: Partial<Record<keyof CameraSettings, unknown>>;

	try {
		parsed = JSON.parse(stored) ?? {};
	} catch {
		return DEFAULT_CAMERA_SETTINGS;
	}

	return {
		timerSeconds:
			CAMERA_TIMER_SECONDS.find((seconds) => seconds === parsed.timerSeconds) ??
			DEFAULT_CAMERA_SETTINGS.timerSeconds,
		facing:
			parsed.facing === "front" || parsed.facing === "back"
				? parsed.facing
				: DEFAULT_CAMERA_SETTINGS.facing,
	};
};

/** 撮影画面で選んだタイマーとカメラを書き込む。次に開いたときもこれを使う */
export const setCameraSettings = async (settings: CameraSettings) => {
	await AsyncStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
};

/**
 * フォトライブラリへの追加の権限が下りていないことを、他の失敗と区別して伝える
 *
 * カメラと同じく、一度拒否されると OS はダイアログを出さないため、
 * 呼び出し側は「設定アプリから許可してほしい」と案内する必要がある
 */
export class MediaLibraryPermissionDeniedError extends Error {
	constructor() {
		super("写真への追加が許可されていません。");
		this.name = "MediaLibraryPermissionDeniedError";
	}
}

/**
 * 写真をカメラロール（端末の写真アプリ）に保存する（#66）
 *
 * 書き込みだけできればよいので、読み取りを含まない追加専用の権限を求める。
 * アプリ内の写真はそのまま残り、ここで作るのは写真アプリ側の複製
 */
export const saveBodyPhotoToCameraRoll = async (photo: BodyPhoto) => {
	const permission = await MediaLibrary.requestPermissionsAsync(true);

	if (!permission.granted) {
		throw new MediaLibraryPermissionDeniedError();
	}

	await MediaLibrary.Asset.create(getBodyPhotoUri(photo));
};

/**
 * EXIFの DateTimeOriginal（"YYYY:MM:DD HH:MM:SS"）を Date に変換する
 *
 * 取得できない・解釈できない場合は null を返す。
 * "0000:00:00 00:00:00" のような空欄プレースホルダは Date として成立して
 * しまう（1899年になる）ため、桁を読めただけでは通さず値の範囲も確かめる
 */
const parseExifDateTimeOriginal = (value: unknown) => {
	if (typeof value !== "string") {
		return null;
	}

	const matched = value.match(
		/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
	);

	if (!matched) {
		return null;
	}

	const [year, month, day, hours, minutes, seconds] = matched
		.slice(1)
		.map(Number);

	const date = new Date(year, month - 1, day, hours, minutes, seconds);

	// 繰り上がりで別の日付になっていないかで、範囲外の値をまとめて弾く
	const isInRange =
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day &&
		date.getHours() === hours &&
		date.getMinutes() === minutes &&
		date.getSeconds() === seconds;

	return isInRange ? date : null;
};

/** トリミングにかける前の、選ばれた・撮られた写真 */
export type PickedPhoto = {
	uri: string;
	takenAt: Date;
	/** 元画像の大きさ（px）。トリミングの座標計算に使う */
	width: number;
	height: number;
};

/**
 * 画像の大きさを求める
 *
 * ピッカーは width / height を 0 で返すことがある。0 のままでは
 * トリミングの倍率計算が成り立たないので、そのときだけ実ファイルから測る
 */
const resolveImageSize = (asset: ImagePicker.ImagePickerAsset) => {
	if (asset.width > 0 && asset.height > 0) {
		return Promise.resolve({ width: asset.width, height: asset.height });
	}

	return new Promise<{ width: number; height: number }>((resolve, reject) => {
		Image.getSize(
			asset.uri,
			(width, height) => resolve({ width, height }),
			reject,
		);
	});
};

/**
 * フォトライブラリから写真を1枚選ぶ
 *
 * 撮影日はEXIFから取り、取れなければ今日にフォールバックする
 */
export const pickBodyPhoto = async (): Promise<PickedPhoto | null> => {
	const result = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ["images"],
		allowsMultipleSelection: false,
		// トリミング後に1度だけ圧縮するため、ここでは落とさずに受け取る
		quality: 1,
		exif: true,
	});

	if (result.canceled) {
		return null;
	}

	const asset = result.assets.at(0);

	if (!asset) {
		return null;
	}

	return {
		uri: asset.uri,
		takenAt:
			parseExifDateTimeOriginal(asset.exif?.DateTimeOriginal) ?? new Date(),
		...(await resolveImageSize(asset)),
	};
};

/**
 * 切り抜いた画像を作る
 *
 * 保存されるのは切り抜いた後の1枚だけで、元の写真には触れない
 * （フォトライブラリの写真はそのまま、撮影したものはキャッシュに残る）
 */
export const cropBodyPhoto = async (uri: string, rect: CropRect) => {
	const context = ImageManipulator.manipulate(uri).crop(rect);

	// 上限より小さいものを引き伸ばしても粗くなるだけなので、超えるときだけ縮める
	const resized =
		Math.max(rect.width, rect.height) > MAX_LONG_SIDE
			? context.resize(
					rect.width >= rect.height
						? { width: MAX_LONG_SIDE }
						: { height: MAX_LONG_SIDE },
				)
			: context;

	const image = await resized.renderAsync();

	return image.saveAsync({
		compress: SAVE_COMPRESS,
		format: SaveFormat.JPEG,
	});
};

/** 一覧を撮影月で区切った1かたまり（#82） */
export type BodyPhotoMonth = {
	/** 月を一意に表すキー（"2026-09"）。セクションの key に使う */
	key: string;
	/** 見出しの文言（"2026年9月"） */
	label: string;
	photos: BodyPhoto[];
};

/**
 * 写真を撮影月ごとに区切る
 *
 * 渡された並び順をそのまま保つ。`listBodyPhotos` は撮影日の降順なので、
 * 月も月内の写真も新しい順に並ぶ
 */
export const groupBodyPhotosByMonth = (
	photos: readonly BodyPhoto[],
): BodyPhotoMonth[] => {
	const months: BodyPhotoMonth[] = [];

	for (const photo of photos) {
		const takenAt = new Date(photo.takenAt);
		const key = format(takenAt, "yyyy-MM");
		const last = months.at(-1);

		// 並び順を保つので、同じ月は必ず隣り合う。直前のかたまりだけ見れば足りる
		if (last?.key === key) {
			last.photos.push(photo);
			continue;
		}

		months.push({ key, label: format(takenAt, "yyyy年M月"), photos: [photo] });
	}

	return months;
};

/** 比較する2枚。`before` の方が撮影日が古い */
export type ComparedPhotos = {
	before: BodyPhoto;
	after: BodyPhoto;
};

/**
 * 比較する2枚のうち1枚を選び直す（#82）
 *
 * どちらを入れ替えるかは撮影日で決める。
 * 選んだ1枚が両方より新しければ After、両方より古ければ Before に入り、
 * 間なら撮影日が近い方と入れ替わる。こうすると Before → After の前後が崩れない
 */
export const replaceComparedPhoto = (
	compared: ComparedPhotos,
	picked: BodyPhoto,
): ComparedPhotos => {
	const { before, after } = compared;

	// すでに選ばれている1枚を選び直しても、比較する2枚は変わらない
	if (picked.id === before.id || picked.id === after.id) {
		return compared;
	}

	const pickedAt = new Date(picked.takenAt).getTime();
	const beforeAt = new Date(before.takenAt).getTime();
	const afterAt = new Date(after.takenAt).getTime();

	if (pickedAt <= beforeAt) {
		return { before: picked, after };
	}

	if (pickedAt >= afterAt) {
		return { before, after: picked };
	}

	// 2枚の間の撮影日なら、期間をなるべく残すために近い方と入れ替える
	return pickedAt - beforeAt <= afterAt - pickedAt
		? { before: picked, after }
		: { before, after: picked };
};
