/* Shared card toolkit for Solitaire, FreeCell and Hearts. Original card art, no libraries. */
(function(){
  const T=window.TJCards={};
  /* suit order matches the classic Microsoft deal: clubs, diamonds, hearts, spades */
  T.SUITS=['♣︎','♦︎','♥︎','♠︎'];
  T.RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  T.isRed=s=>s===1||s===2;

  const css=`
.tjc-board{position:relative;background:#0a6b46;box-shadow:var(--sunken);touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
.tjc-board .card{position:absolute;width:var(--cw);height:var(--ch);background:#fff;color:#111;
  clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);
  box-shadow:inset 0 0 0 1px #111,inset 2px 2px 0 #fff;font:700 calc(var(--cw)*.27)/1 var(--pixel);cursor:pointer}
.tjc-board .card.red{color:#c0392b}
.tjc-board .card .tl{position:absolute;left:calc(var(--cw)*.08);top:calc(var(--cw)*.06);display:flex;flex-direction:row;align-items:center;gap:calc(var(--cw)*.03);line-height:1;white-space:nowrap}
.tjc-board .card .tl i{font-style:normal;font-size:.9em}
.tjc-board .card .mid{position:absolute;left:0;right:0;top:50%;transform:translateY(-38%);text-align:center;font-size:calc(var(--cw)*.55);line-height:1}
.tjc-board .card.back{background:repeating-conic-gradient(#1f6f63 0 25%,#2a7a6f 0 50%) 0 0/8px 8px;box-shadow:inset 0 0 0 3px #fff,inset 0 0 0 4px #111}
.tjc-board .card.back *{display:none}
.tjc-board .card.drag{z-index:2000;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.35));transition:none}
.tjc-board .card.sel{outline:0;box-shadow:inset 0 0 0 1px #111,inset 0 0 0 3px #d4af77}
.tjc-board .card.dim{filter:brightness(.62)}
.tjc-board .slot{position:absolute;width:var(--cw);height:var(--ch);border:2px solid rgba(255,255,255,.3);
  clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);
  display:grid;place-items:center;color:rgba(255,255,255,.4);font:700 calc(var(--cw)*.5)/1 var(--pixel);cursor:pointer}
.tjc-over{position:absolute;inset:0;display:none;place-items:center;background:rgba(0,0,0,.45);z-index:3000;text-align:center;padding:12px}
.tjc-over.open{display:grid}
.tjc-over div{background:var(--face);box-shadow:var(--win);padding:16px 20px;display:grid;gap:10px;justify-items:center}
.tjc-over h3{font:700 22px/1.1 var(--pixel)}
`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  /* card = {r:0..12, s:0..3, up:bool} */
  T.cardEl=function(c,extra){
    const e=document.createElement('div');
    e.className='card'+(T.isRed(c.s)?' red':'')+(c.up===false?' back':'')+(extra?' '+extra:'');
    const rk=T.RANKS[c.r],su=T.SUITS[c.s];
    e.innerHTML=`<span class="tl"><b>${rk}</b><i>${su}</i></span><span class="mid">${c.r>9?rk:su}</span>`;
    e.setAttribute('aria-label',c.up===false?'face-down card':rk+' of '+['clubs','diamonds','hearts','spades'][c.s]);
    return e;
  };
  T.sizeCards=function(board,cols,gap,min,max){
    const w=board.clientWidth||board.parentElement.clientWidth||420;
    const cw=Math.max(min||34,Math.min(max||64,Math.floor((w-gap*(cols+1))/cols)));
    board.style.setProperty('--cw',cw+'px');board.style.setProperty('--ch',Math.round(cw*1.4)+'px');
    return{cw,ch:Math.round(cw*1.4),gap};
  };
  T.fresh=()=>{const d=[];for(let s=0;s<4;s++)for(let r=0;r<13;r++)d.push({r,s,up:false});return d};
  T.shuffle=function(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

  /* The classic numbered FreeCell deal. Returns 52 cards in dealing order. */
  T.msDeal=function(n){
    let seed=n>>>0;const rand=()=>{seed=(Math.imul(seed,214013)+2531011)>>>0;return(seed>>>16)&0x7fff};
    const cards=[];for(let i=0;i<52;i++)cards.push(i);
    const deck=[];let left=52;
    for(let i=0;i<52;i++){const j=rand()%left;deck.push(cards[j]);cards[j]=cards[--left]}
    return deck.map(id=>({r:Math.floor(id/4),s:id%4,up:true}));
  };

  /* Pointer drag + click + double-click for card boards.
     o.pick(el)->{key,els,noDrag?,noDbl?}|null  o.targets()->[{key,x,y,w,h}] (board coords)
     o.drop(info,key)->bool  o.click(info)  o.dbl(info)  o.rerender() */
  T.attachDrag=function(board,o){
    let d=null,tap={t:0,key:''};
    board.addEventListener('pointerdown',e=>{
      const el=e.target.closest('.card,.slot');if(!el||(e.pointerType==='mouse'&&e.button!==0))return;
      const info=o.pick(el);if(!info)return;
      e.preventDefault();
      d={info,els:info.els||[el],sx:e.clientX,sy:e.clientY,moved:false};
      try{board.setPointerCapture(e.pointerId)}catch(_){}
    });
    board.addEventListener('pointermove',e=>{
      if(!d||d.info.noDrag)return;
      const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
      if(!d.moved&&Math.hypot(dx,dy)<5)return;
      d.moved=true;
      d.els.forEach((x,i)=>{x.classList.add('drag');x.style.transform=`translate(${dx}px,${dy}px)`;x.style.zIndex=2000+i});
    });
    const end=e=>{
      if(!d)return;const {info,els,moved}=d;d=null;
      if(!moved){
        const now=Date.now();
        if(!info.noDbl&&tap.key===info.key&&now-tap.t<420){tap={t:0,key:''};o.dbl&&o.dbl(info)}
        else{tap={t:now,key:info.key};o.click&&o.click(info)}
        return;
      }
      const br=board.getBoundingClientRect(),r=els[0].getBoundingClientRect();
      const a={x:r.left-br.left,y:r.top-br.top,w:r.width,h:r.height};
      let best=null,bo=0;
      o.targets().forEach(t=>{
        const ox=Math.max(0,Math.min(a.x+a.w,t.x+t.w)-Math.max(a.x,t.x)),oy=Math.max(0,Math.min(a.y+a.h,t.y+t.h)-Math.max(a.y,t.y));
        const ov=ox*oy;if(ov>bo){bo=ov;best=t}
      });
      const ok=best&&o.drop(info,best.key);
      if(!ok)o.rerender();
    };
    board.addEventListener('pointerup',end);
    board.addEventListener('pointercancel',()=>{if(d){d=null;o.rerender()}});
  };
})();
