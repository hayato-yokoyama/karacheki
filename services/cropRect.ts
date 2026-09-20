/**
 * Before/After 写真を切り抜く縦横比（横 / 縦）
 *
 * 一覧のセルと比較画面に合わせた縦長。2枚を並べて見るのが目的なので、
 * 撮影ごとに比率が変わらないよう固定する
 */
export const CROP_ASPECT_RATIO = 3 / 4;

export type Size = {
	width: number;
	height: number;
};

/**
 * トリミング画面の状態
 *
 * 枠は画面中央に固定して、画像の側を動かす。`scale` は枠を覆う最小倍率を 1 と
 * したときの拡大率、`translateX` / `translateY` は枠の中心から見た画像の中心の
 * ずれ（画面px）で、右・下方向が正
 */
export type CropView = {
	/** 元画像の大きさ（px） */
	image: Size;
	/** 画面上の切り抜き枠の大きさ（px） */
	frame: Size;
	scale: number;
	translateX: number;
	translateY: number;
};

/** 切り抜く矩形。元画像のピクセル座標で表す */
export type CropRect = {
	originX: number;
	originY: number;
	width: number;
	height: number;
};

const clamp = (value: number, min: number, max: number) => {
	"worklet";
	return Math.min(Math.max(value, min), max);
};

/**
 * 枠を隙間なく覆う最小の表示倍率（元画像1pxあたりの画面px）を返す
 *
 * 縦横どちらかが枠にぴったり収まり、もう一方が枠からはみ出す状態になる
 */
export const getMinimumScale = (image: Size, frame: Size) => {
	"worklet";
	return Math.max(frame.width / image.width, frame.height / image.height);
};

/**
 * 枠が画像からはみ出さない範囲での移動量の上限（画面px）を返す
 *
 * 画像は常に枠を覆っているので、はみ出している分の半分までしか動かせない
 */
export const getTranslationLimit = ({
	image,
	frame,
	scale,
}: Pick<CropView, "image" | "frame" | "scale">) => {
	"worklet";
	const displayScale = getMinimumScale(image, frame) * scale;

	return {
		x: Math.max((image.width * displayScale - frame.width) / 2, 0),
		y: Math.max((image.height * displayScale - frame.height) / 2, 0),
	};
};

/**
 * 移動量を、枠が画像の外に出ない範囲へ収める
 *
 * ジェスチャー中にも同じ判定を使うため worklet にしている
 */
export const clampTranslation = ({
	image,
	frame,
	scale,
	translateX,
	translateY,
}: CropView) => {
	"worklet";
	const limit = getTranslationLimit({ image, frame, scale });

	return {
		x: clamp(translateX, -limit.x, limit.x),
		y: clamp(translateY, -limit.y, limit.y),
	};
};

/**
 * 画面上の見え方を、元画像のピクセル座標での切り抜き矩形に変換する
 *
 * 画像や枠の大きさは正の数である前提。呼び出し側で 0 を弾いてから渡す
 */
export const getCropRect = ({
	image,
	frame,
	scale,
	translateX,
	translateY,
}: CropView): CropRect => {
	const displayScale = getMinimumScale(image, frame) * scale;
	const translation = clampTranslation({
		image,
		frame,
		scale,
		translateX,
		translateY,
	});

	// 枠の左上が、表示中の画像の左上から何px右・下にあるか
	const offsetX =
		(image.width * displayScale - frame.width) / 2 - translation.x;
	const offsetY =
		(image.height * displayScale - frame.height) / 2 - translation.y;

	const width = Math.min(Math.round(frame.width / displayScale), image.width);
	// 高さは幅から出して枠の縦横比を保つ。幅と高さを別々に丸めると、
	// 丸め方次第で1pxぶん比率がずれた写真が混ざる
	const height = Math.min(
		Math.round(width * (frame.height / frame.width)),
		image.height,
	);

	return {
		originX: clamp(Math.round(offsetX / displayScale), 0, image.width - width),
		originY: clamp(
			Math.round(offsetY / displayScale),
			0,
			image.height - height,
		),
		width,
		height,
	};
};
