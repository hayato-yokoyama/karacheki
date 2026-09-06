import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

/** Before/After 写真のメタデータの保存キー */
const STORAGE_KEY = "bodyPhotos";

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
const getPhotoDir = () => {
	const documentDirectory = FileSystem.documentDirectory;

	if (!documentDirectory) {
		throw new Error("写真の保存先を取得できませんでした。");
	}

	return `${documentDirectory}photos/`;
};

/** 写真のメタデータから表示用のURIを組み立てる */
export const getBodyPhotoUri = (photo: BodyPhoto) =>
	`${getPhotoDir()}${photo.fileName}`;

/** 写真の保存先ディレクトリを用意する */
const ensurePhotoDir = async () => {
	const photoDir = getPhotoDir();
	const info = await FileSystem.getInfoAsync(photoDir);

	if (!info.exists) {
		await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
	}

	return photoDir;
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
	const photoDir = await ensurePhotoDir();
	const storedPhotos = await readPhotoMeta();

	const existencePerPhoto = await Promise.all(
		storedPhotos.map(async (photo) => {
			const info = await FileSystem.getInfoAsync(
				`${photoDir}${photo.fileName}`,
			);
			return info.exists;
		}),
	);
	const existingPhotos = storedPhotos.filter(
		(_, index) => existencePerPhoto[index],
	);

	if (existingPhotos.length !== storedPhotos.length) {
		await writePhotoMeta(existingPhotos);
	}

	return sortByTakenAtDesc(existingPhotos);
};

/** 選択された画像をアプリ内にコピーして保存する */
export const addBodyPhoto = async (sourceUri: string, takenAt: Date) => {
	const photoDir = await ensurePhotoDir();

	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	const fileName = `${id}.jpg`;

	await FileSystem.copyAsync({
		from: sourceUri,
		to: `${photoDir}${fileName}`,
	});

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
		await FileSystem.deleteAsync(`${photoDir}${fileName}`, {
			idempotent: true,
		});
		throw error;
	}

	return photo;
};

/** 写真をメタデータと実体ファイルの両方から削除する */
export const deleteBodyPhoto = async (id: string) => {
	const photoDir = getPhotoDir();
	const storedPhotos = await readPhotoMeta();
	const target = storedPhotos.find((photo) => photo.id === id);

	await writePhotoMeta(storedPhotos.filter((photo) => photo.id !== id));

	if (target) {
		await FileSystem.deleteAsync(`${photoDir}${target.fileName}`, {
			idempotent: true,
		});
	}
};

/**
 * EXIFの DateTimeOriginal（"YYYY:MM:DD HH:MM:SS"）を Date に変換する
 *
 * 取得できない・解釈できない場合は null を返す
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

	const [, year, month, day, hours, minutes, seconds] = matched;
	const date = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hours),
		Number(minutes),
		Number(seconds),
	);

	return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * フォトライブラリから写真を1枚選ぶ
 *
 * 撮影日はEXIFから取り、取れなければ今日にフォールバックする
 */
export const pickBodyPhoto = async () => {
	const result = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ["images"],
		allowsMultipleSelection: false,
		quality: 0.8,
		exif: true,
	});

	if (result.canceled) {
		return null;
	}

	const asset = result.assets[0];

	return {
		uri: asset.uri,
		takenAt:
			parseExifDateTimeOriginal(asset.exif?.DateTimeOriginal) ?? new Date(),
	};
};
