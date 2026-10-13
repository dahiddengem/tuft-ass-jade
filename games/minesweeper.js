/* Minesweeper: original implementation, Desktop 98 look. */
(function(){
  const G=window.TJGames=window.TJGames||{};
  const LEVELS={beginner:{c:9,r:9,m:10,n:'Beginner'},intermediate:{c:16,r:16,m:40,n:'Intermediate'},expert:{c:30,r:16,m:99,n:'Expert'}};
  const svg=s=>'url("data:image/svg+xml,'+encodeURIComponent(s)+'")';
  const MINE=svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M7 1h2v3H7zM7 12h2v3H7zM1 7h3v2H1zM12 7h3v2h-3zM3 3h2v2H3zM11 3h2v2h-2zM3 11h2v2H3zM11 11h2v2h-2z" fill="#111"/><rect x="4" y="4" width="8" height="8" fill="#111"/><rect x="3" y="5" width="10" height="6" fill="#111"/><rect x="5" y="5" width="2" height="2" fill="#fff"/></svg>');
  const FLAG=svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="2" width="2" height="9" fill="#111"/><rect x="4" y="12" width="8" height="2" fill="#111"/><path d="M3 4l4-2v5z" fill="#c0392b"/><rect x="5" y="3" width="3" height="3" fill="#c0392b"/></svg>');
  const face=(m)=>svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="1" width="10" height="14" fill="#111"/><rect x="1" y="3" width="14" height="10" fill="#111"/><rect x="2" y="2" width="12" height="12" fill="#f6d84a"/><rect x="3" y="1" width="10" height="1" fill="#f6d84a"/><rect x="3" y="14" width="10" height="1" fill="#f6d84a"/>'+m+'</svg>');
  const FACES={
    ok:face('<rect x="5" y="5" width="2" height="2" fill="#111"/><rect x="9" y="5" width="2" height="2" fill="#111"/><rect x="4" y="9" width="1" height="1" fill="#111"/><rect x="5" y="10" width="6" height="1" fill="#111"/><rect x="11" y="9" width="1" height="1" fill="#111"/>'),
    ooh:face('<rect x="5" y="5" width="2" height="2" fill="#111"/><rect x="9" y="5" width="2" height="2" fill="#111"/><rect x="7" y="9" width="2" height="3" fill="#111"/>'),
    dead:face('<path d="M4 4h1v1h1v1H5V5H4zM6 4h1v1H6zM9 4h1v1h1v1h-1V5H9zM11 4h1v1h-1zM4 6h1v1H4zM6 6h1v1H6zM9 6h1v1H9zM11 6h1v1h-1z" fill="#111"/><rect x="5" y="10" width="6" height="1" fill="#111"/><rect x="4" y="11" width="1" height="1" fill="#111"/><rect x="11" y="11" width="1" height="1" fill="#111"/>'),
    cool:face('<rect x="3" y="5" width="10" height="2" fill="#111"/><rect x="4" y="9" width="1" height="1" fill="#111"/><rect x="5" y="10" width="6" height="1" fill="#111"/><rect x="11" y="9" width="1" height="1" fill="#111"/>')
  };
  const NUM=['','#0000ff','#008000','#ff0000','#000080','#800000','#008080','#111','#808080'];
  const CSS=`
.ms-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px;margin-bottom:6px;background:var(--face);box-shadow:var(--sunken)}
.ms-lcd{min-width:54px;padding:2px 6px;background:#000;color:#ff2a2a;font:700 26px/1 var(--pixel);letter-spacing:.06em;text-align:right;box-shadow:var(--sunken)}
.ms-face{box-sizing:border-box;border:0;padding:0;width:38px;height:38px;background:var(--face) center/30px no-repeat;box-shadow:var(--raised);cursor:pointer}
.ms-face:active{box-shadow:var(--pressed)}
.ms-grid{display:grid;width:max-content;background:var(--face);box-shadow:var(--sunken);padding:3px;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.ms-c{box-sizing:border-box;width:var(--ms);height:var(--ms);border:0;padding:0;background:var(--face) center/70% no-repeat;box-shadow:var(--raised);font:700 calc(var(--ms)*.72)/1 var(--pixel);cursor:pointer;display:grid;place-items:center}
.ms-c.o{box-shadow:inset 1px 1px 0 var(--shadow);background-color:#c0c0c0;cursor:default}
.ms-c.f{background-image:${FLAG}}
.ms-c.m{box-shadow:inset 1px 1px 0 var(--shadow);background-image:${MINE};background-color:#c0c0c0}
.ms-c.x{background-color:#ff3b30}
.ms-c.w{box-shadow:inset 1px 1px 0 var(--shadow);background-image:${MINE};background-color:#c0c0c0;position:relative}
.ms-c.w::after{content:"";position:absolute;inset:2px;background:linear-gradient(45deg,transparent 45%,#e02020 45% 55%,transparent 55%),linear-gradient(-45deg,transparent 45%,#e02020 45% 55%,transparent 55%)}
.ms-wrap{overflow:auto;max-width:100%}
`;
  G.minesweeper={init(root,win){
    const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    root.classList.add('tjg');
    root.innerHTML=`<div class="gbar" role="group" aria-label="Difficulty"></div>
      <div class="ms-top"><div class="ms-lcd" id="ms-m" aria-label="Mines left">010</div><button class="ms-face" id="ms-face" aria-label="New game"></button><div class="ms-lcd" id="ms-t" aria-label="Time">000</div></div>
      <div class="ms-wrap"><div class="ms-grid" id="ms-grid" role="grid" aria-label="Minefield"></div></div>
      <div class="gstat"><span id="ms-s">Left click digs. Right click flags. Click a number to clear around it.</span></div>`;
    const bar=root.querySelector('.gbar'),grid=root.querySelector('#ms-grid'),faceB=root.querySelector('#ms-face'),
      lm=root.querySelector('#ms-m'),lt=root.querySelector('#ms-t'),stat=root.querySelector('#ms-s');
    let lvl='beginner',L=LEVELS[lvl],cells=[],started=false,over=false,flags=0,time=0,timer=0,flagMode=false,opened=0;
    const lvlBtns={};
    Object.keys(LEVELS).forEach(k=>{const b=document.createElement('button');b.className='btn gem-cut sm';b.textContent=LEVELS[k].n;b.onclick=()=>{lvl=k;newGame()};bar.appendChild(b);lvlBtns[k]=b});
    const fm=document.createElement('button');fm.className='btn gem-cut sm';fm.textContent='Flag: off';fm.setAttribute('aria-pressed','false');
    fm.onclick=()=>{flagMode=!flagMode;fm.textContent='Flag: '+(flagMode?'on':'off');fm.setAttribute('aria-pressed',flagMode)};
    bar.appendChild(fm);
    const pad=n=>n<0?'-'+String(Math.min(99,-n)).padStart(2,'0'):String(Math.min(999,n)).padStart(3,'0');
    function setFace(k){faceB.style.backgroundImage=FACES[k]}
    function paint(i){
      const c=cells[i],e=grid.children[i];
      let cls='ms-c',txt='';
      if(c.open){cls+=' o';if(c.m)cls+=' m x';else if(c.n){txt=c.n;e.style.color=NUM[c.n]}}
      else if(over&&c.m&&!c.flag)cls+=' m';
      else if(over&&c.flag&&!c.m)cls+=' w';
      else if(c.flag)cls+=' f';
      e.className=cls;e.textContent=txt;
    }
    function newGame(){
      clearInterval(timer);L=LEVELS[lvl];started=over=false;flags=time=opened=0;
      Object.keys(lvlBtns).forEach(k=>lvlBtns[k].setAttribute('aria-pressed',k===lvl));
      const size=window.matchMedia('(max-width:820px)').matches?(L.c>16?20:26):(L.c>16?22:26);
      grid.style.setProperty('--ms',size+'px');grid.style.gridTemplateColumns=`repeat(${L.c},${size}px)`;
      grid.innerHTML='';cells=[];
      for(let i=0;i<L.c*L.r;i++){cells.push({m:false,n:0,open:false,flag:false});const b=document.createElement('button');b.className='ms-c';b.dataset.i=i;b.setAttribute('aria-label','Hidden cell');grid.appendChild(b)}
      lm.textContent=pad(L.m);lt.textContent='000';setFace('ok');
      win.style.width=Math.max(380,L.c*size+60)+'px';
      stat.textContent='Left click digs. Right click flags. Click a number to clear around it.';
    }
    const nb=i=>{const x=i%L.c,y=(i/L.c)|0,o=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<L.c&&ny<L.r)o.push(ny*L.c+nx)}return o};
    function plant(safe){
      const bad=new Set([safe,...nb(safe)]);let left=L.m;
      while(left){const i=Math.floor(Math.random()*cells.length);if(cells[i].m||bad.has(i))continue;cells[i].m=true;left--}
      cells.forEach((c,i)=>c.n=nb(i).filter(j=>cells[j].m).length);
    }
    function reveal(i){
      const stack=[i];
      while(stack.length){
        const k=stack.pop(),c=cells[k];
        if(c.open||c.flag)continue;
        c.open=true;opened++;
        if(c.m){lose(k);return}
        paint(k);
        if(!c.n)nb(k).forEach(j=>{if(!cells[j].open&&!cells[j].flag)stack.push(j)});
      }
      if(opened===cells.length-L.m)win_();
    }
    function lose(k){
      over=true;clearInterval(timer);setFace('dead');
      cells.forEach((c,i)=>{if(i===k)return;paint(i)});paint(k);
      stat.textContent='Boom. Hit the face to try again.';
    }
    function win_(){
      over=true;clearInterval(timer);setFace('cool');
      cells.forEach((c,i)=>{if(c.m&&!c.flag){c.flag=true}});flags=L.m;lm.textContent=pad(0);
      cells.forEach((c,i)=>paint(i));
      stat.textContent=`Cleared in ${time} seconds. Nice.`;
    }
    function dig(i){
      if(over)return;const c=cells[i];
      if(c.flag)return;
      if(!started){started=true;plant(i);timer=setInterval(()=>{time++;lt.textContent=pad(time)},1000)}
      if(c.open){ /* chord */
        if(!c.n)return;
        const ns=nb(i);if(ns.filter(j=>cells[j].flag).length!==c.n)return;
        ns.forEach(j=>{if(!cells[j].open&&!cells[j].flag&&!over)reveal(j)});return;
      }
      reveal(i);
    }
    function flag(i){
      if(over)return;const c=cells[i];if(c.open)return;
      c.flag=!c.flag;flags+=c.flag?1:-1;lm.textContent=pad(L.m-flags);paint(i);
    }
    const idx=e=>{const b=e.target.closest('.ms-c');return b?+b.dataset.i:-1};
    let pressTimer=0,longFired=false;
    grid.addEventListener('contextmenu',e=>{e.preventDefault();const i=idx(e);if(i>=0)flag(i)});
    grid.addEventListener('pointerdown',e=>{
      longFired=false;
      if(!over)setFace('ooh');
      if(e.pointerType==='touch'){const i=idx(e);if(i<0)return;pressTimer=setTimeout(()=>{longFired=true;flag(i);if(navigator.vibrate)navigator.vibrate(15)},420)}
    });
    const up=()=>{clearTimeout(pressTimer);if(!over)setFace('ok')};
    grid.addEventListener('pointerup',up);grid.addEventListener('pointerleave',up);grid.addEventListener('pointercancel',up);
    grid.addEventListener('click',e=>{
      const i=idx(e);if(i<0)return;
      if(longFired){longFired=false;return}
      if(flagMode&&!cells[i].open)flag(i);else dig(i);
    });
    grid.addEventListener('auxclick',e=>{if(e.button===1){e.preventDefault();const i=idx(e);if(i>=0&&cells[i].open)dig(i)}});
    faceB.onclick=newGame;
    newGame();
  }};
})();
