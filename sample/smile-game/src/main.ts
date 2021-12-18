function main(param: g.GameMainParameterObject): void {
	const scene = new g.Scene({game: g.game, assetIds: ["none"]});
	let score = 0;
	const MAX_SCORE = 9999;
	scene.onLoad.add(() => {
		// 以下にゲームのロジックを記述します。
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "serif",
			size: 48
		});
		const scoreLabel = new g.Label({
			scene: scene,
			font: font,
			fontSize: 24,
			x: 0.4 * g.game.width,
			y: 0.1 * g.game.height,
			text: `SCORE:${score}`
		});
		scene.append(scoreLabel);
		const discriptionLabel = new g.Label({
			scene: scene,
			font: font,
			fontSize: 32,
			x: 0.35 * g.game.width,
			y: 0.85 * g.game.height,
			text: "笑顔になりましょう"
		});
		scene.append(discriptionLabel);
		scene.onUpdate.add(() => {
			scoreLabel.text = `SCORE:${score}`;
			scoreLabel.invalidate();
		});
		if (g.game.operationPlugins[10]) {
			const cameraScreenSprite = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById("none"), // 初期値はnullにしたいがsrcを指定する必要があるので非常に小さい画像アセットを指定する
				width: g.game.width / 4,
				height: g.game.height / 4,
				x: g.game.width / 2 - g.game.width / 8,
				y: g.game.height / 2 - g.game.height / 8
			});
			scene.append(cameraScreenSprite);
			// プラグインインストール時に指定した数値(code)を指定
			const plugin: any = g.game.operationPlugins[10];
			plugin.operationTrigger.add((e: g.OperationPluginOperation) => {
				// 物体の情報が送られてきたら、即この関数中の処理が実行される
				const data = JSON.parse(e.data[0].toString());
				if (data.name === "smile") {
					score += data.areas.length;
					if (score > MAX_SCORE) {
						score = MAX_SCORE;
					}
				}
			});
			scene.onUpdate.add(() => {
				const surface: g.Surface = plugin.getCameraScreenSurface();
				if (!surface) {
					return;
				}
				cameraScreenSprite._surface = surface;
				cameraScreenSprite.modified();
			});
		}
	});
	g.game.pushScene(scene);
}

export = main;
