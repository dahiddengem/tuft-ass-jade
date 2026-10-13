/* Gem Cut Pinball: an original table, original physics. Z or Left arrow / M or Right arrow flip, hold Space to launch. */
(function(){
  const G=window.TJGames=window.TJGames||{};
  const W=360,H=640,R=7,GRAV=820,SUB=8;
  const CSS=`
.pb-wrap{display:flex;justify-content:center;background:#050f0d;box-shadow:var(--sunken);padding:4px}
#pb-cv{display:block;width:100%;max-width:360px;height:auto;touch-action:none;background:#0b2f2a;image-rendering:auto}
@media (min-width:821px){#pb-cv{max-width:min(360px,calc((100vh - 360px) * .5625))}}
.pb-ctl{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px}
.pb-ctl .btn{padding:8px 4px;min-height:44px;font-size:14px;user-select:none;-webkit-user-select:none;touch-action:none}
`;
  G.pinball={init(root,win){
    const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    root.classList.add('tjg');
    root.innerHTML=`<div class="gbar"><button class="btn gem-cut sm" id="pb-new">New game</button><span class="gsp"></span></div>
      <div class="pb-wrap"><canvas id="pb-cv" width="${W*2}" height="${H*2}" aria-label="Pinball table"></canvas></div>
      <div class="pb-ctl"><button class="btn gem-cut" id="pb-l">◀ Left</button><button class="btn primary gem-cut" id="pb-go">Hold to launch</button><button class="btn gem-cut" id="pb-r">Right ▶</button></div>
      <div class="gstat"><span id="pb-sc">Score: 0</span><span id="pb-ba">Balls: 3</span><span id="pb-bs">Best: 0</span></div>
      <div class="gstat"><span>Keys: Z or ← left, M or → right, hold Space to launch. On a phone, tap the sides of the table.</span></div>`;
    const cv=root.querySelector('#pb-cv'),cx=cv.getContext('2d');cx.scale(2,2);
    const $=id=>root.querySelector('#'+id);

    /* ---------- table ---------- */
    const walls=[];
    const seg=(ax,ay,bx,by,e=.45,k=0)=>walls.push({ax,ay,bx,by,e,k,flash:0});
    seg(14,200,14,500);seg(14,500,90,566,.35);seg(312,500,232,566,.35);seg(346,200,346,612);seg(312,230,312,612);seg(312,612,346,612,.25);
    const ARC={cx:180,cy:200,r:166};
    for(let i=0;i<30;i++){const a0=Math.PI-i*Math.PI/30,a1=Math.PI-(i+1)*Math.PI/30;seg(ARC.cx+ARC.r*Math.cos(a0),ARC.cy-ARC.r*Math.sin(a0),ARC.cx+ARC.r*Math.cos(a1),ARC.cy-ARC.r*Math.sin(a1),.4)}
    const kickers=[{ax:42,ay:430,bx:80,by:492},{ax:270,ay:430,bx:232,by:492}].map(k=>({...k,flash:0}));
    const bumpers=[{x:112,y:200,r:22,pts:100,c:'#3aa898'},{x:204,y:200,r:22,pts:100,c:'#d4af77'},{x:158,y:268,r:22,pts:100,c:'#c0392b'},
      {x:62,y:330,r:14,pts:50,c:'#9fe8db'},{x:254,y:330,r:14,pts:50,c:'#9fe8db'},{x:158,y:372,r:12,pts:25,c:'#f3ecdd'}].map(b=>({...b,flash:0}));
    const FL={
      l:{px:96,py:572,len:56,rest:.49,up:-.52,a:.49,pa:.49,dir:1,on:false},
      r:{px:226,py:572,len:56,rest:.49,up:-.52,a:.49,pa:.49,dir:-1,on:false}
    };
    const tip=f=>[f.px+f.dir*f.len*Math.cos(f.a),f.py+f.len*Math.sin(f.a)];

    /* ---------- state ---------- */
    let ball,score=0,balls=3,state='ready',power=0,charging=false,best=0,still=0,over=false;
    try{best=+localStorage.getItem('tj-pinball-best')||0}catch(_){}
    function spawn(){ball={x:329,y:600,vx:0,vy:0};state='ready';power=0;still=0}
    function reset(){score=0;balls=3;over=false;spawn();hud()}
    function hud(){$('pb-sc').textContent='Score: '+score;$('pb-ba').textContent='Balls: '+balls;$('pb-bs').textContent='Best: '+best}

    /* ---------- physics ---------- */
    function hitSeg(ax,ay,bx,by,thick,e,vs){
      const abx=bx-ax,aby=by-ay,l2=abx*abx+aby*aby;
      let t=((ball.x-ax)*abx+(ball.y-ay)*aby)/l2;t=Math.max(0,Math.min(1,t));
      const px=ax+abx*t,py=ay+aby*t;let dx=ball.x-px,dy=ball.y-py,d=Math.hypot(dx,dy);const RR=R+thick;
      if(d>=RR)return false;
      if(d<1e-6){dx=aby;dy=-abx;d=Math.hypot(dx,dy)}
      const nx=dx/d,ny=dy/d;ball.x=px+nx*RR;ball.y=py+ny*RR;
      const sv=vs?vs(px,py):[0,0],rvx=ball.vx-sv[0],rvy=ball.vy-sv[1],vn=rvx*nx+rvy*ny;
      if(vn<0){ball.vx-=(1+e)*vn*nx;ball.vy-=(1+e)*vn*ny}
      return true;
    }
    function stepFlipper(f,dt){
      f.pa=f.a;const target=f.on?f.up:f.rest,sp=22*dt;
      if(f.a<target)f.a=Math.min(target,f.a+sp);else if(f.a>target)f.a=Math.max(target,f.a-sp);
      f.w=(f.a-f.pa)/dt;
    }
    function sub(dt){
      stepFlipper(FL.l,dt);stepFlipper(FL.r,dt);
      ball.vy+=GRAV*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      for(const w of walls)hitSeg(w.ax,w.ay,w.bx,w.by,1.5,w.e);
      for(const k of kickers)if(hitSeg(k.ax,k.ay,k.bx,k.by,3,1.35)){if(k.flash<=0){score+=10}k.flash=.12}
      for(const b of bumpers){
        const dx=ball.x-b.x,dy=ball.y-b.y,d=Math.hypot(dx,dy),RR=R+b.r;
        if(d<RR){const nx=dx/(d||1),ny=dy/(d||1);ball.x=b.x+nx*RR;ball.y=b.y+ny*RR;
          const sp=Math.max(430,Math.hypot(ball.vx,ball.vy)*.9);ball.vx=nx*sp;ball.vy=ny*sp;
          if(b.flash<=0){score+=b.pts}b.flash=.14}
      }
      for(const key of['l','r']){
        const f=FL[key],t=tip(f);
        hitSeg(f.px,f.py,t[0],t[1],5,.5,(qx,qy)=>{const rx=qx-f.px,ry=qy-f.py;return f.dir===1?[-ry*f.w,rx*f.w]:[ry*f.w,-rx*f.w]});
      }
      const sp=Math.hypot(ball.vx,ball.vy);if(sp>1500){ball.vx*=1500/sp;ball.vy*=1500/sp}
      ball.vx*=.9997;ball.vy*=.9997;
    }
    function update(dt){
      if(over)return;
      for(const b of bumpers)b.flash=Math.max(0,b.flash-dt);
      for(const k of kickers)k.flash=Math.max(0,k.flash-dt);
      if(charging&&state==='ready')power=Math.min(1,power+dt*1.1);
      const h=dt/SUB;for(let i=0;i<SUB;i++)sub(h);
      const inLane=ball.x>312;
      if(state==='ready'&&!inLane)state='play';
      if(state==='play'&&inLane&&ball.y>570)state='ready';
      /* un-stick a ball that has stopped */
      const spd=Math.hypot(ball.vx,ball.vy);
      if(state==='play'&&spd<10&&ball.y<560){still+=dt;if(still>2.2){ball.vx=(Math.random()<.5?-1:1)*90;ball.vy=-140;still=0}}else still=0;
      if(ball.y>670){
        balls--;hud();
        if(balls<=0){over=true;if(score>best){best=score;try{localStorage.setItem('tj-pinball-best',String(best))}catch(_){}}hud()}
        else spawn();
      }
      $('pb-sc').textContent='Score: '+score;
    }
    function launch(){
      if(state==='ready'&&ball.x>312&&Math.hypot(ball.vx,ball.vy)<60){ball.vy=-(620+power*620);ball.vx=0}
      power=0;
    }

    /* ---------- drawing ---------- */
    function gem(x,y,r,c,flash){
      cx.save();cx.translate(x,y);
      cx.fillStyle=flash>0?'#ffffff':c;cx.strokeStyle='#0b0b0b';cx.lineWidth=2;
      cx.beginPath();
      for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,rr=i%2?r*.9:r;cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
      cx.closePath();cx.fill();cx.stroke();
      cx.fillStyle='rgba(255,255,255,.45)';cx.beginPath();cx.moveTo(-r*.5,-r*.1);cx.lineTo(-r*.1,-r*.6);cx.lineTo(r*.2,-r*.45);cx.lineTo(-r*.15,-r*.05);cx.closePath();cx.fill();
      cx.restore();
    }
    function draw(){
      cx.clearRect(0,0,W,H);
      /* felt pattern */
      cx.fillStyle='#0b2f2a';cx.fillRect(0,0,W,H);
      cx.strokeStyle='rgba(159,232,219,.07)';cx.lineWidth=1;
      for(let i=-H;i<W;i+=28){cx.beginPath();cx.moveTo(i,0);cx.lineTo(i+H,H);cx.stroke();cx.beginPath();cx.moveTo(i+H,0);cx.lineTo(i,H);cx.stroke()}
      cx.fillStyle='rgba(212,175,119,.14)';cx.font='700 22px "Pixelify Sans",monospace';cx.textAlign='center';cx.fillText('GEM CUT',158,460);
      cx.fillStyle='rgba(159,232,219,.10)';cx.fillText('TUFT ASS JADE',158,490);
      /* lane tint */
      cx.fillStyle='rgba(0,0,0,.28)';cx.fillRect(312,230,34,382);
      /* walls */
      cx.lineCap='round';cx.strokeStyle='#d4af77';cx.lineWidth=4;
      cx.beginPath();for(const w of walls){cx.moveTo(w.ax,w.ay);cx.lineTo(w.bx,w.by)}cx.stroke();
      for(const k of kickers){cx.strokeStyle=k.flash>0?'#fff':'#3aa898';cx.lineWidth=7;cx.beginPath();cx.moveTo(k.ax,k.ay);cx.lineTo(k.bx,k.by);cx.stroke()}
      for(const b of bumpers)gem(b.x,b.y,b.r,b.c,b.flash);
      /* flippers */
      for(const key of['l','r']){
        const f=FL[key],t=tip(f);
        cx.strokeStyle='#0b0b0b';cx.lineWidth=14;cx.beginPath();cx.moveTo(f.px,f.py);cx.lineTo(t[0],t[1]);cx.stroke();
        cx.strokeStyle='#d4af77';cx.lineWidth=10;cx.beginPath();cx.moveTo(f.px,f.py);cx.lineTo(t[0],t[1]);cx.stroke();
        cx.fillStyle='#fff3c8';cx.beginPath();cx.arc(f.px,f.py,3,0,7);cx.fill();
      }
      /* plunger */
      const pull=power*26;
      cx.fillStyle='#808080';cx.fillRect(322,612+pull-4,14,10);cx.fillStyle='#444';cx.fillRect(327,622+pull,4,Math.max(2,18-pull));
      /* ball */
      if(ball){const g=cx.createRadialGradient(ball.x-2.5,ball.y-2.5,1,ball.x,ball.y,R);g.addColorStop(0,'#fff');g.addColorStop(.6,'#c9d6d3');g.addColorStop(1,'#6a7a77');
        cx.fillStyle=g;cx.beginPath();cx.arc(ball.x,ball.y,R,0,7);cx.fill();cx.strokeStyle='#111';cx.lineWidth=1;cx.stroke()}
      if(over){cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(40,250,280,130);cx.fillStyle='#fff';cx.textAlign='center';cx.font='700 28px "Pixelify Sans",monospace';cx.fillText('GAME OVER',180,300);
        cx.font='700 16px "Pixelify Sans",monospace';cx.fillText('Score '+score,180,328);cx.fillText('Press New game or Space',180,360)}
    }
    let last=0;
    function frame(ts){
      requestAnimationFrame(frame);
      const dt=Math.min(.033,(ts-last)/1000||.016);last=ts;
      if(!win.classList.contains('open')||document.hidden)return;
      update(dt);draw();
    }

    /* ---------- input ---------- */
    const active=()=>win.classList.contains('open')&&win.classList.contains('active');
    const LK=['ArrowLeft','z','Z','ShiftLeft'],RK=['ArrowRight','m','M','/','ShiftRight'];
    document.addEventListener('keydown',e=>{
      if(!active()||e.target.closest&&e.target.closest('input,textarea'))return;
      const k=e.code==='ShiftLeft'||e.code==='ShiftRight'?e.code:e.key;
      if(LK.includes(k)){FL.l.on=true;e.preventDefault()}
      else if(RK.includes(k)){FL.r.on=true;e.preventDefault()}
      else if(e.key===' '||e.key==='ArrowDown'){e.preventDefault();if(over){reset();return}if(!e.repeat)charging=true}
    });
    document.addEventListener('keyup',e=>{
      const k=e.code==='ShiftLeft'||e.code==='ShiftRight'?e.code:e.key;
      if(LK.includes(k))FL.l.on=false;
      else if(RK.includes(k))FL.r.on=false;
      else if((e.key===' '||e.key==='ArrowDown')&&charging){charging=false;launch()}
    });
    const hold=(el,on,off)=>{el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);on()});['pointerup','pointercancel','lostpointercapture'].forEach(n=>el.addEventListener(n,off))};
    hold($('pb-l'),()=>FL.l.on=true,()=>FL.l.on=false);
    hold($('pb-r'),()=>FL.r.on=true,()=>FL.r.on=false);
    hold($('pb-go'),()=>{if(over)reset();else charging=true},()=>{if(charging){charging=false;launch()}});
    const touches=new Map();
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();cv.setPointerCapture(e.pointerId);
      const r=cv.getBoundingClientRect(),left=(e.clientX-r.left)<r.width/2;touches.set(e.pointerId,left);
      if(over){reset();return}
      (left?FL.l:FL.r).on=true;
    });
    const rel=e=>{if(!touches.has(e.pointerId))return;const left=touches.get(e.pointerId);touches.delete(e.pointerId);if(![...touches.values()].includes(left))(left?FL.l:FL.r).on=false};
    cv.addEventListener('pointerup',rel);cv.addEventListener('pointercancel',rel);
    $('pb-new').onclick=reset;
    win.style.width='430px';
    reset();requestAnimationFrame(frame);
    win._tjDebug={get ball(){return ball},get score(){return score},get balls(){return balls},FL,update,launch,get state(){return state},set charging(v){charging=v},reset,set power(v){power=v}};
  }};
})();
