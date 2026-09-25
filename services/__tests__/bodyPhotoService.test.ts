import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import {
	addBodyPhoto,
	DEFAULT_CAMERA_SETTINGS,
	deleteBodyPhoto,
	getBodyPhotoUri,
	getCameraSettings,
	getSaveToCameraRoll,
	groupBodyPhotosByMonth,
	listBodyPhotos,
	MediaLibraryPermissionDeniedError,
	replaceComparedPhoto,
	saveBodyPhotoToCameraRoll,
	setCameraSettings,
	setSaveToCameraRoll,
} from "@/services/bodyPhotoService";

jest.mock("@react-native-async-storage/async-storage", () => ({
	getItem: jest.fn(),
	setItem: jest.fn(),
}));

/** File / Directory のモックが持つ、URI だけの形 */
type MockEntry = { uri: string };

/** 端末上に存在するファイル・ディレクトリの URI。テストごとに中身を入れ替える */
const mockExistingUris = new Set<string>();

// File / Directory は URI を組み立てるだけで、実在するかは mockExistingUris で決める。
// 組み立て方は実物と同じく「親の URI + "/" + 名前」にする
jest.mock("expo-file-system", () => {
	const join = (...parts: (string | MockEntry)[]) =>
		parts
			.map((part) => (typeof part === "string" ? part : part.uri))
			.map((part) => part.replace(/\/+$/, ""))
			.join("/");

	class MockFile {
		uri: string;

		constructor(...parts: (string | MockEntry)[]) {
			this.uri = join(...parts);
		}

		get exists() {
			return mockExistingUris.has(this.uri);
		}

		async copy(destination: MockEntry) {
			if (!this.exists) {
				throw new Error(`コピー元がありません: ${this.uri}`);
			}
			mockExistingUris.add(destination.uri);
		}

		delete() {
			if (!this.exists) {
				throw new Error(`削除するファイルがありません: ${this.uri}`);
			}
			mockExistingUris.delete(this.uri);
		}
	}

	class MockDirectory extends MockFile {
		create() {
			mockExistingUris.add(this.uri);
		}
	}

	return {
		File: MockFile,
		Directory: MockDirectory,
		Paths: { document: new MockDirectory("file:///documents/") },
	};
});
jest.mock("expo-image-manipulator", () => ({
	ImageManipulator: { manipulate: jest.fn() },
	SaveFormat: { JPEG: "jpeg" },
}));
jest.mock("expo-image-picker", () => ({
	launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-media-library", () => ({
	requestPermissionsAsync: jest.fn(),
	Asset: { create: jest.fn() },
}));

/** 撮影日だけが違う写真を作る。並び順と月の区切りの検証に使う */
const photo = (id: string, takenAt: string): BodyPhoto => ({
	id,
	fileName: `${id}.jpg`,
	takenAt: new Date(takenAt).toISOString(),
	createdAt: new Date("2026-09-21T00:00:00+09:00").toISOString(),
});

describe("groupBodyPhotosByMonth", () => {
	test("撮影月ごとに区切り、渡された並び順を保つ", () => {
		const months = groupBodyPhotosByMonth([
			photo("a", "2026-09-21T09:00:00+09:00"),
			photo("b", "2026-09-16T09:00:00+09:00"),
			photo("c", "2025-04-20T09:00:00+09:00"),
			photo("d", "2025-04-12T09:00:00+09:00"),
		]);

		expect(months.map((month) => month.label)).toEqual([
			"2026年9月",
			"2025年4月",
		]);
		expect(months.map((month) => month.photos.map(({ id }) => id))).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	test("同じ月でも年が違えば別のかたまりにする", () => {
		const months = groupBodyPhotosByMonth([
			photo("a", "2026-04-01T09:00:00+09:00"),
			photo("b", "2025-04-01T09:00:00+09:00"),
		]);

		expect(months.map((month) => month.key)).toEqual(["2026-04", "2025-04"]);
	});

	test("写真が無ければ空の配列を返す", () => {
		expect(groupBodyPhotosByMonth([])).toEqual([]);
	});
});

describe("replaceComparedPhoto", () => {
	const before = photo("before", "2025-04-12T09:00:00+09:00");
	const after = photo("after", "2025-04-20T09:00:00+09:00");
	const compared = { before, after };

	test("2枚より新しい写真を選ぶと After が入れ替わる", () => {
		const picked = photo("newer", "2026-09-21T09:00:00+09:00");

		expect(replaceComparedPhoto(compared, picked)).toEqual({
			before,
			after: picked,
		});
	});

	test("2枚より古い写真を選ぶと Before が入れ替わる", () => {
		const picked = photo("older", "2024-01-01T09:00:00+09:00");

		expect(replaceComparedPhoto(compared, picked)).toEqual({
			before: picked,
			after,
		});
	});

	test("2枚の間の写真は、撮影日が近い方と入れ替わる", () => {
		const nearBefore = photo("nearBefore", "2025-04-14T09:00:00+09:00");
		const nearAfter = photo("nearAfter", "2025-04-19T09:00:00+09:00");

		expect(replaceComparedPhoto(compared, nearBefore)).toEqual({
			before: nearBefore,
			after,
		});
		expect(replaceComparedPhoto(compared, nearAfter)).toEqual({
			before,
			after: nearAfter,
		});
	});

	test("すでに選ばれている写真を選んでも2枚は変わらない", () => {
		expect(replaceComparedPhoto(compared, before)).toBe(compared);
		expect(replaceComparedPhoto(compared, after)).toBe(compared);
	});

	test("入れ替えた後も Before の方が古いままになる", () => {
		const picked = photo("between", "2025-04-16T09:00:00+09:00");
		const next = replaceComparedPhoto(compared, picked);

		expect(new Date(next.before.takenAt).getTime()).toBeLessThan(
			new Date(next.after.takenAt).getTime(),
		);
	});
});

describe("カメラロールにも保存する設定", () => {
	const getItem = jest.mocked(AsyncStorage.getItem);
	const setItem = jest.mocked(AsyncStorage.setItem);

	beforeEach(() => {
		getItem.mockReset();
		setItem.mockReset();
	});

	test("まだ選ばれていなければ保存しない", async () => {
		getItem.mockResolvedValue(null);

		await expect(getSaveToCameraRoll()).resolves.toBe(false);
	});

	test("書き込んだ値を読み出せる", async () => {
		await setSaveToCameraRoll(true);
		const [key, value] = setItem.mock.calls[0];
		getItem.mockImplementation(async (readKey) =>
			readKey === key ? value : null,
		);

		await expect(getSaveToCameraRoll()).resolves.toBe(true);
	});
});

describe("撮影画面のタイマーとカメラの設定", () => {
	const getItem = jest.mocked(AsyncStorage.getItem);
	const setItem = jest.mocked(AsyncStorage.setItem);

	beforeEach(() => {
		getItem.mockReset();
		setItem.mockReset();
	});

	test("まだ選ばれていなければ、タイマーなし・前面カメラで撮る", async () => {
		getItem.mockResolvedValue(null);

		await expect(getCameraSettings()).resolves.toEqual({
			timerSeconds: 0,
			facing: "front",
		});
	});

	test("書き込んだ値を読み出せる", async () => {
		await setCameraSettings({ timerSeconds: 10, facing: "back" });
		const [key, value] = setItem.mock.calls[0];
		getItem.mockImplementation(async (readKey) =>
			readKey === key ? value : null,
		);

		await expect(getCameraSettings()).resolves.toEqual({
			timerSeconds: 10,
			facing: "back",
		});
	});

	test("選択肢に無い値は、その項目だけ初期値に戻す", async () => {
		getItem.mockResolvedValue(
			JSON.stringify({ timerSeconds: 5, facing: "back" }),
		);

		await expect(getCameraSettings()).resolves.toEqual({
			timerSeconds: DEFAULT_CAMERA_SETTINGS.timerSeconds,
			facing: "back",
		});
	});

	test("壊れた値が入っていても初期値で撮れる", async () => {
		getItem.mockResolvedValue("{");

		await expect(getCameraSettings()).resolves.toEqual(DEFAULT_CAMERA_SETTINGS);
	});
});

describe("saveBodyPhotoToCameraRoll", () => {
	const requestPermissions = jest.mocked(MediaLibrary.requestPermissionsAsync);
	const createAsset = jest.mocked(MediaLibrary.Asset.create);

	beforeEach(() => {
		requestPermissions.mockReset();
		createAsset.mockReset();
	});

	test("追加専用の権限を求めて、アプリ内の実体ファイルを保存する", async () => {
		requestPermissions.mockResolvedValue({
			granted: true,
		} as MediaLibrary.PermissionResponse);

		await saveBodyPhotoToCameraRoll(photo("a", "2026-09-21T09:00:00+09:00"));

		expect(requestPermissions).toHaveBeenCalledWith(true);
		expect(createAsset).toHaveBeenCalledWith("file:///documents/photos/a.jpg");
	});

	test("権限が無ければ保存せず、権限の失敗として知らせる", async () => {
		requestPermissions.mockResolvedValue({
			granted: false,
		} as MediaLibrary.PermissionResponse);

		await expect(
			saveBodyPhotoToCameraRoll(photo("a", "2026-09-21T09:00:00+09:00")),
		).rejects.toBeInstanceOf(MediaLibraryPermissionDeniedError);
		expect(createAsset).not.toHaveBeenCalled();
	});
});

describe("写真の保存先", () => {
	test("アプリの Documents 配下の photos に、ファイル名をつないで組み立てる", () => {
		// 移行前（expo-file-system/legacy）と同じ場所を指していないと、
		// 既存ユーザーの写真が見つからずメタデータごと消えてしまう
		expect(getBodyPhotoUri(photo("a", "2026-09-21T09:00:00+09:00"))).toBe(
			"file:///documents/photos/a.jpg",
		);
	});
});

describe("写真の一覧・追加・削除", () => {
	const getItem = jest.mocked(AsyncStorage.getItem);
	const setItem = jest.mocked(AsyncStorage.setItem);

	/** AsyncStorage に保存されているメタデータ */
	let storedMeta: string | null;

	beforeEach(() => {
		mockExistingUris.clear();
		storedMeta = null;
		getItem.mockReset();
		setItem.mockReset();
		getItem.mockImplementation(async () => storedMeta);
		setItem.mockImplementation(async (_, value) => {
			storedMeta = value;
		});
	});

	const storePhotos = (photos: BodyPhoto[]) => {
		storedMeta = JSON.stringify(photos);
		for (const { fileName } of photos) {
			mockExistingUris.add(`file:///documents/photos/${fileName}`);
		}
	};

	const storedIds = () =>
		(JSON.parse(storedMeta ?? "[]") as BodyPhoto[]).map(({ id }) => id);

	test("保存済みの写真を撮影日の新しい順に返す", async () => {
		storePhotos([
			photo("old", "2025-04-12T09:00:00+09:00"),
			photo("new", "2026-09-21T09:00:00+09:00"),
		]);

		const photos = await listBodyPhotos();

		expect(photos.map(({ id }) => id)).toEqual(["new", "old"]);
	});

	test("実体ファイルが失われた写真はメタデータから取り除く", async () => {
		storePhotos([
			photo("kept", "2026-09-21T09:00:00+09:00"),
			photo("lost", "2026-09-20T09:00:00+09:00"),
		]);
		mockExistingUris.delete("file:///documents/photos/lost.jpg");

		const photos = await listBodyPhotos();

		expect(photos.map(({ id }) => id)).toEqual(["kept"]);
		expect(storedIds()).toEqual(["kept"]);
	});

	test("選ばれた画像を写真の保存先にコピーして、メタデータに加える", async () => {
		mockExistingUris.add("file:///cache/cropped.jpg");

		const added = await addBodyPhoto(
			"file:///cache/cropped.jpg",
			new Date("2026-09-21T09:00:00+09:00"),
		);

		expect(mockExistingUris).toContain(getBodyPhotoUri(added));
		expect(storedIds()).toEqual([added.id]);
	});

	test("メタデータを書けなければ、コピーしたファイルを残さない", async () => {
		mockExistingUris.add("file:///cache/cropped.jpg");
		setItem.mockRejectedValue(new Error("書き込みに失敗"));

		await expect(
			addBodyPhoto(
				"file:///cache/cropped.jpg",
				new Date("2026-09-21T09:00:00+09:00"),
			),
		).rejects.toThrow("書き込みに失敗");
		expect(
			[...mockExistingUris].filter((uri) =>
				uri.startsWith("file:///documents/photos/"),
			),
		).toEqual([]);
	});

	test("写真を実体ファイルとメタデータの両方から削除する", async () => {
		storePhotos([
			photo("a", "2026-09-21T09:00:00+09:00"),
			photo("b", "2026-09-20T09:00:00+09:00"),
		]);

		await deleteBodyPhoto("a");

		expect(mockExistingUris).not.toContain("file:///documents/photos/a.jpg");
		expect(storedIds()).toEqual(["b"]);
	});

	test("実体ファイルがすでに無くても、メタデータからは削除できる", async () => {
		storePhotos([photo("a", "2026-09-21T09:00:00+09:00")]);
		mockExistingUris.delete("file:///documents/photos/a.jpg");

		await expect(deleteBodyPhoto("a")).resolves.toBeUndefined();
		expect(storedIds()).toEqual([]);
	});
});
