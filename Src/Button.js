var Button	= Button||{};
(function(){	//File Scope

/********************************************************************************
 * ButtonItemクラスのコンテナ
 * @class Button
 ********************************************************************************/
Button	= class Button{

	static get OFF() 	{return 0x01}
	static get ON()		{return 0x02}
	static get HOVER()	{return 0x04}

	constructor(nItems=1){
		this.items	= [];
		for(let i=0; i<nItems; ++i){
			this.items[i]	= new ButtonItem(this);
		}

		this.x	= 0;
		this.y	= 0;
		this.scale	= 1.0;
		this.scaleAtOn	= 0.9;
		this.layer	= null;
		this.listener	- null;
	}

	/** インスタンス生成
	 * @static
	 * @returns
	 * @memberof Button
	 */
	static CreateInstance(nItems){
		return new this(nItems);
	}

	/** レイヤに自身を追加
	 * @param {Number} idx
	 * @param {*} layer
	 * @returns this
	 * @memberof Button
	 */
	AddToLayer(layer){
		if(layer==null)	return this;
		this.layer	= layer;
		this.forEach(v=>v.AddToLayer(layer));
		return this;
	}

	/** 初期化
	 * @returns this
	 */
	Init(){
		this.forEach(v=>v.Init());
		return this;
	}

	/** 任意の要素を１つ取り出す
	 * @param {number|string} idx インデックスまたはタグ名
	 * @returns this
	 */
	at(idx){
		if(Number.isInteger(idx))	return this.items[idx];
		else						return this.FindWithTag(idx);
	}

	/** forEachのラッパ
	 * @param {function} predicate 述語関数
	 * @returns this
	 */
	forEach(predicate){
		this.items.forEach(predicate);
		return this;
	}

	FindWithTag(tag){
		return this.items.find(v=>v.tag===tag);
	}

	/** 座標を設定
	 * @param {number} x x座標
	 * @param {number} y y座標
	 * @returns this
	 */
	SetPosition(x,y){
		this.x	= x;
		this.y	= y;
		this.items.forEach(v=>v.Move(0,0));	//ButtonItem側でコンテナの座標を加算するためButtonItemは動かさない
		return this;
	}

	SetScale(scale=1.0){
		this.scale=scale;
		this.items.forEach(v=>SetScale(null));
		return this;
	}

	/** 相対座標を設定
	 * @param {number} x x増分
	 * @param {number} y y増分
	 * @returns this
	 */
	Move(x,y){
		return this.SetPosition(this.x+x,this.y+y);
	}

	/** 更新
	 * @returns this
	 */
	Update(dt){
		this.items.forEach(v=>v.Update(dt));
		return this;
	}

}

/********************************************************************************
 * 画像ボタンクラス
 * @class ButtonItem
 ********************************************************************************/
class ButtonItem{

	/** コンストラクタ
	 * @param {Button} container 紐付けするコンテナクラス
	 * @memberof ButtonItem
	 */
	constructor(container){
		this.sprite		= null;
		this.container	= container;
		this.x	= 0;
		this.y	= 0;
		this.Z	= 0x0100;
		this.layer	- null;
		this.scale	= 1.0;
		this.scaleAtOn	= 0.9;
		this.indexes	= {};
		this.status		= Button.OFF;
		this.listensButtonUp	= false;

		this.SetTag();
	}

	/**レイヤに自身を追加*/
	AddToLayer(layer){
		this.layer	= layer;
		if(!this.sprite)	return this;

		this.sprite.removeFromParent();
		layer.addChild(this.sprite);
		this.Apply();
		return this;
	}

	CreateSprite(res){
		this.sprite	= Sprite.CreateInstance(res);
		this.Apply();
		return this;
	}

	Apply(){
		if(!this.sprite)	return this;

		this.sprite
			.SetPosition(this.container.x+this.x,this.container.y+this.y)
			.AddToLayer(this.container.layer)
			.Attr({zIndex:this.Z});
		this._ApplyEvents();
		return this;
	}

	/**座標を設定*/
	SetPosition(x,y){
		this.x	= x;
		this.y	= y;
		return this.Apply();
	}
	/**相対座標を設定*/
	Move(x,y){
		return this.SetPosition(this.x+x,this.y+y);
	}

	/** 表示設定 */
	SetVisible(isVisible){
		this.sprite.SetVisible(isVisible);
		return this;
	}
	/** 不透明度の設定 */
	SetOpacity(opacity){
		this.sprite.SetOpacity(opacity);
		return;
	}
	/** 画像のインデックス */
	SetIndex(status,idx){
		this.indexes			= this.indexes||{};
		this.indexes[status]	= idx;
		return this._ApplyIndex();
	}
	_ApplyIndex(){
		let idx = this.indexes[this.status] || this.indexes[Button.OFF] || 0;
		this.sprite.SetIndex(idx);
		return this;
	}

	/**拡大率設定*/
	SetScale(scale,isTemp=false){
		if(scale===undefined)	scale = 1.0;
		else if(scale===null)	scale = this.scale;
		if(!isTemp)	this.scale = scale;
		this.sprite.SetScale(scale*this.container.scale);
		return this;
	}

	/** 検索用タグ */
	SetTag(tag=null){
		this.tag	= tag;
		return this;
	}

	/** イベントリスナ適用 */
	_ApplyEvents(){
		if(!this.sprite)	return this;
		this.listeners	= this.listeners || {};

		cc.eventManager.removeListeners(this.sprite.entity);
		cc.eventManager.addListener(
			cc.EventListener.create({
				event			: cc.EventListener.TOUCH_ALL_AT_ONCE,
				onTouchesBegan	: (touches,event)=>{
					if(this.sprite.entity.isVisible() && this._EventIsOnSprite(touches,event)){
						this.status			= Button.ON;
						this._ApplyIndex();
						event.stopPropagation();
						if(this.listeners.onTouchBegan)	this.listeners.onTouchBegan();
						this.SetScale(this.scale*this.scaleAtOn,true);
					}
					return true;
				},
				onTouchesEnded	: (touches,event)=>{
					if(this.status==Button.ON && this.sprite.entity.isVisible() && this._EventIsOnSprite(touches,event)){
						event.stopPropagation();
						if(this.listeners.onTouchEnded)	this.listeners.onTouchEnded();
						if(this.listeners.onButtonUp)	this.listensButtonUp	= true;
					}
					this.sprite.RunAction(cc.ScaleTo.create(0.2,this.scale));
					this.status			= Button.OFF;
					this._ApplyIndex();
				},
				onTouchesCanceled	: (touches,event)=>{
					this.sprite.RunAction(cc.ScaleTo.create(0.2,this.scale));
					this.status			= Button.OFF;
					this._ApplyIndex();
				}
			}),
			this.sprite.entity
		);
		cc.eventManager.addListener(
			cc.EventListener.create({
				event			: cc.EventListener.MOUSE,
				onMouseMove	: (event)=>{
					if(this.status & (Button.OFF|Button.HOVER) && this.sprite.entity.isVisible() && this._EventIsOnSprite(null,event)){
						this.status			= Button.HOVER;
						this._ApplyIndex();
						if(this.listeners.onMouseHover)	this.listeners.onMouseHover();
					}
					else if(this.status==Button.HOVER){
						this.status			= Button.OFF;
						this._ApplyIndex();
					}
					return;
				}
			}),
			this.sprite.entity
		);
		return this;
	}

	/**イベントはスプライト上で発生しているか*/
	_EventIsOnSprite(touches,event){
		if(!Array.isArray(touches))	touches	= [touches];
		return !!touches.some(touch=>{
			const target		= event.getCurrentTarget();
			const pointer		= touch || event;
			const location		= target.convertToNodeSpace(pointer.getLocation());
			const spriteSize	= target.getContentSize();
			const spriteRect	= cc.rect(0,0,spriteSize.width,spriteSize.height);
			return !!cc.rectContainsPoint(spriteRect,location);
		});
	}

	Update(dt){
		if(this.listensButtonUp && this.listeners.onButtonUp && !this.sprite.IsRunningActions()){
			this.listeners.onButtonUp();
			this.listensButtonUp	= false;
		}
		return this;
	}

	/** タッチ開始のコールバックを設定
	 * @param {function} [callback=null] コールバック関数
	 * @returns this
	 * @memberof ButtonItem
	 */
	OnTouchBegan(callback=null){
		this.listeners	= this.listeners||{};
		this.listeners.onTouchBegan	= callback;
		this._ApplyEvents();
		return this;
	}
	/** タッチ終了のコールバックを設定
	 * @param {function} [callback=null] コールバック関数
	 * @returns this
	 * @memberof ButtonItem
	 */
	OnTouchEnded(callback=null){
		this.listeners	= this.listeners||{};
		this.listeners.onTouchEnded	= callback;
		this._ApplyEvents();
		return this;
	}
	/** マウスホバーのコールバックを設定
	 * @param {function} [callback=null] コールバック関数
	 * @returns this
	 * @memberof ButtonItem
	 */
	OnMouseHover(callback=null){
		this.listeners	= this.listeners||{};
		this.listeners.onMouseHover	= callback;
		this._ApplyEvents();
		return this;
	}
	/** ボタンアップのコールバックを設定
	 * @param {function} [callback=null] コールバック関数
	 * @returns this
	 * @memberof ButtonItem
	 */
	OnButtonUp(callback=null){
		this.listeners	= this.listeners||{};
		this.listeners.onButtonUp	= callback;
		this._ApplyEvents();
		return this;
	}
}

})();	//File Scope
