/* Hearts vs three computer players. Passing, shooting the moon, play to 100. Original implementation. */
(function(){
  const G=window.TJGames=window.TJGames||{};
  const CSS=`
.ht-lab{position:absolute;z-index:40;background:rgba(0,0,0,.45);color:#fff;font:700 12px/1 var(--sys);padding:3px 7px;white-space:nowrap}
.ht-count{position:absolute;z-index:6;background:var(--gold);color:#2a2112;font:700 11px/1 var(--sys);padding:2px 5px}
.tjc-board .card.turn{box-shadow:inset 0 0 0 1px #111,inset 0 0 0 1px #111}
.tjc-board .card.no{cursor:not-allowed}
.tjc-board .card.shake{animation:ht-shake .25s}
@keyframes ht-shake{25%{translate:-4px 0}75%{translate:4px 0}}
.ht-sum{border-collapse:collapse;font-size:13px}
.ht-sum th,.ht-sum td{padding:3px 10px;text-align:center}
.ht-sum th{background:var(--jade-deep);color:#fff;font-weight:700}
.ht-sum td{background:#fff;box-shadow:inset 0 -1px #ddd}
`;
  const NAMES=['You','Nina','Dre','Cleo'];
  const val=c=>c.r===0?14:c.r+1;
  const isQS=c=>c.s===3&&c.r===11;
  const pts=c=>c.s===2?1:isQS(c)?13:0;
  const PASS=['left','right','across','none'];
  G.hearts={init(root,win){
    const C=window.TJCards;
    const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    root.classList.add('tjg');
    root.innerHTML=`<div class="gbar"><button class="btn gem-cut sm" id="ht-new">New game</button><button class="btn primary gem-cut sm" id="ht-pass" disabled>Pass 3 cards</button><span class="gsp"></span></div>
      <div class="tjc-board" id="ht-board"><div class="tjc-over" id="ht-over"><div><h3 id="ht-ot"></h3><div id="ht-obody"></div><button class="btn primary gem-cut" id="ht-next">Next hand</button></div></div></div>
      <div class="gstat"><span id="ht-scores"></span></div><div class="gstat"><span id="ht-msg"></span></div>`;
    const $=id=>root.querySelector('#'+id),board=$('ht-board'),over=$('ht-over'),bPass=$('ht-pass');
    let hands,total=[0,0,0,0],hand=0,phase='idle',leader=0,trick=[],tricks=0,broken=false,taken=[0,0,0,0],sel=new Set(),gen=0,L=null,passDir='left',lastTrick=null;
    const msg=t=>{$('ht-msg').textContent=t};

    function newGame(){gen++;total=[0,0,0,0];hand=0;startHand()}
    function startHand(){
      gen++;over.classList.remove('open');
      const d=C.shuffle(C.fresh());hands=[0,1,2,3].map(p=>d.slice(p*13,p*13+13).map(c=>({...c,up:true})));
      hands.forEach(sortHand);
      taken=[0,0,0,0];trick=[];tricks=0;broken=false;sel.clear();passDir=PASS[hand%4];
      if(passDir==='none'){msg('No passing this hand.');startPlay()}
      else{phase='pass';msg(`Pick 3 cards to pass ${passDir}, then press Pass 3 cards.`)}
      bPass.disabled=true;render();
    }
    function sortHand(h){h.sort((a,b)=>a.s-b.s||val(a)-val(b))}
    const has=(h,c)=>h.some(x=>x.s===c.s&&x.r===c.r);
    function aiPass(p){
      const sc=c=>isQS(c)?100:(c.s===3&&val(c)>=13)?60+val(c):c.s===2?40+val(c):val(c)>=12?30+val(c):val(c);
      return[...hands[p]].sort((a,b)=>sc(b)-sc(a)).slice(0,3);
    }
    function doPass(){
      const give=[0,1,2,3].map(p=>p===0?hands[0].filter((c,i)=>sel.has(i)):aiPass(p));
      const to=p=>passDir==='left'?(p+1)%4:passDir==='right'?(p+3)%4:(p+2)%4;
      give.forEach((g,p)=>{hands[p]=hands[p].filter(c=>!has(g,c))});
      give.forEach((g,p)=>hands[to(p)].push(...g));
      hands.forEach(sortHand);sel.clear();bPass.disabled=true;
      msg(`You passed 3 cards ${passDir}.`);startPlay();
    }
    function startPlay(){
      phase='play';trick=[];tricks=0;broken=false;
      leader=hands.findIndex(h=>h.some(c=>c.s===0&&c.r===1));
      render();step();
    }
    function legal(p){
      const h=hands[p];
      if(!trick.length){
        if(tricks===0)return h.filter(c=>c.s===0&&c.r===1);
        if(!broken){const nh=h.filter(c=>c.s!==2);if(nh.length)return nh}
        return h;
      }
      const led=trick[0].card.s,fol=h.filter(c=>c.s===led);
      if(fol.length)return fol;
      if(tricks===0){const ok=h.filter(c=>c.s!==2&&!isQS(c));if(ok.length)return ok}
      return h;
    }
    function step(){
      const g=gen;
      if(phase!=='play')return;
      if(trick.length===4){setTimeout(()=>{if(g===gen)resolve()},950);return}
      const p=(leader+trick.length)%4;
      render();
      if(p===0){msg(trick.length?'Your turn.':'Your lead.');return}
      setTimeout(()=>{if(g!==gen||phase!=='play')return;play(p,aiChoose(p))},650);
    }
    function aiChoose(p){
      const opts=legal(p),h=hands[p];
      if(opts.length===1)return opts[0];
      const lo=a=>[...a].sort((x,y)=>val(x)-val(y));
      if(!trick.length){
        /* lead low, avoid spades while the queen is out and we hold high spades */
        const safe=opts.filter(c=>!(c.s===3&&val(c)>=12)&&c.s!==2);
        return lo(safe.length?safe:opts)[0];
      }
      const led=trick[0].card.s,follow=opts.filter(c=>c.s===led);
      if(follow.length){
        const win=Math.max(...trick.filter(t=>t.card.s===led).map(t=>val(t.card)));
        const under=follow.filter(c=>val(c)<win);
        if(under.length)return lo(under).pop();
        const last=trick.length===3;
        const nq=follow.filter(c=>!isQS(c));
        const pool=nq.length?nq:follow;
        return last?lo(pool).pop():lo(pool)[0];
      }
      /* void: dump the worst card */
      const q=opts.find(isQS);if(q)return q;
      const hs=opts.filter(c=>c.s===2);if(hs.length)return lo(hs).pop();
      const big=opts.filter(c=>val(c)>=12);return lo(big.length?big:opts).pop();
    }
    function play(p,card){
      const h=hands[p],i=h.findIndex(c=>c.s===card.s&&c.r===card.r);h.splice(i,1);
      trick.push({p,card});
      if(card.s===2||isQS(card))broken=true;
      render();step();
    }
    function resolve(){
      const led=trick[0].card.s;let w=trick[0];
      trick.forEach(t=>{if(t.card.s===led&&val(t.card)>val(w.card))w=t});
      const pt=trick.reduce((n,t)=>n+pts(t.card),0);taken[w.p]+=pt;leader=w.p;tricks++;
      lastTrick={w:w.p,pt};trick=[];
      msg(`${NAMES[w.p]==='You'?'You take':NAMES[w.p]+' takes'} the trick${pt?` (${pt} point${pt>1?'s':''})`:''}.`);
      if(tricks===13)return endHand();
      render();step();
    }
    function endHand(){
      phase='between';
      let add=[...taken];const moon=taken.findIndex(t=>t===26);
      if(moon>=0)add=add.map((_,p)=>p===moon?0:26);
      total=total.map((t,p)=>t+add[p]);hand++;
      const done=total.some(t=>t>=100);
      $('ht-ot').textContent=moon>=0?`${NAMES[moon]==='You'?'You':NAMES[moon]} shot the moon!`:'Hand over';
      let html='<table class="ht-sum"><tr><th></th>'+NAMES.map(n=>`<th>${n}</th>`).join('')+'</tr>';
      html+='<tr><td>This hand</td>'+add.map(a=>`<td>${a}</td>`).join('')+'</tr><tr><td>Total</td>'+total.map(t=>`<td><b>${t}</b></td>`).join('')+'</tr></table>';
      if(done){const m=Math.min(...total),wi=total.map((t,i)=>t===m?i:-1).filter(i=>i>=0);
        html+=`<p><b>${wi.map(i=>NAMES[i]==='You'?'You win':NAMES[i]+' wins').join(' and ')}!</b> Lowest score takes it.</p>`;
        $('ht-next').textContent='New game';$('ht-next').onclick=newGame}
      else{$('ht-next').textContent='Next hand';$('ht-next').onclick=startHand}
      $('ht-obody').innerHTML=html;render();setTimeout(()=>over.classList.add('open'),400);
    }

    /* ---------- drawing ---------- */
    function layout(){
      const W=board.clientWidth||520;
      const cw=Math.max(38,Math.min(62,Math.round(W*.105)));
      board.style.setProperty('--cw',cw+'px');board.style.setProperty('--ch',Math.round(cw*1.4)+'px');
      L={W,cw,ch:Math.round(cw*1.4)};L.H=Math.round(L.ch*4.7);board.style.height=L.H+'px';
    }
    function backs(n,x0,y0,dx,dy,tag){
      for(let i=0;i<n;i++){const e=C.cardEl({r:0,s:0,up:false});e.style.left=(x0+i*dx)+'px';e.style.top=(y0+i*dy)+'px';e.style.zIndex=i+1;e.style.cursor='default';board.appendChild(e)}
    }
    function lab(text,x,y){const e=document.createElement('div');e.className='ht-lab';e.textContent=text;e.style.left=x+'px';e.style.top=y+'px';board.appendChild(e)}
    function render(){
      layout();board.querySelectorAll('.card,.ht-lab,.ht-count').forEach(n=>n.remove());
      if(!hands)return;
      const {W,H,cw,ch}=L;
      /* opponents */
      const nStep=Math.min(cw*.32,(W*.5)/Math.max(1,hands[2].length));
      backs(hands[2].length,(W-(cw+(hands[2].length-1)*nStep))/2,26,nStep,0);
      const sStep=Math.min(ch*.2,(H*.55)/Math.max(1,hands[1].length));
      backs(hands[1].length,10,H*.07+28,0,sStep);
      backs(hands[3].length,W-cw-10,H*.07+28,0,sStep);
      lab(`${NAMES[2]}  ${total[2]}`,(W-90)/2,4);lab(`${NAMES[1]}  ${total[1]}`,10,H*.07);lab(`${NAMES[3]}  ${total[3]}`,Math.max(10,W-cw-10-30),H*.07);
      lab(`You  ${total[0]}`,10,H-ch-36);
      /* trick */
      const cx=W/2,cy=H*.43;
      const spot=[[cx-cw/2,cy+ch*.12],[cx-cw*1.55,cy-ch*.42],[cx-cw/2,cy-ch*.98],[cx+cw*.55,cy-ch*.42]];
      trick.forEach((t,i)=>{const e=C.cardEl({...t.card,up:true});e.style.left=spot[t.p][0]+'px';e.style.top=spot[t.p][1]+'px';e.style.zIndex=20+i;e.style.cursor='default';board.appendChild(e)});
      /* your hand */
      const h=hands[0],step=Math.min(cw*.66,(W-cw-24)/Math.max(1,h.length-1)),x0=(W-(cw+(h.length-1)*step))/2;
      const playable=phase==='play'&&trick.length<4&&(leader+trick.length)%4===0?legal(0):[];
      h.forEach((c,i)=>{
        const e=C.cardEl({...c,up:true});e.dataset.i=i;e.style.left=(x0+i*step)+'px';
        e.style.top=(H-ch-10-(sel.has(i)?16:0))+'px';e.style.zIndex=30+i;
        if(sel.has(i))e.classList.add('sel');
        if(phase==='play'&&!playable.some(x=>x.s===c.s&&x.r===c.r))e.classList.add('dim','no');
        board.appendChild(e);
      });
      bPass.hidden=phase!=='pass';
      $('ht-scores').textContent=NAMES.map((n,p)=>`${n}: ${total[p]}`).join('   ')+`   |   Hand ${hand+1}${phase==='play'?`, trick ${Math.min(13,tricks+1)}`:''}`;
    }
    board.addEventListener('click',e=>{
      const el=e.target.closest('.card');if(!el||el.dataset.i===undefined||!hands)return;
      const i=+el.dataset.i,c=hands[0][i];if(!c)return;
      if(phase==='pass'){
        if(sel.has(i))sel.delete(i);else if(sel.size<3)sel.add(i);
        bPass.disabled=sel.size!==3;render();return;
      }
      if(phase!=='play'||trick.length>=4||(leader+trick.length)%4!==0)return;
      if(!legal(0).some(x=>x.s===c.s&&x.r===c.r)){
        el.classList.add('shake');
        msg(trick.length?'Follow suit if you can.':tricks===0?'The 2 of clubs leads the first trick.':'Hearts have not been broken yet.');
        return;
      }
      play(0,c);
    });
    bPass.onclick=doPass;$('ht-new').onclick=newGame;
    win.style.width='640px';
    if('ResizeObserver'in window){let w0=0;new ResizeObserver(()=>{if(board.clientWidth&&board.clientWidth!==w0){w0=board.clientWidth;render()}}).observe(board)}
    newGame();
    win._tjDebug={get hands(){return hands},get phase(){return phase},get trick(){return trick},get total(){return total},legal,play,aiChoose,doPass,sel,get tricks(){return tricks},get leader(){return leader}};
  }};
})();
