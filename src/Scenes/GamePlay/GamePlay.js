/* *******************************************************************************
	GamePlayシーン
********************************************************************************/
var Scenes	= Scenes || {};
var cc;
(function(){	//File Scope

/** classへのthis */
let _this	= null;
/** シークエンス列挙型 */
const Sequences	= {
	/**初期状態*/		INITIAL			: Sequence.Create(),
	/**エイム作動*/		START_AIM		: Sequence.Create(),
	/**打撃予備動作*/	PRELIMINARY		: Sequence.Create(),
	/**打撃動作*/		DISCHARGE		: Sequence.Create(),
	/**打撃ヒット後*/	IMPACTED		: Sequence.Create(),
	/**エミット中*/		EMIT			: Sequence.Create(),
	/**吹き飛ばし*/		BLOW_AWAY		: Sequence.Create(),
	/**測定中*/			MEASURE			: Sequence.Create(),
	/**動作失敗*/		DISCHARGE_FAILED: Sequence.Create(),
};
/** 打撃定数 */
const BlowPower	= {
	/**上限値*/			MIN				: 0,
	/**上限値*/			MAX				: 60*256,
	/**初期値*/			INITIAL			: 0,
	/**増分*/			INCREMENT		: 1*256,
	/**失敗時の減少*/	DECREMENT		: 1*256,
	/**主動作の速度*/	DISCHARGE_SPEED	: 4*256,
	/**主動作の加速度*/	ACCELERATION	: 1.20,
};
/** エミットエナジー定数*/
const EmitEnergy	= {
	/**エミット受付期間*/	ACCEPTION_COUNT:	300,
};
/** リンクされたレイヤーのタグ */
const LinkedLayerTags	= {
	MAIN	: 0,
};

Scenes.GamePlay	= class extends Scenes.SceneBase {

	constructor(){
		super();
		_this					= this;

		//インパクトシークエンス
		/** @var チャージ時間 */
		this.chargingCount		= BlowPower.INITIAL;
		/** @var チャージ量 */
		this.chargedPower		= 0;
		/** 打撃動作のアニメーション速度 */
		this.dischargeSpeed		= 0;
		/** @var エイミングゲージ */
		this.aiming				= null;

		//エミットエナジーシークエンス
		/** @var エミット受付時間*/
		this.acceptEmitting		= 0;
		/** @var エミット値 */
		this.emittingPower		= 0;

		//結果表示用
		/** @var インパクト時の威力*/
		this.impactPower		= 0;
		/** @var 最終的に与えられた威力 */
		this.totalPower			= 0;
		/** @var 隕石の移動距離 */
		this.meteorX			= 0;

		/** ccSceneのインスタンス */
		this.ccSceneInstance	= new (cc.Scene.extend({
			/** 生成 */
			onEnter:function (){
				this._super();
				_this.aiming	= Scenes.Aiming.Create();
				_this.SetLayer(LinkedLayerTags.MAIN,_this.ccLayers.impact);
				_this.InitSequence(Sequences.INITIAL,Sequences,_this.ccLayerInstances[LinkedLayerTags.MAIN]);
				_this.sequence.Init();

				this.scheduleUpdate();
			},
			/** 更新 */
			update:function(dt){

				//エイミングカーソル作動
				if(IsAnyOf( _this.sequence, [Sequences.START_AIM,Sequences.PRELIMINARY,Sequences.DISCHARGE,Sequences.DISCHARGE_FAILED] )){
					_this.aiming.Update();
				}

				switch(_this.sequence){
					case Sequences.PRELIMINARY:
						_this.chargingCount += BlowPower.INCREMENT;
						if(_this.chargingCount > BlowPower.MAX)	_this.SetSequence(Sequences.DISCHARGE_FAILED);
						break;
					case Sequences.DISCHARGE:
						_this.dischargeSpeed *= BlowPower.ACCELERATION;
						_this.chargingCount -= _this.dischargeSpeed;
						if(_this.chargingCount < BlowPower.MIN){
							_this.SetSequence(Sequences.IMPACTED);
						}
						break;
					case Sequences.DISCHARGE_FAILED:
						_this.chargingCount-=BlowPower.DECREMENT;
						if(_this.chargingCount < BlowPower.MIN)	_this.SetSequence(Sequences.START_AIM);
						break;
					case Sequences.IMPACTED:
						_this.SetSequence(Sequences.EMIT);
						_this.acceptEmitting	= EmitEnergy.ACCEPTION_COUNT;
						_this.emittingPower		= 0;
						break;
					case Sequences.EMIT:
						_this.acceptEmitting--;
						if(_this.acceptEmitting < 0){
							_this.SetSequence(Sequences.BLOW_AWAY);

							_this.impactPower	= _this.aiming.GetTotalRate() * (_this.chargedPower/256 + 30);
							_this.totalPower	= _this.aiming.GetTotalRate() * (_this.chargedPower/256 + 30 + _this.emittingPower*2);

							debug("Emit: "		+ _this.emittingPower	);
							debug("AimingRate: "+ _this.aiming.GetRate());
							debug("Impact: "	+ _this.impactPower		);
							debug("Total: "		+ _this.totalPower		);
						}
						break;
					case Sequences.BLOW_AWAY:
						break;
					case Sequences.MEASURE:
						break;
					default:
				}

				const canvasSize	= cc.director.getWinSize();
			},
		}))();

		/** ccLayerに渡す用 */
		this.ccLayers	= {
			/** インパクトシークエンスのメインレイヤ */
			impact	: cc.Layer.extend({
				/**	生成 */
				ctor:function(){
					this._super();
					this.init();
					this.scheduleUpdate();
					return true;
				},
				/** 初期化 */
				init	: function(){
					this._super();

					_this.chargingCount		= BlowPower.INITIAL;
					_this.chargedPower		= 0;
					_this.dischargeSpeed	= 0;
					_this.SetSequence(Sequences.INITIAL);
					_this.sprites.player	= Sprite.CreateInstance(res.img.player).AddToLayer(this).SetPosition(100,100);
					_this.aiming.Init().SetLayer(this).SetSpritePosition(140,100);

					_this.labels.chargedPower	= Label.CreateInstance().setColor("#FFFFFF").setPosition(300,100).AddToLayer(this);
					_this.labels.seq			= Label.CreateInstance().setColor("#FFFFFF").setPosition(300,80).AddToLayer(this);
					_this.labels.aiming			= Label.CreateInstance().setColor("#FFFFFF").setPosition(300,60).AddToLayer(this);
					_this.labels.emittingPower	= Label.CreateInstance().setColor("#FFFFFF").setPosition(300,40).AddToLayer(this);

					return true;
				},
				/** 更新 */
				update	: function(dt){
					this._super();
					if(IsAnyOf(_this.sequence,[Sequences.INITIAL,Sequences.START_AIM,Sequences.PRELIMINARY,Sequences.DISCHARGE_FAILED])){
						_this.sprites.player.setIndex(0);
					}
					else{
						_this.sprites.player.setIndex(1);
					}
					_this.sprites.player.SetPosition(100-_this.chargingCount/512,100);

					_this.labels.chargedPower.setString(	"Charged: "	+ _this.chargedPower	);
					_this.labels.seq.setString(				"Sequence: "+ _this.sequence		);
					_this.labels.aiming.setString(			"Aiming: "	+ _this.aiming.position	);
					_this.labels.emittingPower.setString(	"Emitting: "+ _this.emittingPower	);
					return true;
				},
			}),
		};

		/** ラベル */
		this.labels	= {
			chargedPower	: null,
			seq				: null,
			aiming			: null,
			emittingPower	: null,
		}

		/** イベントリスナ */
		this.listeners	= {
			/** インパクトフェイズ */
			impact	: cc.EventListener.create({
				event		: cc.EventListener.TOUCH_ONE_BY_ONE,
				onTouchBegan: function(touch,event){
					switch(_this.sequence){
						case Sequences.INITIAL:		_this.SetSequence(Sequences.START_AIM);		break;
						case Sequences.START_AIM:	_this.SetSequence(Sequences.PRELIMINARY);	break;
						default:
					}
					return true;
				},
				onTouchEnded	: function(touch,event)	{
					switch(_this.sequence){
						case Sequences.PRELIMINARY:
							_this.SetSequence(Sequences.DISCHARGE);
							_this.chargedPower		= _this.chargingCount;
							_this.dischargeSpeed	= BlowPower.DISCHARGE_SPEED;
							break;
						default:
					}
				},
				onTouchCanceled	: function(touch,event)	{
					switch(_this.sequence){
						case Sequences.PRELIMINARY:	_this.SetSequence(Sequences.DISCHARGE_FAILED);	break;
						default:
					}
				},
			}),
			/** エミットエナジーフェイズ */
			emitEnergy	: cc.EventListener.create({
				event		: cc.EventListener.MOUSE,
				onMouseDown: function(touch,event){
					switch(_this.sequence){
						case Sequences.EMIT:
							_this.emittingPower++;
							break;
						default:
					}
					return true;
				},
			}),
			/** ブローフェイズ */
			blowAway	: cc.EventListener.create({
				event		: cc.EventListener.MOUSE,
				onMouseDown: function(touch,event){
					switch(_this.sequence){
						default:
					}
					return true;
				},
			}),
			/** リセット */
			reset		:cc.EventListener.create({
				event		: cc.EventListener.KEYBOARD,
				onKeyReleased: function(code,event){
					if(code==82){
						debug("[DEBUG] Reset Scene ----------");
						_this.SetSequence(Sequences.INITIAL);
						_this.SetLayer(LinkedLayerTags.MAIN,_this.ccLayers.impact);
					}
				},
			}),
		};

		//シーケンス-イベント対応設定
		Sequences.INITIAL.SetEventListeners(			[this.listeners.impact,		this.listeners.reset,	]);
		Sequences.START_AIM.SetEventListeners(			[this.listeners.impact,		this.listeners.reset,	]);
		Sequences.PRELIMINARY.SetEventListeners(		[this.listeners.impact,		this.listeners.reset,	]);
		Sequences.DISCHARGE.SetEventListeners(			[this.listeners.impact,		this.listeners.reset,	]);
		Sequences.IMPACTED.SetEventListeners(			[this.listeners.impact,		this.listeners.reset,	]);
		Sequences.EMIT.SetEventListeners(				[this.listeners.emitEnergy,	this.listeners.reset,	]);
		Sequences.BLOW_AWAY.SetEventListeners(			[this.listeners.reset,	]);
		Sequences.MEASURE.SetEventListeners(			[this.listeners.reset,	]);
		Sequences.DISCHARGE_FAILED.SetEventListeners(	[this.listeners.reset,	]);

	}

}//class


})();	//File Scope



