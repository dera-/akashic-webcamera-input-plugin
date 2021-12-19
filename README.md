# akashic-webcamera-input-plugin
`akashic-webcamera-input-plugin` はWEBカメラを入力インターフェースとして利用するためのAkashic Engine用プラグインです。

## できること
* WEBカメラに映った特定の物を認識して、その情報をコンテンツに送信します。送信する情報の詳細は以下の通りです。
  * コンテンツの画面サイズに合わせた物体の座標(コンテンツの右上端を(0,0)座標としています)
  * 物体の横幅と縦幅
  * 物体の数
* 実際に何を認識するかはコンテンツ側で「学習済み識別器」をプラグインに渡すことで指定できます。
  * 物体の認識のために[OpenCV](https://opencv.org/)というライブラリを使用しているため、「学習済み識別器」としてOpenCV用のカスケード分類器というxml形式のファイルを指定します。
* コンテンツ側では、その情報を利用してコンテンツ上で何らかのアクションを起こすことができます。

**※ただし、動く環境はブラウザ上のみ**

具体的にどのようなことができるかは [sample](./sample) 以下のコンテンツを確認していただければと思います。

## 使い方
1. このプラグインを利用したいコンテンツのディレクトリ下で以下のようにコマンドを実行します。

```sh
akashic install --plugin 10 @dera-/akashic-webcamera-input-plugin
```
上記の例では `--plugin` に 10 を指定していますが、これは任意の値で問題ありません。


もしも以下のコマンドの実行に失敗した場合は、コンテンツのディレクトリ下で以下のコマンド実行と コンテンツの `game.json` の手動での書き換えを行います。
```sh
npm install --save-dev @dera-/akashic-webcamera-input-plugin
```

```json
// 以下game.jsonの内容
{
	...,
+	"operationPlugins": [
+		{
+			"code": 10,
+			"script": "./node_modules/@dera-/akashic-webcamra-input-plugin/lib/index.js",
+		}
+	],
	"globalScripts": [
		...,
+		"node_modules/@dera-/akashic-webcamra-input-plugin/lib/index.js",
+		"node_modules/@dera-/akashic-webcamra-input-plugin/externals/opencv.js",
+		"node_modules/@dera-/akashic-webcamra-input-plugin/externals/opencvUtils.js"
	],
	...
}
```

2. コンテンツで利用する識別器を `game.json` で指定します。また、識別器はグローバルなテキストアセットとして同時に指定しておく必要があります。テキストアセットにはxml形式のOpenCV用のカスケード分類器を指定してください。
```json
// 以下game.json記載例
{
	...,
	"assets": {
		...,
		// 識別器をグローバルなテキストアセットとして定義
+		"hand": {
+			"type": "text",
+			"path": "text/hand.xml",
+			"global": true
+		},
	}
	"operationPlugins": [
		{
			"code": 10,
			"script": "./node_modules/@dera-/akashic-webcamra-input-plugin/lib/index.js",
+			"option": {
+				"cascades": [
+					"hand" // 利用する識別器をアセットIDで指定
+				]
+			}
		}
	],
	...
}
```

3. プラグインで物体を検出後その情報が随時コンテンツに贈られてきます。その時の処理をコンテンツ側のコードに記述する必要があります。
```javascript
	// akashic-webcamera-input-pluginで検出された物体を利用する処理の例
	if (g.game.operationPlugins[10]) {
		// プラグインインストール時に指定した数値(code)を指定
		const plugin = g.game.operationPlugins[10];
		plugin.operationTrigger.add((e: g.OperationPluginOperation) => {
			// 物体検出時operationTriggerがfireされるのでその時の処理をコールバック内に記載する
		});
	}
```

## 仕様
### option
`game.json` の `operationPlugins` の節で `option` プロパティにオブジェクトを記述することで、プラグインのオプションを指定できます。 `option` は次の名前のプロパティ名と対応する値を持つオブジェクトです。

* cascades
  * 文字列の配列
  * プラグインで利用するカスケード分類器をアセットIDで指定します。
* cameraScreenScale
  * 数値
  * コンテンツの画面スケールを1とした時の、WEBカメラ映像のスケール
  * デフォルト値は0.125
