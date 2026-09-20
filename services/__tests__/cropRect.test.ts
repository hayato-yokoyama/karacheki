import {
	clampTranslation,
	getCropRect,
	getMinimumScale,
	getTranslationLimit,
	type Size,
} from "@/services/cropRect";

/** 画面上の切り抜き枠。3:4 固定 */
const frame: Size = { width: 300, height: 400 };

/** 枠と同じ 3:4 の画像 */
const portrait: Size = { width: 3000, height: 4000 };
/** 枠より横長な画像（4:3） */
const landscape: Size = { width: 4000, height: 3000 };
/** 枠より縦長な画像（9:16） */
const tall: Size = { width: 1080, height: 1920 };

describe("getMinimumScale", () => {
	test("枠と同じ縦横比なら、縦横どちらで測っても同じ倍率になる", () => {
		expect(getMinimumScale(portrait, frame)).toBeCloseTo(0.1);
	});

	test("横長の画像は、高さが枠に収まる倍率になる", () => {
		expect(getMinimumScale(landscape, frame)).toBeCloseTo(400 / 3000);
	});

	test("縦長の画像は、幅が枠に収まる倍率になる", () => {
		expect(getMinimumScale(tall, frame)).toBeCloseTo(300 / 1080);
	});
});

describe("getTranslationLimit", () => {
	test("枠と同じ縦横比・等倍なら、はみ出しがないので動かせない", () => {
		expect(getTranslationLimit({ image: portrait, frame, scale: 1 })).toEqual({
			x: 0,
			y: 0,
		});
	});

	test("はみ出している方向にだけ動かせる", () => {
		const limit = getTranslationLimit({ image: landscape, frame, scale: 1 });

		// 横長なので左右にだけ余りがある
		expect(limit.x).toBeCloseTo((4000 * (400 / 3000) - 300) / 2);
		expect(limit.y).toBe(0);
	});

	test("拡大すると、動かせる範囲が広がる", () => {
		const limit = getTranslationLimit({ image: portrait, frame, scale: 2 });

		expect(limit.x).toBeCloseTo(300 / 2);
		expect(limit.y).toBeCloseTo(400 / 2);
	});
});

describe("clampTranslation", () => {
	test("範囲内の移動量はそのまま通す", () => {
		expect(
			clampTranslation({
				image: portrait,
				frame,
				scale: 2,
				translateX: 100,
				translateY: -50,
			}),
		).toEqual({ x: 100, y: -50 });
	});

	test("行き過ぎた移動量は端で止める", () => {
		const clamped = clampTranslation({
			image: portrait,
			frame,
			scale: 2,
			translateX: 9999,
			translateY: -9999,
		});

		expect(clamped.x).toBeCloseTo(150);
		expect(clamped.y).toBeCloseTo(-200);
	});
});

describe("getCropRect", () => {
	test("枠と同じ縦横比・等倍なら、画像全体が切り抜きになる", () => {
		expect(
			getCropRect({
				image: portrait,
				frame,
				scale: 1,
				translateX: 0,
				translateY: 0,
			}),
		).toEqual({ originX: 0, originY: 0, width: 3000, height: 4000 });
	});

	test("横長の画像は、中央から 3:4 を切り抜く", () => {
		expect(
			getCropRect({
				image: landscape,
				frame,
				scale: 1,
				translateX: 0,
				translateY: 0,
			}),
		).toEqual({ originX: 875, originY: 0, width: 2250, height: 3000 });
	});

	test("縦長の画像は、幅いっぱいを中央の高さで切り抜く", () => {
		expect(
			getCropRect({
				image: tall,
				frame,
				scale: 1,
				translateX: 0,
				translateY: 0,
			}),
		).toEqual({ originX: 0, originY: 240, width: 1080, height: 1440 });
	});

	test("画像を右に動かすと、左端から切り抜く", () => {
		const rect = getCropRect({
			image: landscape,
			frame,
			scale: 1,
			// 端まで動かしきる量を超えて渡す
			translateX: 9999,
			translateY: 0,
		});

		expect(rect.originX).toBe(0);
	});

	test("画像を左に動かすと、右端から切り抜く", () => {
		const rect = getCropRect({
			image: landscape,
			frame,
			scale: 1,
			translateX: -9999,
			translateY: 0,
		});

		expect(rect.originX).toBe(landscape.width - rect.width);
	});

	test("拡大すると、切り抜く範囲が狭くなる", () => {
		const rect = getCropRect({
			image: landscape,
			frame,
			scale: 2,
			translateX: 0,
			translateY: 0,
		});

		expect(rect.width).toBe(1125);
		expect(rect.height).toBe(1500);
		// 動かしていないので中央のまま。切り抜きの幅が奇数だと中心が
		// 0.5px ずれるため、1px までの差は許す
		expect(
			Math.abs(rect.originX + rect.width / 2 - landscape.width / 2),
		).toBeLessThanOrEqual(1);
		expect(
			Math.abs(rect.originY + rect.height / 2 - landscape.height / 2),
		).toBeLessThanOrEqual(1);
	});

	test("どこまで動かしても、切り抜きが画像からはみ出さない", () => {
		const corners = [
			{ translateX: 99999, translateY: 99999 },
			{ translateX: -99999, translateY: -99999 },
			{ translateX: 99999, translateY: -99999 },
			{ translateX: -99999, translateY: 99999 },
		];

		for (const image of [portrait, landscape, tall]) {
			for (const scale of [1, 1.5, 3]) {
				for (const corner of corners) {
					const rect = getCropRect({ image, frame, scale, ...corner });

					expect(rect.originX).toBeGreaterThanOrEqual(0);
					expect(rect.originY).toBeGreaterThanOrEqual(0);
					expect(rect.originX + rect.width).toBeLessThanOrEqual(image.width);
					expect(rect.originY + rect.height).toBeLessThanOrEqual(image.height);
				}
			}
		}
	});

	test("どの画像・倍率でも、切り抜きの縦横比が枠と揃う", () => {
		for (const image of [portrait, landscape, tall]) {
			for (const scale of [1, 1.5, 3]) {
				const rect = getCropRect({
					image,
					frame,
					scale,
					translateX: 0,
					translateY: 0,
				});

				expect(rect.width / rect.height).toBeCloseTo(
					frame.width / frame.height,
					2,
				);
			}
		}
	});
});
