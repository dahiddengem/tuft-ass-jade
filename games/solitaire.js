/* Klondike Solitaire: original implementation. Draw 1 or draw 3, drag or double-click. */
(function(){
  const G=window.TJGames=window.TJGames||{};
  G.solitaire={init(root,win){
    const C=window.TJCards;
    root.classList.add('tjg');
    root.innerHTML=`<div class="gbar"><button class="btn gem-cut sm" id="so-new">New game</button><button class="btn gem-cut sm" id="so-undo" disabled>Undo</button><button class="btn gem-cut sm" id="so-draw" aria-pressed="false">Draw 1</button><span class="gsp"></span></div>
      <div class="tjc-board" id="so-board"><div class="tjc-over" id="so-over"><div><h3>You won!</h3><p id="so-fin"></p><button class="btn primary gem-cut" id="so-again">Deal again</button></div></div></div>
      <div class="gstat"><span id="so-score">Score: 0</span><span id="so-moves">Moves: 0</span></div>`;
    const board=root.querySelector('#so-board'),over=root.querySelector('#so-over');
    const bNew=root.querySelector('#so-new'),bUndo=root.querySelector('#so-undo'),bDraw=root.querySelector('#so-draw');
    let S=null,hist=[],draw3=false,L=null;
    const clone=o=>JSON.parse(JSON.stringify(o));

    function deal(){
      const d=C.shuffle(C.fresh());
      S={stock:[],waste:[],found:[[],[],[],[]],tab:[[],[],[],[],[],[],[]],score:0,moves:0};
      for(let i=0;i<7;i++)for(let j=0;j<=i;j++){const c=d.pop();c.up=j===i;S.tab[i].push(c)}
      S.stock=d;hist=[];over.classList.remove('open');render();
    }
    const red=c=>C.isRed(c.s);
    function push(){hist.push(clone(S));if(hist.length>200)hist.shift()}
    function undo(){if(hist.length){S=hist.pop();render()}}

    /* layout: 7 columns */
    function layout(){
      L=C.sizeCards(board,7,10,34,66);
      L.x=c=>L.gap+c*(L.cw+L.gap);
      L.top=L.gap;L.tabTop=L.gap*2+L.ch;
      L.dDown=Math.max(8,Math.round(L.cw*.2));L.dUp=Math.max(14,Math.round(L.cw*.36));
    }
    function pos(e,x,y,z){e.style.left=x+'px';e.style.top=y+'px';e.style.zIndex=z||1;e.style.transform=''}
    function render(){
      layout();board.querySelectorAll('.card,.slot').forEach(n=>n.remove());
      const slot=(k,x,y,t)=>{const s=document.createElement('div');s.className='slot';s.dataset.pile=k;s.textContent=t||'';pos(s,x,y,0);board.appendChild(s);return s};
      /* stock + waste */
      slot('stock',L.x(0),L.top,S.stock.length||!S.waste.length?'':'↻');
      if(!S.stock.length&&S.waste.length)board.querySelector('.slot[data-pile=stock]').textContent='↻';
      S.stock.forEach((c,i)=>{if(i<S.stock.length-1&&i>2)return;const e=C.cardEl({...c,up:false});e.dataset.pile='stock';e.dataset.i=i;pos(e,L.x(0),L.top,i+1);board.appendChild(e)});
      const shown=draw3?S.waste.slice(-3):S.waste.slice(-1);const base=S.waste.length-shown.length;
      shown.forEach((c,k)=>{const i=base+k;const e=C.cardEl({...c,up:true});e.dataset.pile='waste';e.dataset.i=i;pos(e,L.x(1)+k*Math.round(L.cw*.28),L.top,i+1);board.appendChild(e)});
      /* foundations */
      for(let f=0;f<4;f++){
        slot('f'+f,L.x(3+f),L.top,f===0?'A':'');
        S.found[f].forEach((c,i)=>{if(i<S.found[f].length-1&&i>0)return;const e=C.cardEl({...c,up:true});e.dataset.pile='f'+f;e.dataset.i=i;pos(e,L.x(3+f),L.top,i+1);board.appendChild(e)});
      }
      /* tableau */
      let maxY=0;
      for(let t=0;t<7;t++){
        slot('t'+t,L.x(t),L.tabTop,'');
        let y=L.tabTop;
        S.tab[t].forEach((c,i)=>{
          const e=C.cardEl(c);e.dataset.pile='t'+t;e.dataset.i=i;pos(e,L.x(t),y,i+1);board.appendChild(e);
          y+=c.up?L.dUp:L.dDown;
        });
        const bottom=(S.tab[t].length?y-(S.tab[t][S.tab[t].length-1].up?L.dUp:L.dDown):L.tabTop)+L.ch;
        maxY=Math.max(maxY,bottom);
      }
      board.style.height=Math.max(L.tabTop+L.ch*2.4,maxY+L.gap*2)+'px';
      root.querySelector('#so-score').textContent='Score: '+S.score;
      root.querySelector('#so-moves').textContent='Moves: '+S.moves;
      bUndo.disabled=!hist.length;
      if(S.found.every(f=>f.length===13)){root.querySelector('#so-fin').textContent=`Final score: ${S.score} in ${S.moves} moves.`;over.classList.add('open')}
    }
    function targets(){
      const t=[];
      for(let f=0;f<4;f++)t.push({key:'f'+f,x:L.x(3+f),y:L.top,w:L.cw,h:L.ch});
      for(let k=0;k<7;k++){
        const col=S.tab[k];let y=L.tabTop;col.forEach((c,i)=>{if(i<col.length-1)y+=c.up?L.dUp:L.dDown});
        t.push({key:'t'+k,x:L.x(k),y:L.tabTop,w:L.cw,h:(y-L.tabTop)+L.ch});
      }
      return t;
    }
    const pile=k=>k==='waste'?S.waste:k[0]==='f'?S.found[+k[1]]:k[0]==='t'?S.tab[+k[1]]:S.stock;
    function pick(el){
      const k=el.dataset.pile;if(!k)return null;
      if(k==='stock'){return{key:'stock',noDrag:true,noDbl:true,els:[el]}}
      const i=+el.dataset.i,p=pile(k);
      if(k==='waste'||k[0]==='f'){if(i!==p.length-1)return null;return{key:k+i,src:k,i,els:[el]}}
      if(!p[i]||!p[i].up)return null;
      const els=[...board.querySelectorAll(`.card[data-pile="${k}"]`)].filter(x=>+x.dataset.i>=i);
      return{key:k+i,src:k,i,els};
    }
    const canTab=(card,dest)=>{const p=S.tab[+dest[1]];if(!p.length)return card.r===12;const t=p[p.length-1];return t.up&&red(t)!==red(card)&&t.r===card.r+1};
    const canFound=(card,dest,single)=>{if(!single)return false;const p=S.found[+dest[1]];if(!p.length)return card.r===0;const t=p[p.length-1];return t.s===card.s&&t.r+1===card.r};
    function move(src,i,dest){
      const sp=pile(src),cards=sp.slice(i),card=cards[0];
      const ok=dest[0]==='t'?canTab(card,dest):dest[0]==='f'?canFound(card,dest,cards.length===1):false;
      if(!ok||src===dest)return false;
      push();
      sp.splice(i,cards.length);
      pile(dest).push(...cards);
      S.moves++;
      if(dest[0]==='f')S.score+=10;
      else if(src==='waste')S.score+=5;
      else if(src[0]==='f')S.score=Math.max(0,S.score-15);
      if(src[0]==='t'){const p=S.tab[+src[1]];if(p.length&&!p[p.length-1].up){p[p.length-1].up=true;S.score+=5}}
      render();return true;
    }
    function auto(info){
      if(!info||info.noDrag)return;
      const sp=pile(info.src),single=sp.length-1===info.i;
      if(single)for(let f=0;f<4;f++)if(info.src!=='f'+f&&move(info.src,info.i,'f'+f))return;
      if(info.src[0]!=='f'||true)for(let t=0;t<7;t++){if(info.src==='t'+t)continue;
        const p=S.tab[t];
        /* don't shuffle a king stack between empty columns */
        if(!p.length&&info.src[0]==='t'&&info.i===0)continue;
        if(move(info.src,info.i,'t'+t))return}
    }
    function clickStock(){
      push();S.moves++;
      if(S.stock.length){const n=draw3?3:1;for(let k=0;k<n&&S.stock.length;k++){const c=S.stock.pop();c.up=true;S.waste.push(c)}}
      else if(S.waste.length){S.stock=S.waste.reverse().map(c=>({...c,up:false}));S.waste=[];S.score=Math.max(0,S.score-(draw3?20:100))}
      else{hist.pop();S.moves--;return}
      render();
    }
    C.attachDrag(board,{
      pick,targets,rerender:render,
      drop:(info,key)=>move(info.src,info.i,key),
      click:info=>{if(info.key==='stock')clickStock()},
      dbl:auto
    });
    bNew.onclick=deal;bUndo.onclick=undo;root.querySelector('#so-again').onclick=deal;
    bDraw.onclick=()=>{draw3=!draw3;bDraw.textContent=draw3?'Draw 3':'Draw 1';bDraw.setAttribute('aria-pressed',draw3);deal()};
    win.style.width='560px';
    if('ResizeObserver'in window){let w0=0;new ResizeObserver(()=>{if(S&&board.clientWidth&&board.clientWidth!==w0){w0=board.clientWidth;render()}}).observe(board)}
    deal();
    win._tjDebug={get S(){return S},move,render};
  }};
})();
