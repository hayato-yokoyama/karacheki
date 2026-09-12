# 実機ビルド手順（iOS / SDK 52 のまま）

Simulator では検証できなかった箇所を実機で確認するための、開発用ビルド（dev client）の手順。
SDK アップグレード（#46 手順4）の前に、**まず今のコードが実機で動くこと**を確かめるためのもの。

## これで入るもの

| | |
| --- | --- |
| アプリ名 | からチェキ.dev |
| Bundle ID | `com.h-yokoyama.karacheki.dev` |
| ビルド種別 | development（dev client + internal distribution / Ad Hoc） |

App Store 版（`com.h-yokoyama.karacheki`）とは別アプリとして入るので、**普段使いのアプリは消えない**。

## 前提

- Apple Developer Program が有効であること
- ネイティブビルドはクラウド（EAS）で行う。ローカルに Xcode は不要
- リモートプッシュは使っていない（`expo-notifications` のローカル通知のみ）ため、**APNs キーの用意は不要**

## 手順

### 1. EAS にログイン

```sh
npx eas login
```

### 2. 実機を登録する

Ad Hoc 配信なので、プロビジョニングプロファイルに端末の UDID が入っている必要がある。**ビルドより先**に行う。

```sh
npm run device:register
```

表示される URL / QR を iPhone で開き、プロファイルをインストール →
設定 > 一般 > VPN とデバイス管理 からインストールを承認する。

### 3. ビルドする

```sh
npm run build:device
```

- Apple ID のログインを求められる
- 証明書・プロビジョニングプロファイル・App ID は EAS が自動生成する
  （Apple Developer Program の更新で失効した証明書があれば作り直される）
- HealthKit の capability（background delivery を含む）も EAS が自動で有効化する

### 4. iPhone にインストールする

ビルド完了ページの QR を iPhone のカメラで読み取ってインストール。
初回は 設定 > 一般 > VPN とデバイス管理 でデベロッパを信頼する。

### 5. Metro をつなぐ

```sh
npm run dev
```

Mac と iPhone を同じネットワークに置き、アプリ（からチェキ.dev）を起動して接続する。

**JS の変更はリビルド不要**。`app.json` / config plugin / 依存パッケージを変えたときだけ 3 からやり直す。

## 実機で初めて確認できること

Simulator では検証できず、積み残していた箇所。

- **体重の取得・保存**（HealthKit）— ホーム画面の週平均、グラフ画面、手動記録
  - 初回起動時にヘルスケアの読み取り／書き込み許可ダイアログが出る
- **通知** — 毎朝8時のローカル通知と、その本文（週平均と変化幅）
- **カメラ撮影** — 未実装。実機が使えるようになってから着手する（`cameraPermission: false` のままなので、着手時に `app.json` の変更とリビルドが要る）
