import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import {
	getSaveToCameraRoll,
	groupBodyPhotosByMonth,
	MediaLibraryPermissionDeniedError,
	replaceComparedPhoto,
	saveBodyPhotoToCameraRoll,
	setSaveToCameraRoll,
} from "@/services/bodyPhotoService";

// 月ごとの区切りと比較する2枚の入れ替えは端末に触らない計算なので、
// モジュールが読み込めるだけの最小のモックを置く
jest.mock("@react-native-async-storage/async-storage", () => ({
	getItem: jest.fn(),
	setItem: jest.fn(),
}));
jest.mock("expo-file-system/legacy", () => ({
	documentDirectory: "file:///documents/",
	copyAsync: jest.fn(),
	deleteAsync: jest.fn(),
	getInfoAsync: jest.fn(),
	makeDirectoryAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => ({
	ImageManipulator: { manipulate: jest.fn() },
	SaveFormat: { JPEG: "jpeg" },
}));
jest.mock("expo-image-picker", () => ({
	launchCameraAsync: jest.fn(),
	launchImageLibraryAsync: jest.fn(),
	requestCameraPermissionsAsync: jest.fn(),
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
