/* FreeCell with the classic numbered deals (1 to 32000). Original implementation. */
(function(){
  const G=window.TJGames=window.TJGames||{};
  G.freecell={init(root,win){
    const C=window.TJCards;
    root.classList.add('tjg');
    root.innerHTML=`<div class="gbar"><button class="btn gem-cut sm" id="fc-new">New game</button><button class="btn gem-cut sm" id="fc-restart">Restart</button><button class="btn gem-cut sm" id="fc-undo" disabled>Undo</button><span class="gsp"></span><label>Game # <input id="fc-num" type="number" min="1" max="32000" value="1"></label><button class="btn gem-cut sm" id="fc-go">Go</button></div>
      <div class="tjc-board" id="fc-board"><div class="tjc-over" id="fc-over"><div><h3>You won!</h3><p id="fc-fin"></p><button class="btn primary gem-cut" id="fc-again">New game</button></div></div></div>
      <div class="gstat"><span id="fc-game">Game #1</span><span id="fc-moves">Moves: 0</span><span id="fc-msg">Drag cards. Double-click sends to a free cell or home.</span></div>`;
    const $=id=>root.querySelector('#'+id),board=$('fc-board'),over=$('fc-over'),bUndo=$('fc-undo'),num=$('fc-num');
    let S=null,hist=[],L=null,number=1;
    const clone=o=>JSON.parse(JSON.stringify(o));
    const red=c=>C.isRed(c.s);
    const say=t=>{$('fc-msg').textContent=t};

    function deal(n){
      number=n;const d=C.msDeal(n);
      S={free:[null,null,null,null],found:[[],[],[],[]],tab:[[],[],[],[],[],[],[],[]],moves:0};
      d.forEach((c,i)=>S.tab[i%8].push(c));
      hist=[];over.classList.remove('open');num.value=n;$('fc-game').textContent='Game #'+n;say('Drag cards. Double-click sends to a free cell or home.');render();
    }
    const randGame=()=>1+Math.floor(Math.random()*32000);
    function push(){hist.push(clone(S));if(hist.length>300)hist.shift()}
    function undo(){if(hist.length){S=hist.pop();render()}}

    function layout(){
      L=C.sizeCards(board,8,8,32,64);
      L.x=c=>L.gap+c*(L.cw+L.gap);L.top=L.gap;L.tabTop=L.gap*2+L.ch;L.d=Math.max(15,Math.round(L.cw*.36));
    }
    function pos(e,x,y,z){e.style.left=x+'px';e.style.top=y+'px';e.style.zIndex=z||1;e.style.transform=''}
    function render(){
      layout();board.querySelectorAll('.card,.slot').forEach(n=>n.remove());
      const slot=(k,x,y,t)=>{const s=document.createElement('div');s.className='slot';s.dataset.pile=k;s.textContent=t||'';pos(s,x,y,0);board.appendChild(s)};
      for(let k=0;k<4;k++){
        slot('c'+k,L.x(k),L.top,'');
        const c=S.free[k];if(c){const e=C.cardEl({...c,up:true});e.dataset.pile='c'+k;e.dataset.i=0;pos(e,L.x(k),L.top,2);board.appendChild(e)}
        slot('f'+k,L.x(4+k),L.top,'A');
        S.found[k].forEach((c,i)=>{if(i<S.found[k].length-1)return;const e=C.cardEl({...c,up:true});e.dataset.pile='f'+k;e.dataset.i=i;pos(e,L.x(4+k),L.top,i+2);board.appendChild(e)});
      }
      let maxY=0;
      for(let t=0;t<8;t++){
        slot('t'+t,L.x(t),L.tabTop,'');
        S.tab[t].forEach((c,i)=>{const e=C.cardEl({...c,up:true});e.dataset.pile='t'+t;e.dataset.i=i;pos(e,L.x(t),L.tabTop+i*L.d,i+2);board.appendChild(e)});
        maxY=Math.max(maxY,L.tabTop+Math.max(0,S.tab[t].length-1)*L.d+L.ch);
      }
      board.style.height=Math.max(L.tabTop+L.ch*3,maxY+L.gap*2)+'px';
      $('fc-moves').textContent='Moves: '+S.moves;bUndo.disabled=!hist.length;
      if(S.found.every(f=>f.length===13)){$('fc-fin').textContent=`Game #${number} solved in ${S.moves} moves.`;over.classList.add('open')}
    }
    function targets(){
      const t=[];
      for(let k=0;k<4;k++){t.push({key:'c'+k,x:L.x(k),y:L.top,w:L.cw,h:L.ch});t.push({key:'f'+k,x:L.x(4+k),y:L.top,w:L.cw,h:L.ch})}
      for(let k=0;k<8;k++)t.push({key:'t'+k,x:L.x(k),y:L.tabTop,w:L.cw,h:Math.max(0,S.tab[k].length-1)*L.d+L.ch});
      return t;
    }
    const seqOK=(p,i)=>{for(let j=i;j<p.length-1;j++){const a=p[j],b=p[j+1];if(red(a)===red(b)||a.r!==b.r+1)return false}return true};
    function pick(el){
      const k=el.dataset.pile;if(!k)return null;
      if(k[0]==='c'){if(!S.free[+k[1]])return null;return{key:k,src:k,i:0,els:[el]}}
      if(k[0]==='f')return null;
      const i=+el.dataset.i,p=S.tab[+k[1]];if(!p[i]||!seqOK(p,i))return null;
      return{key:k+i,src:k,i,els:[...board.querySelectorAll(`.card[data-pile="${k}"]`)].filter(x=>+x.dataset.i>=i)};
    }
    const cardsOf=(src,i)=>src[0]==='c'?[S.free[+src[1]]]:S.tab[+src[1]].slice(i);
    function maxMove(destKey){
      const free=S.free.filter(x=>!x).length;
      const empties=S.tab.reduce((n,p,k)=>n+(p.length===0&&('t'+k)!==destKey?1:0),0);
      return (free+1)*Math.pow(2,empties);
    }
    function canDrop(cards,dest,quiet){
      const card=cards[0];
      if(dest[0]==='c')return cards.length===1&&!S.free[+dest[1]];
      if(dest[0]==='f'){if(cards.length!==1)return false;const p=S.found[+dest[1]];if(!p.length)return card.r===0;const t=p[p.length-1];return t.s===card.s&&t.r+1===card.r}
      const p=S.tab[+dest[1]];
      if(p.length){const t=p[p.length-1];if(!(red(t)!==red(card)&&t.r===card.r+1))return false}
      if(cards.length>maxMove(dest)){if(!quiet)say('Not enough free cells or empty columns to move that many cards.');return false}
      return true;
    }
    function move(src,i,dest){
      if(src===dest)return false;
      const cards=cardsOf(src,i);if(!cards.length||!cards[0])return false;
      if(!canDrop(cards,dest))return false;
      push();
      if(src[0]==='c')S.free[+src[1]]=null;else S.tab[+src[1]].splice(i,cards.length);
      if(dest[0]==='c')S.free[+dest[1]]=cards[0];else if(dest[0]==='f')S.found[+dest[1]].push(cards[0]);else S.tab[+dest[1]].push(...cards);
      S.moves++;say('');render();return true;
    }
    function auto(info){
      if(!info)return;
      const cards=cardsOf(info.src,info.i);
      if(cards.length===1){
        for(let f=0;f<4;f++)if(canDrop(cards,'f'+f,true)&&move(info.src,info.i,'f'+f))return;
      }
      if(info.src[0]==='c'){
        /* from a free cell: try a column */
        for(let t=0;t<8;t++)if(S.tab[t].length&&canDrop(cards,'t'+t,true)&&move(info.src,info.i,'t'+t))return;
        for(let t=0;t<8;t++)if(!S.tab[t].length&&canDrop(cards,'t'+t,true)&&move(info.src,info.i,'t'+t))return;
        return;
      }
      /* from a column: best single-card step is a free cell; stacks go to a matching column */
      if(cards.length>1){for(let t=0;t<8;t++)if(S.tab[t].length&&canDrop(cards,'t'+t,true)&&move(info.src,info.i,'t'+t))return;return}
      for(let t=0;t<8;t++)if(('t'+t)!==info.src&&S.tab[t].length&&canDrop(cards,'t'+t,true)&&move(info.src,info.i,'t'+t))return;
      for(let k=0;k<4;k++)if(!S.free[k]&&move(info.src,info.i,'c'+k))return;
    }
    C.attachDrag(board,{pick,targets,rerender:render,drop:(info,key)=>move(info.src,info.i,key),click:()=>{},dbl:auto});
    $('fc-new').onclick=()=>deal(randGame());
    $('fc-again').onclick=()=>deal(randGame());
    $('fc-restart').onclick=()=>deal(number);
    $('fc-go').onclick=()=>{const n=Math.max(1,Math.min(32000,parseInt(num.value,10)||1));deal(n)};
    num.addEventListener('keydown',e=>{if(e.key==='Enter')$('fc-go').click()});
    bUndo.onclick=undo;
    win.style.width='620px';
    if('ResizeObserver'in window){let w0=0;new ResizeObserver(()=>{if(S&&board.clientWidth&&board.clientWidth!==w0){w0=board.clientWidth;render()}}).observe(board)}
    deal(randGame());
    win._tjDebug={get S(){return S},move,deal,render,canDrop};
  }};
})();
