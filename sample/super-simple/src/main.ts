function main(param: g.GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["player", "shot", "none"]
	});
	scene.onLoad.add(() => {
		// ここからゲーム内容を記述します

		// 各アセットオブジェクトを取得します
		const playerImageAsset = scene.asset.getImageById("player");
		const shotImageAsset = scene.asset.getImageById("shot");

		// プレイヤーを生成します
		const player = new g.Sprite({
			scene: scene,
			src: playerImageAsset,
			width: playerImageAsset.width,
			height: playerImageAsset.height
		});

		// プレイヤーの初期座標を、画面の中心に設定します
		player.x = (g.game.width - player.width) / 2;
		player.y = (g.game.height - player.height) / 2;
		scene.append(player);

		const cameraScreenSprite = new g.Sprite({
            scene: scene,
            src: scene.asset.getImageById("none"), // 初期値はnullにしたいがsrcを指定する必要があるので非常に小さい画像アセットを指定する
            width: g.game.width / 8,
            height: g.game.height / 8
        });
		scene.append(cameraScreenSprite);
		if (g.game.operationPlugins[10]) {
			g.game.operationPlugins[10].operationTrigger.add((e: g.OperationPluginOperation) => {
				const data = JSON.parse(e.data[0].toString());
				if (data.name === "hand") {
					const place = data.areas[0];
					player.x = (place.x + place.width / 2) * 8;
					player.y = (place.y + place.height / 2) * 8;
					player.modified();
					shot(scene, player, shotImageAsset);
				}
			});
		}
		scene.onUpdate.add(() => {
			const plugin: any = g.game.operationPlugins[10];
			if (plugin && plugin.getCameraScreenSurface) {
				const surface: g.Surface = plugin.getCameraScreenSurface();
				if (!surface) {
					return;
				}
				cameraScreenSprite._surface = surface;
				cameraScreenSprite.modified();
			}
		});
		// ここまでゲーム内容を記述します
	});
	g.game.pushScene(scene);
}

function shot(scene: g.Scene, player: g.Sprite, shotImageAsset: g.ImageAsset):void {
    //seAudioAsset.play();
    // プレイヤーが発射する弾を生成します
    var shot = new g.Sprite({
        scene: scene,
        src: shotImageAsset,
        width: shotImageAsset.width,
        height: shotImageAsset.height
    });
    // 弾の初期座標を、プレイヤーの少し右に設定します
    shot.x = player.x + player.width;
    shot.y = player.y;
    shot.onUpdate.add(function () {
        // 毎フレームで座標を確認し、画面外に出ていたら弾をシーンから取り除きます
        if (shot.x > g.game.width)
            shot.destroy();
        // 弾を右に動かし、弾の動きを表現します
        shot.x += 10;
        // 変更をゲームに通知します
        shot.modified();
    });
    scene.append(shot);
}

export = main;
