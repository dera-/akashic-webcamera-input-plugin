import { Trigger } from "@akashic/trigger";
const cv = require("../external_script/opencv");
const cvUtils = require("../external_script/opencvUtils");

interface CascadeData {
	key: string;
	filePath: string;
	classifier?: any;
}

const DEFAUTLT_CAMERA_SCREEN_SCALE = 0.125;

const detectObjects = (src: any, cascade: any): any[] => {
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    const hands = new cv.RectVector();
    const msize = new cv.Size(0, 0);
    cascade.detectMultiScale(gray, hands, 1.1, 3, 0, msize, msize);
    const objects = [];
    for (var i = 0; i < hands.size(); ++i) {
        objects.push(hands.get(i));
    }
    gray.delete();
    hands.delete();
    return objects;
}

const createSurfaceFromMat = (mat: any, width: number, height: number): g.Surface => {
    const img = new cv.Mat();
    const depth = mat.type() % 8;
    const scale = depth <= cv.CV_8S ? 1 : depth <= cv.CV_32S ? 1 / 256 : 255;
    const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128 : 0;
    mat.convertTo(img, cv.CV_8U, scale, shift);
    switch (img.type()) {
        case cv.CV_8UC1:
            cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA);
            break;
        case cv.CV_8UC3:
            cv.cvtColor(img, img, cv.COLOR_RGB2RGBA);
            break;
        case cv.CV_8UC4:
            break;
        default:
            throw new Error("Bad number of channels (Source image must have 1, 3 or 4 channels)");
    }
    const imgData = new ImageData(new Uint8ClampedArray(img.data),img.cols,img.rows);
    const surface = g.game.resourceFactory.createSurface(width, height);
    const canv = document.createElement("canvas");
    canv.width = width;
    canv.height = height;
    const ct = canv.getContext("2d");
    ct.putImageData(imgData, 0, 0);
    surface._drawable = canv;
    return surface;
}

class AkashicWebcameraInputPlugin implements g.OperationPlugin {
	code: number;
	operationTrigger: Trigger<g.OperationPluginOperation | (number | string)[]>;

	private _game: g.Game;
	private _view: g.OperationPluginView;
	private _player: g.Player;
	private _cameraScreenSize: g.CommonSize;
	// Webカメラインターフェースの有効化フラグ
	private _approved: boolean;
	private _cvUtils: any;
	private _cascades: CascadeData[];
	private _matWebcamera: any;
	private _videoCapture: any;
	private _cameraScreenSurface: g.Surface;

	static isSupported(): boolean {
		return typeof window !== "undefined" && typeof document !== "undefined" && navigator.mediaDevices !== undefined;
	}

	constructor(game: g.Game, view: g.OperationPluginView, player: g.Player, code: number, option?: any) {
		this.code = code;
		this.operationTrigger = new Trigger<g.OperationEvent>();
		this._game = game;
		this._view = view;
		this._player = player;
		this._approved = false;
		this._cvUtils = new cvUtils("error");
		if (option && option.cameraScreenScale) {
			this._cameraScreenSize = { width: option.cameraScreenScale * game.width, height: option.cameraScreenScale * game.height };
		} else {
			this._cameraScreenSize = {
				width: DEFAUTLT_CAMERA_SCREEN_SCALE * game.width,
				height: DEFAUTLT_CAMERA_SCREEN_SCALE * game.height
			};
		}
		if (option && Array.isArray(option.cascades)) {
			this._cascades = option.cascades.map((key :string) => {
				return {
					key,
					filePath: this._game.assets[key].originalPath
				}
			});
		} else {
			this._cascades = [];
		}
		this._initialize();
	}

	start(): boolean {
		this._approved = true;
		return true;
	}

	stop(): void {
		this._approved = false;
	}

	getCameraScreenSurface(): g.Surface {
		return this._cameraScreenSurface;
	}

	private _initialize(): void {
		let videoElem: any;
		new Promise((resolve: any) => {
			const timerId = window.setInterval(() => {
			if (cv.CascadeClassifier) {
				window.clearInterval(timerId);
				resolve();
			}
		   }, 1000 / this._game.fps); 
		}).then(() => {
			// opencv.jsのwasmが読み込まれてから初期化処理
			videoElem = document.createElement("video");
            videoElem.width = this._cameraScreenSize.width;
            videoElem.height = this._cameraScreenSize.height;
            this._videoCapture = new cv.VideoCapture(videoElem);
			this._cascades.forEach(cascade => {
				cascade.classifier = new cv.CascadeClassifier();
				this._cvUtils.createFileFromUrl(`${cascade.key}.xml`, cascade.filePath, () => {
					cascade.classifier.load(`${cascade.key}.xml`);
				});
			});
			return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
		}).then(stream => {
			// webカメラ起動後、物体認識処理定義
			videoElem.srcObject = stream;
			videoElem.play();
			this._matWebcamera = new cv.Mat(videoElem.height, videoElem.width, cv.CV_8UC4);
			window.setInterval(() => {
				if (!this._approved) {
					return;
				}
				this._videoCapture.read(this._matWebcamera);
				this._cascades.forEach(cascade => {
					const objects = detectObjects(this._matWebcamera, cascade.classifier);
					const areas: g.CommonArea[] = objects.map((obj: any) => {
						const point1 = new cv.Point(obj.x, obj.y);
						const point2 = new cv.Point(obj.x + obj.width, obj.y + obj.height);
						cv.rectangle(this._matWebcamera, point1, point2, [255, 0, 0, 255]);
						// xの位置だけ反転して通知
						return { x: this._cameraScreenSize.width - obj.x, y: obj.y, width: obj.width, height: obj.height };
					});
					if (areas.length > 0) {
						this.operationTrigger.fire(new g.OperationEvent(this.code, { name: cascade.key, areas }, this._player));
					}
				});
				cv.flip(this._matWebcamera, this._matWebcamera, 1);
				this._cameraScreenSurface = createSurfaceFromMat(
					this._matWebcamera,
					this._cameraScreenSize.width,
					this._cameraScreenSize.height
				);
			}, 1000 / this._game.fps);
		}).catch(err => console.error(err));
	}
}

export = AkashicWebcameraInputPlugin;
