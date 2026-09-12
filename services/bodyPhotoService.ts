import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
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
const getPhotoDir = () => new Directory(Paths.document, "photos");

/** 写真の実体ファイルを指す File を組み立てる */
const getPhotoFile = (fileName: string) => new File(getPhotoDir(), fileName);

/** 写真のメタデータから表示用のURIを組み立てる */
export const getBodyPhotoUri = (photo: BodyPhoto) =>
	getPhotoFile(photo.fileName).uri;

/** 写真の保存先ディレクトリを用意する */
const ensurePhotoDir = () => {
	const photoDir = getPhotoDir();

	// 既にあっても失敗させない
	photoDir.create({ intermediates: true, idempotent: true });

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
	const destination = getPhotoFile(fileName);

	await new File(sourceUri).copy(destination);

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
		if (destination.exists) {
			destination.delete();
		}
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
		const file = getPhotoFile(target.fileName);

		// 実体が既に無くてもメタデータは消せるようにする
		if (file.exists) {
			file.delete();
		}
	}

	await writePhotoMeta(storedPhotos.filter((photo) => photo.id !== id));
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

	const asset = result.assets.at(0);

	if (!asset) {
		return null;
	}

	return {
		uri: asset.uri,
		takenAt:
			parseExifDateTimeOriginal(asset.exif?.DateTimeOriginal) ?? new Date(),
	};
};
