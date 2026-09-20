import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import type { LiftExercise, LiftRecord } from "@/services/oneRepMax";

/** 挙上記録の保存キー */
const STORAGE_KEY = "liftRecords";

/** 記録を読み出す */
const readLiftRecords = async (): Promise<LiftRecord[]> => {
	const stored = await AsyncStorage.getItem(STORAGE_KEY);

	if (!stored) {
		return [];
	}

	try {
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? (parsed as LiftRecord[]) : [];
	} catch {
		// 壊れた値が入っていても一覧を開けるようにする
		return [];
	}
};

/** 記録を書き込む */
const writeLiftRecords = async (records: LiftRecord[]) => {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

/** 実施日の降順（同じ実施日なら保存日時の降順）に並べる */
const sortByPerformedAtDesc = (records: readonly LiftRecord[]) =>
	[...records].sort((a, b) => {
		if (a.performedAt !== b.performedAt) {
			return a.performedAt < b.performedAt ? 1 : -1;
		}

		return a.createdAt < b.createdAt ? 1 : -1;
	});

/** 保存済みの記録を実施日の降順で取得する */
export const listLiftRecords = async () =>
	sortByPerformedAtDesc(await readLiftRecords());

/** 記録を 1 件追加する */
export const addLiftRecord = async ({
	exercise,
	weight,
	reps,
	performedAt,
}: {
	exercise: LiftExercise;
	weight: number;
	reps: number;
	performedAt: Date;
}) => {
	const record: LiftRecord = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
		exercise,
		weight,
		reps,
		// UTC に寄せると深夜・早朝の記録が前後の日にズレるため、端末のローカル日付で持つ
		performedAt: format(performedAt, "yyyy-MM-dd"),
		createdAt: new Date().toISOString(),
	};

	const storedRecords = await readLiftRecords();
	await writeLiftRecords([...storedRecords, record]);

	return record;
};

/** 記録を 1 件削除する */
export const deleteLiftRecord = async (id: string) => {
	const storedRecords = await readLiftRecords();
	await writeLiftRecords(storedRecords.filter((record) => record.id !== id));
};
