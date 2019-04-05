/* *******************************************************************************
	シーン基本クラス
********************************************************************************/
var Scenes	= Scenes || {};
var cc;

/** シーン基本クラス */
Scenes.SceneBase	= class {

	constructor(){

		/** @var number シーン内のシークエンス */
		this.sequence			= 0;
		/** @var {boolean} シークエンス遷移が可能か */
		this.isSequenceMovable	= false;
		/** @var シーン開始からのカウント */
		this.count				= 0;

		/** @var cc.Layer cc.Sceneインスタンス */
		this.ccSceneInstance	= null;
		/** @var cc.Layerに渡すためのレイヤコンテナ*/
		this.ccLayers	= {};
		/** @var cc.Layerインスタンスのコンテナ */
		this.ccLayerInstances	= {};

		/** @var Spriteクラスのコンテナ*/
		this.sprites	= {};
		/** @var Labelクラスのコンテナ*/
		this.labels		= {};
		/** @var イベントリスナのコンテナ*/
		this.listeners	= {};
	}

	/** シーンの更新処理 共通部分
	 * @param {*} dt
	 */
	OnUpdating(dt){return this;}
	/** シーンの更新処理 共通部分
	 * @param {*} dt
	 */
	OnUpdated(dt){
		++this.count;
		return this;
	}

	/** Create Instance */
	static Create(){return new this();}
	/** Get cc.Scene Instance */
	GetCcSceneInstance(){return this.ccSceneInstance;	}

	/** レイヤ内容の変更
	 * @param {*} layerTag,
	 * @param {*} nextLayerInstance
	 * @param {Number} zOrder Zオーダー
	 */
	SetLayer(layerTag,nextLayer,zOrder=0){
		if(!nextLayer)	return null;

		if(this.ccLayerInstances[layerTag]){
			this.ccLayerInstances[layerTag].unscheduleUpdate();
			this.ccSceneInstance.removeChildByTag(layerTag);
		}
		this.ccLayerInstances[layerTag]	= new nextLayer();
		this.ccSceneInstance.addChild(this.ccLayerInstances[layerTag], zOrder, layerTag	);

		return this.ccLayerInstances[layerTag];
	}


	/** シークエンスの変更
	 * @param {*} nextSeq 次のシークエンス
	 * @param {boolean} [isForce=false] 同一シークエンスの場合でも強制的に変更する
	 * @returns this
	 */
	SetSequence(nextSeq,isForce=true){
		if(!isForce && this.sequence===nextSeq)	return this;

		this.sequence	= nextSeq;
		this.sequence.Init();

		return this;
	}

	/** シークエンス初期化
	 * @param {*} initialSeq シークエンス初期値
	 * @param {*} seqContainer シークエンスのコンテナ
	 * @param {*} layerInstance イベントリスナの対象レイヤ
	 * @returns
	 */
	InitSequence(initialSeq,seqContainer,layerInstance){
		this.sequence	= initialSeq;
		for(let i in seqContainer){
			seqContainer[i].SetListenerTarget(layerInstance);
		}
		return this;
	}

	/** レイヤに背景色を設定
	 * @param {*} layer
	 * @param {*} color
	 * @returns this
	 */
	SetBackgroundColor(layer,color){
		const size	= cc.director.getWinSize();
		layer.addChild(new cc.LayerColor(typeof color==='string'?cc.color(color):color, size.width,size.height));
		return this;
	}

	/** レイヤ一覧初期化
	 * @returns this
	 */
	InitLayers(){
		this.ccLayers	= null;
		this.AddEventListerProperties("touchFx",{
			ctor:function(){
				this._super();
				this.scheduleUpdate();

				const size	= cc.director.getWinSize();
				let button	= new ccui.Button(`${rc.DIRECTORY}${rc.img.resetIcon[0]}`);
			
				button.setPosition(0+16+2,size.height-16-2);
				button.setScale(1);
				button.setOpacity(128);
				button.setContentSize(32,32);
				button.addTouchEventListener(this.listeners.resetButton,layer);
				layer.addChild(button);

				return true;
			},
			update	: function(dt){
				this._super();
			},
		});
		return this;
	}
	/** レイヤ一覧にレイヤ追加
	 * @param {string} key レイヤ一覧のキー
	 * @param {object} layerProperties 追加するcc.Layerのプロパティ
	 * @returns this
	 */
	AddLayer(key,layerProperties){
		this.ccLayers[key]	= cc.Layer.extend(layerProperties);
		return this;
	}

	/** イベントリスナ一覧初期化
	 * @returns this
	 */
	InitEventListeners(){
		this.listeners	= null;
		this.AddEventListerProperties("touched",{
			event			: cc.EventListener.TOUCH_ALL_AT_ONCE,
			onTouchesBegan	: (touches,event)=>{
				for(let t of touches){
					const pos	= t.getLocation();
					this.touchedEffect.Spawn(pos.x,pos.y);
				}
				return true;
			},
		});
		return this;
	}
	/** イベントリスナ一覧にイベントリスナ追加（生イベントリスナ）
	 * @param {*} key
	 * @param {*} rawEventListener イベントリスナ
	 * @returns this
	 */
	AddEventLister(key,rawEventListener){
		this.listeners[key]	= rawEventListener
		return this;
	}
	/** イベントリスナ一覧にイベントリスナ追加（プロパティで追加）
	 * @param {*} key イベントリスナ一覧のキー
	 * @param {*} listerProperties 追加するcc.EventListenerのプロパティ
	 * @returns this
	 */
	AddEventListerProperties(key,listerProperties){
		this.listeners[key]	= cc.EventListener.create(listerProperties);
		return this;
	}

}//class
