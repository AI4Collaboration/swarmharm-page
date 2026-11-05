(()=>{'use strict';
// Same original V7 wordmark outlines. Both words are always rendered from
// particle targets, with a clean vector finish for the completed HARM.
const SWARM_PATH=new Path2D('M205 3 L205 36 L210 36 L211 35 L210 34 L211 32 L211 30 L210 29 L211 27 L211 22 L210 21 L211 16 L210 14 L211 13 L212 13 L213 15 L215 16 L216 19 L218 20 L218 21 L220 23 L222 27 L228 34 L232 34 L234 32 L236 28 L239 25 L239 24 L241 23 L241 22 L246 16 L246 15 L248 14 L249 15 L249 36 L254 36 L255 34 L255 4 L253 4 L252 3 L248 3 L245 7 L245 8 L239 14 L239 15 L234 21 L232 25 L231 26 L229 26 L226 22 L226 21 L225 21 L223 19 L220 13 L218 12 L218 11 L212 3 Z M162 3 L161 5 L162 6 L161 8 L162 9 L162 17 L161 18 L162 19 L162 28 L161 29 L161 31 L162 32 L162 35 L163 36 L167 36 L168 35 L168 25 L169 24 L185 24 L187 28 L189 30 L191 35 L192 36 L197 36 L197 34 L195 32 L195 30 L192 25 L192 23 L196 21 L198 17 L198 8 L195 5 L193 4 L187 4 L186 3 L176 3 L175 4 L173 3 L168 3 L167 4 L165 3 Z M168 10 L169 9 L190 9 L192 11 L192 16 L190 18 L169 18 L168 17 Z M114 34 L115 36 L120 36 L122 34 L123 32 L123 30 L124 29 L147 29 L151 36 L156 36 L157 35 L154 28 L151 25 L148 18 L144 13 L144 11 L140 6 L140 4 L138 3 L135 3 L131 5 L131 7 L130 9 L128 10 L128 12 L125 15 L123 20 L121 22 L121 24 L118 27 L118 29 L117 31 Z M128 21 L130 20 L132 15 L134 13 L134 12 L136 11 L139 14 L143 22 L140 24 L138 24 L137 23 L135 24 L133 23 L131 23 L129 24 L128 23 Z M47 4 L48 6 L48 8 L50 12 L52 14 L52 16 L57 26 L59 27 L59 30 L61 34 L63 36 L68 36 L70 34 L71 32 L71 30 L74 25 L74 23 L77 18 L77 16 L80 13 L82 14 L82 16 L84 19 L84 21 L86 23 L86 25 L88 27 L89 32 L91 34 L91 35 L92 36 L97 36 L99 34 L103 26 L103 24 L107 17 L107 15 L110 10 L110 8 L112 6 L111 3 L107 3 L105 4 L104 9 L101 13 L101 15 L98 20 L98 22 L96 26 L94 27 L93 26 L93 24 L92 22 L90 21 L90 18 L87 13 L87 11 L85 9 L85 7 L83 4 L78 3 L76 5 L73 11 L73 14 L68 22 L68 25 L66 27 L65 27 L63 25 L62 23 L62 21 L60 19 L59 17 L59 15 L54 5 L51 3 L48 3 Z M5 6 L4 8 L4 17 L6 20 L8 20 L9 21 L12 21 L13 22 L34 22 L37 24 L37 26 L38 27 L38 29 L35 31 L12 31 L10 29 L10 27 L8 23 L7 24 L4 24 L4 31 L6 33 L6 34 L8 34 L10 36 L19 36 L20 37 L26 37 L27 36 L37 36 L42 33 L43 31 L43 27 L44 26 L43 25 L43 21 L41 18 L39 18 L38 17 L35 17 L34 16 L33 17 L31 17 L30 16 L27 16 L26 17 L24 16 L22 16 L20 17 L19 16 L11 16 L10 15 L10 10 L14 8 L34 8 L37 10 L37 14 L39 15 L41 14 L42 15 L42 13 L43 12 L43 9 L41 7 L40 4 L36 4 L35 3 L30 3 L29 2 L28 3 L26 3 L25 2 L23 3 L21 2 L20 3 L10 3 L9 4 L7 4 Z');
// Clean vector contours: no raster-traced stair steps on final HARM edges.
const HARM_PATH=new Path2D('M262 4 Q262 3 263 3 H267 Q268 3 268 4 V17 H291 V4 Q291 3 292 3 H296 Q297 3 297 4 V35 Q297 36 296 36 H292 Q291 36 291 35 V23 H268 V35 Q268 36 267 36 H263 Q262 36 262 35 Z M305 35 L323 4 Q323.6 3 325 3 H328 Q329.4 3 330 4 L347 35 Q347.5 36 346 36 H342 Q341 36 340.5 35 L337 29 H315 L311.5 35 Q311 36 310 36 H306 Q304.5 36 305 35 Z M318 23 H334 L326 9 Z M352 4 Q352 3 353 3 H377 Q388 3 388 13.5 Q388 22 381 23.5 L387 35 Q387.5 36 386 36 H382 Q381 36 380.5 35 L375 24 H358 V35 Q358 36 357 36 H353 Q352 36 352 35 Z M358 9 V18 H377 Q382 18 382 13.5 Q382 9 377 9 Z M395 4 Q395 3 396 3 H401 Q402 3 403 4 L420 27 L437 4 Q438 3 439 3 H444 Q445 3 445 4 V35 Q445 36 444 36 H440 Q439 36 439 35 V13 L423 34 H417 L401 13 V35 Q401 36 400 36 H396 Q395 36 395 35 Z');
const RED_BEE_SRC='data:image/webp;base64,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';
const BLACK_BEE_SRC='data:image/webp;base64,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';
const canvas=document.getElementById('swarmharm-canvas');
if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:true}); if(!ctx)return;
const root=canvas.closest('.emergence-title');
if(!root)return;
let INK='#222521',RED='#ed302b',PALE='#c2bcb5';
const GAP=8; // approved spacing, keeps SWARM and HARM separated
// The physical bee paths use the stable V16 time scale. Only presentation
// playback is remapped, so there are no hard cuts or timeline mismatches.
const FORM_END=900, ATTACK=5480, END=10800;
const BEATS=[
  [0,0],
  [280,110],  // quick independent search
  [950,320], // encounters, mutual response, then pairing
  [2050,640], // small flocks travel together before title attraction
  [3300,900], // slowly resolve the gathered swarm into letters
  [3500,1030],
  [3800,1030],
  [4400,5480],
  [5500,8050],
  [6500,END],
  [7250,END]
];
const CYCLE=BEATS[BEATS.length-1][0];
function sceneTime(ms){
 const t=Math.max(0,Math.min(CYCLE,ms));
 for(let i=1;i<BEATS.length;i++){
   const [endClock,endScene]=BEATS[i];
   if(t<=endClock){
     const [startClock,startScene]=BEATS[i-1];
     const u=(t-startClock)/(endClock-startClock);
     return startScene+(endScene-startScene)*u;
   }
 }
 return END;
}
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
let w=1000,h=410,dpr=1,S=1,ox=0,oy=0;
let black=[],denseCore=[],coreLayer=null,red=[],dust=[],debris=[],wanderers=[],tearBees=[];
let blackCache=null,redCache=null,formation=[];
let elapsed=reduce?CYCLE:0,world=0,last=0,visible=!document.hidden,paused=false,animationFrame=0;
let mouse={x:-999,y:-999,on:false};
let seed=491120;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const easeOut=t=>1-(1-clamp(t))**3;
const gauss=()=>Math.sqrt(-2*Math.log(Math.max(1e-7,rand())))*Math.cos(Math.PI*2*rand());
const cubic=(a,b,c,d,t)=>{const k=1-t;return k*k*k*a+3*k*k*t*b+3*k*t*t*c+t*t*t*d};
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=(rand()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function sprite(src){const i=new Image();i.src=src;return i}
const redBees=sprite(RED_BEE_SRC),blackBees=sprite(BLACK_BEE_SRC);

function targetPoints(path,minX,maxX,step,shiftX){
 const off=document.createElement('canvas');off.width=Math.ceil(w);off.height=Math.ceil(h);
 const g=off.getContext('2d',{willReadFrequently:true});
 g.save();g.translate(ox+shiftX,oy);g.scale(S,S);g.fillStyle='#000';g.fill(path,'evenodd');g.restore();
 const pix=g.getImageData(0,0,off.width,off.height).data,pts=[];
 const x0=Math.max(0,ox+shiftX+minX*S),x1=Math.min(w,ox+shiftX+maxX*S);
 const y0=Math.max(0,oy),y1=Math.min(h,oy+39*S);
 for(let y=y0,r=0;y<y1;y+=step,r++){
  for(let x=x0+(r%2)*step*.5;x<x1;x+=step){
   const i=(Math.floor(y)*off.width+Math.floor(x))*4;
   if(pix[i+3]>135&&rand()>.018){pts.push({x:x+(rand()-.5)*step*.22,y:y+(rand()-.5)*step*.22})}
  }
 }
 return pts;
}
// Approximate glyph-edge distance field, in original letter-space coordinates.
// This is used only when placing bees, not in every animation frame.
const glyphMask=(()=>{
 const width=266,height=43;
 const off=document.createElement('canvas');off.width=width;off.height=height;
 const g=off.getContext('2d',{willReadFrequently:true});
 g.fillStyle='#000';g.fill(SWARM_PATH,'evenodd');
 const rgba=g.getImageData(0,0,width,height).data;
 const binary=new Uint8Array(width*height);
 for(let i=0;i<binary.length;i++)binary[i]=rgba[i*4+3]>128?1:0;
 return {width,height,binary};
})();
function glyphDepth(px,py){
 const x=Math.floor((px-ox)/S),y=Math.floor((py-oy)/S);
 const {width,height,binary}=glyphMask;
 const inside=(x>=0&&x<width&&y>=0&&y<height)?binary[y*width+x]===1:false;
 for(let r=1;r<=5;r++){
  const checks=[[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,r],[r,-r],[-r,-r]];
  for(const [dx,dy] of checks){
   const xx=x+dx,yy=y+dy;
   const value=(xx>=0&&xx<width&&yy>=0&&yy<height)?binary[yy*width+xx]===1:false;
   if(value!==inside)return inside?r:-r;
  }
 }
 return inside?6:-6;
}

// Many bees are still individually animated, but a secondary packed core is
// precomposed from actual bee sprites to preserve smooth frame delivery.
function densityCloud(step){
 const base=targetPoints(SWARM_PATH,0,258,step*.96,0).filter(p=>{
  const d=glyphDepth(p.x,p.y);
  if(d<=1&&rand()>.73)return false;
  p.depth=d;p.core=Math.max(0,smooth((d-.7)/2.9));p.halo=false;
  return true;
 });
 const extra=targetPoints(SWARM_PATH,0,258,step*.99,0).filter(p=>{
  const d=glyphDepth(p.x,p.y);
  if(d<1.1)return false;
  if(rand()>(d>=2.3?.91:.65))return false;
  p.depth=d;p.core=Math.max(0,smooth((d-.7)/2.9));p.halo=false;
  return true;
 });
 const deep=targetPoints(SWARM_PATH,0,258,step*1.19,0).filter(p=>{
  const d=glyphDepth(p.x,p.y);
  if(d<2||rand()>.79)return false;
  p.depth=d;p.core=Math.max(0,smooth((d-.7)/2.9));p.halo=false;
  return true;
 });
 // Keep the completed wordmark crisp: bees belong to the letterforms, not a
 // decorative cloud around them.
 return {base,core:extra.concat(deep),halo:[]};
}

const CACHE_TILE=44,CACHE_COLUMNS=48,CACHE_ROTATIONS=16;
function buildBeeCache(img){
 if(!img.complete||img.naturalWidth<408)return null;
 const count=112*CACHE_ROTATIONS;
 const off=document.createElement('canvas');
 off.width=CACHE_COLUMNS*CACHE_TILE;
 off.height=Math.ceil(count/CACHE_COLUMNS)*CACHE_TILE;
 const c=off.getContext('2d',{alpha:true});
 for(let id=0;id<112;id++){
  const srcX=(id%12)*34,srcY=Math.floor(id/12)*34;
  for(let n=0;n<CACHE_ROTATIONS;n++){
   const k=id*CACHE_ROTATIONS+n;
   const x=(k%CACHE_COLUMNS)*CACHE_TILE+CACHE_TILE/2;
   const y=Math.floor(k/CACHE_COLUMNS)*CACHE_TILE+CACHE_TILE/2;
   c.save();c.translate(x,y);c.rotate(n*Math.PI*2/CACHE_ROTATIONS);
   c.drawImage(img,srcX,srcY,34,34,-17,-17,34,34);c.restore();
  }
 }
 // Tint the swarm sprite atlas once, retaining transparent wings and detail.
 if(img===blackBees){
  c.globalCompositeOperation='source-in';c.fillStyle='#246bc3';
  c.fillRect(0,0,off.width,off.height);c.globalCompositeOperation='source-over';
 }
 return off;
}
function beeStamp(c,img,id,x,y,size,angle,opacity){
 if(!img.complete||img.naturalWidth<408||opacity<.018)return;
 const cache=img===blackBees?blackCache:redCache;
 c.globalAlpha=opacity;
 if(cache){
  const n=((Math.round(angle*CACHE_ROTATIONS/(Math.PI*2))%CACHE_ROTATIONS)+CACHE_ROTATIONS)%CACHE_ROTATIONS;
  const k=(id%112)*CACHE_ROTATIONS+n;
  const srcX=k%CACHE_COLUMNS*CACHE_TILE;
  const srcY=Math.floor(k/CACHE_COLUMNS)*CACHE_TILE;
  const stampSize=size*CACHE_TILE/34;
  c.drawImage(cache,srcX,srcY,CACHE_TILE,CACHE_TILE,x-stampSize/2,y-stampSize/2,stampSize,stampSize);
 }else{
  c.save();c.translate(x,y);c.rotate(angle);
  c.drawImage(img,(id%12)*34,Math.floor(id/12)*34,34,34,-size/2,-size/2,size,size);
  c.restore();
 }
 c.globalAlpha=1;
}
function buildCoreLayer(){
 if(!blackBees.complete||blackBees.naturalWidth<408||!denseCore.length)return;
 const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;
 const c=off.getContext('2d',{alpha:true});c.setTransform(dpr,0,0,dpr,0,0);
 for(const p of denseCore){
  beeStamp(c,blackBees,p.sprite,p.x,p.y,p.size,p.angle,p.opacity);
 }
 // Most stable bees are combined into the same texture; moving bees on
 // top preserve flocking detail without requiring thousands of rotations.
 for(const p of black){
  if(p.static)beeStamp(c,blackBees,p.sprite,p.x,p.y,p.size,p.angle,p.opacity);
 }
 coreLayer=off;
}
blackBees.addEventListener('load',()=>{blackCache=buildBeeCache(blackBees);buildCoreLayer()});
redBees.addEventListener('load',()=>{redCache=buildBeeCache(redBees)});

function swarmOffset(){
 let a,b;
 if(rand()<.82){a=clamp(gauss()*.35,-1,1);b=clamp(gauss()*.36,-1,1)}
 else{let angle=rand()*Math.PI*2,r=Math.sqrt(rand());a=Math.cos(angle)*r;b=Math.sin(angle)*r;}
 return {x:a*(1-.23*Math.max(0,b)),y:b};
}

// The slash and attack are ONE connected cubic spline. A lookup table maps
// distance -> position so speed remains continuous across every segment.
const points=[
 [{x:254,y:18},{x:242,y:17},{x:228,y:18},{x:214,y:19}],
 [{x:214,y:19},{x:165,y:25},{x:70,y:21},{x:26,y:19}],
 [{x:26,y:19},{x:-14,y:17},{x:18,y:53},{x:75,y:44}],
 [{x:75,y:44},{x:140,y:40},{x:235,y:27},{x:278,y:20}]
];
const pathSamples=[];
let totalLength=0,previous=null;
for(let seg=0;seg<points.length;seg++){
 const [a,b,c,d]=points[seg];
 for(let j=0;j<=85;j++){
  if(seg>0&&j===0)continue;
  const u=j/85;
  const q={x:cubic(a.x,b.x,c.x,d.x,u),y:cubic(a.y,b.y,c.y,d.y,u)};
  if(previous)totalLength+=Math.hypot(q.x-previous.x,q.y-previous.y);
  pathSamples.push({x:q.x,y:q.y,len:totalLength});previous=q;
 }
}
function pathAt(u){
 const len=clamp(u)*totalLength;
 let left=0,right=pathSamples.length-1;
 while(left<right){const mid=(left+right)>>1;if(pathSamples[mid].len<len)left=mid+1;else right=mid;}
 const b=pathSamples[left],a=pathSamples[Math.max(0,left-1)];
 const k=(b.len===a.len)?0:clamp((len-a.len)/(b.len-a.len));
 return {x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k)};
}
function travelProgress(t){
 // First 12% gently accelerates; then steady fast flight across the slash.
 t=clamp(t);const edge=.12;
 if(t>=edge)return t;
 const q=t/edge;return edge*(-q*q*q+2*q*q);
}
function layout(){
 const r=root.getBoundingClientRect();w=Math.max(280,r.width);h=Math.max(1,r.height);
 dpr=Math.min(3,Math.max(2,window.devicePixelRatio||1));
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 seed=491120;
 S=Math.min(3.05,w*.957/(450+GAP));ox=(w-(450+GAP)*S)/2;oy=h*.69-19.5*S;
 const step=clamp(1.18*S,.9,2.48);
 const density=densityCloud(step);
 const inkPts=density.base.concat(density.halo);
 const redPts=targetPoints(HARM_PATH,258,450,step*.90,GAP*S);
 const dot=clamp(.47*S,.50,1.28);
 black=inkPts.map(p=>{const st=stormPoint(p.halo?1:0);return {x:p.x,y:p.y,x0:st.x,y0:st.y,stormWave:st.wave,stormRate:st.rate,
  r:dot*(.72+rand()*.60),phase:rand()*6.28,light:rand()<.014,redId:-1,tearSeed:rand()*Math.PI*2,
  sprite:(rand()*112)|0,size:(p.halo?(3.1+rand()*2.3):(3.0+rand()*2.0)) * S,
  angle:rand()*Math.PI*2,halo:p.halo,core:p.core,
  opacity:p.halo?.48+rand()*.30:.72+.24*p.core };});
 denseCore=density.core.map(p=>{const st=stormPoint(2);return {x:p.x,y:p.y,sx:st.x,sy:st.y,stormWave:st.wave,stormRate:st.rate,sprite:(rand()*112)|0,
  angle:rand()*Math.PI*2,size:(2.6+rand()*1.65)*S,
  opacity:.61+.27*p.core};});
 coreLayer=null;
 const pool=shuffle(black.map((_,i)=>i)).slice(0,Math.max(48,Math.floor(black.length*.09)));
 red=redPts.map((p,i)=>{
  const src=black[pool[i%pool.length]],a=swarmOffset();
  if(src.redId<0)src.redId=i;
  const redAt=1150+rand()*600;
  const aStart=ATTACK+rand()*620;
  const depart=aStart;
  const flight=2190+rand()*175;
  const targetT=clamp((p.x-(ox+(262+GAP)*S))/(184*S));
  const settle=1160+rand()*350+targetT*440;
  return {src,tx:p.x,ty:p.y,ux:a.x,uy:a.y,
   redAt,depart,attackAt:aStart,flight,settle,finishAt:aStart+flight+settle,
   seed:rand()*6.283,phase:rand()*6.283,cross:clamp(gauss()*.64,-1.5,1.5),
   r:dot*(.75+rand()*.6),bee:true,
   sprite:(rand()*112)|0,size:(2.7+rand()*2.1)*S,shape:(rand()*6.283),lastStage:0};
 });
 dust=[]; // use bee silhouettes rather than circular ambient particles
 // No permanent perimeter swarm: the motion resolves into the word itself.
 wanderers=[];
 debris=shuffle(inkPts.filter(p=>p.x<ox+250*S&&Math.abs(p.y-(oy+19*S))<12*S))
  .slice(0,Math.round(clamp(black.length*.014,32,95)))
  .map(p=>({x:p.x,y:p.y,a:rand()*Math.PI*2,r:dot*(.3+rand()*.36),phase:rand()*Math.PI*2}));
 for(const p of black){
  p.static=p.redId<0&&!p.halo&&rand()<(.24+.16*p.core);
 }
 // Use genuine bee-shaped glyph components to deform the whole wordmark
 // under impact, including bees rendered into the static density cache.
 tearBees=denseCore.concat(black);
 coreLayer=null;
 buildCoreLayer();
 buildFormation();
}

// The loose swarm occupies the eventual wordmark location from the start.
// Formation reorganizes the cluster in place, without a downward entrance.
function initialStormCenter(){
 return {x:ox+128.5*S, y:oy+19.5*S};
}
function stormPoint(kind=0){
 const c=initialStormCenter();
 let u,v;
 if(rand()<.83){
   // Most bees cluster around the dark central core.
   // Reject far tails instead of clamping to a sharp rectangular edge.
   let tries=0;
   do {u=gauss()*.49;v=gauss()*.43;tries++}
   while(((u/1.10)**2+(v/1.17)**2)>1.12 && tries<12);
 }else{
   // The outer ~17% thins toward the moving oval edge.
   const a=rand()*Math.PI*2,r=Math.sqrt(rand());
   u=Math.cos(a)*r;v=Math.sin(a)*r;
 }
 const spread=kind===1?1.10:kind===2?.98:1.0;
 return {
   x:c.x+u*126*S*spread,
   y:c.y+v*27*S*spread+Math.sin(u*5.2)*1.65*S,
   wave:rand()*Math.PI*2,rate:.0025+rand()*.0026
 };
}
function bobStorm(x,y,p){
 const a=world*p.rate+p.wave;
 // Very small motion: keep cluster shape coherent while the bees buzz.
 return {x:x+Math.sin(a)*1.8*S,y:y+Math.cos(a*1.13)*1.3*S};
}
// Precompute local neighbor interactions once per layout, keeping playback
// inexpensive. Cohesion/alignment are local; the late target resolves the title.
function buildFormation(){
 const count=Math.min(110,black.length);
 formation=Array.from({length:count},(_,i)=>{
  const target=black[Math.floor(i*black.length/count)],angle=rand()*Math.PI*2;
  const x=ox+(-9+rand()*276)*S,y=oy+(-24+rand()*86)*S;
  return {id:i,group:i,target,x,y,vx:Math.cos(angle)*1.3*S,vy:Math.sin(angle)*1.3*S,
   reactionUntil:0,partner:-1,sprite:target.sprite,size:(11+rand()*5)*S,
   frames:[{x,y,angle,pulse:0}]};
 });
 for(let frame=1;frame<=100;frame++){
  const u=frame/100,seek=smooth((u-.72)/.28);
  // Persistent bonds begin only with a close encounter. No preset flock centers.
  if(frame>8&&frame<72){
   for(const p of formation){
    if(p.reactionUntil+7>frame)continue;
    let nearest=null,distance=13*S;
    for(const q of formation){
     if(q.group===p.group||q.reactionUntil+7>frame)continue;
     const d=Math.hypot(q.x-p.x,q.y-p.y);
     if(d<distance){nearest=q;distance=d;}
    }
    if(!nearest)continue;
    const members=formation.filter(q=>q.group===p.group||q.group===nearest.group);
    if(members.length>(frame<48?5:12))continue;
    const group=Math.min(p.group,nearest.group);
    members.forEach(q=>q.group=group);
    p.partner=nearest.id;nearest.partner=p.id;
    p.reactionUntil=nearest.reactionUntil=frame+10;
   }
  }
  const groups=new Map();
  for(const p of formation){
   if(!groups.has(p.group))groups.set(p.group,[]);
   groups.get(p.group).push(p);
  }
  const next=formation.map(p=>{
   const peers=groups.get(p.group),grouped=peers.length>1;
   let cx=0,cy=0,vx=0,vy=0,sx=0,sy=0;
   for(const q of peers){cx+=q.x;cy+=q.y;vx+=q.vx;vy+=q.vy;
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
    if(q!==p&&d<10*S&&d>.01){sx-=dx/d;sy-=dy/d;}}
   const n=peers.length,search=grouped?.035:.18;
   let ax=Math.sin(frame*.19+p.target.phase)*search*S;
   let ay=Math.cos(frame*.16+p.target.phase)*search*S;
   if(grouped){ax+=(cx/n-p.x)*.026+(vx/n-p.vx)*.16+sx*.15*S;
    ay+=(cy/n-p.y)*.026+(vy/n-p.vy)*.16+sy*.15*S;}
   ax+=(p.target.x-p.x)*seek*.025;
   ay+=(p.target.y-p.y)*seek*.025;
   const reacting=frame<p.reactionUntil;
   const pace=reacting?.30:1;
   const nx=clamp(p.vx+ax,-1.8*S,1.8*S),ny=clamp(p.vy+ay,-1.8*S,1.8*S);
   const x=clamp(p.x+nx*pace,ox-19*S,ox+277*S);
   const y=clamp(p.y+ny*pace,oy-32*S,oy+73*S);
   const partner=formation[p.partner];
   const angle=reacting&&partner?Math.atan2(partner.y-p.y,partner.x-p.x):Math.atan2(ny,nx);
   return {x,y,vx:nx*.96,vy:ny*.96,angle,
    pulse:reacting?Math.sin((p.reactionUntil-frame)/10*Math.PI)**2:0};
  });
  formation.forEach((p,i)=>{Object.assign(p,next[i]);
   const settle=smooth((u-.84)/.16);
   p.frames.push({x:lerp(p.x,p.target.x,settle),y:lerp(p.y,p.target.y,settle),
    angle:p.angle,pulse:p.pulse});
  });
 }
}
function drawFormation(t){
 if(t>=FORM_END)return;
 const frame=clamp(t/FORM_END)*100,index=Math.min(99,Math.floor(frame));
 const fade=1-smooth((t-760)/140);
 for(const p of formation){
  const a=p.frames[index],b=p.frames[index+1],u=frame-index;
  const x=lerp(a.x,b.x,u),y=lerp(a.y,b.y,u),pulse=lerp(a.pulse,b.pulse,u);
  // A brief paired body response marks recognition, then the insects move together.
  if(pulse>.05){ctx.globalAlpha=.12*pulse*fade;ctx.fillStyle='#246bc3';
   ctx.beginPath();ctx.ellipse(x,y,p.size*.8,p.size*.65,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  const turn=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));
  beeSprite(blackBees,p.sprite,x,y,p.size*(1+.30*pulse),a.angle+turn*u,.98*fade);
 }
}
function flightPos(p,u){
 const prog=travelProgress(u);
 const q=pathAt(prog);
 // A broad in-place departure narrows into a fast ribbon across SWARM.
 const narrow=smooth(prog/.30);
 const width=lerp(49,10,narrow),height=lerp(27,9,narrow);
 let x=ox+(q.x+p.ux*width)*S;
 let y=oy+(q.y+p.uy*height+p.cross*5.5*Math.sin(Math.PI*prog))*S;
 const flutter=(1-smooth((prog-.85)/.15))*(2.0+1.2*Math.sin(prog*Math.PI));
 x+=Math.sin(prog*39+p.seed)*flutter*S;
 y+=Math.cos(prog*35+p.phase)*flutter*.85*S;
 return {x,y};
}
function redPos(p,t){
 if(t<=p.depart)return {x:p.src.x,y:p.src.y};
 const aEnd=p.attackAt+p.flight;
 if(t<aEnd){
  const u=clamp((t-p.attackAt)/p.flight);
  const q=flightPos(p,u),start={x:p.src.x,y:p.src.y},fp=flightPos(p,0);
  // Each bee starts at its own position, without an overhead gathering point.
  const settle=smooth(u/.145);
  return {x:q.x+(start.x-fp.x)*(1-settle), y:q.y+(start.y-fp.y)*(1-settle)};
 }
 if(t>=p.finishAt)return {x:p.tx,y:p.ty};
 const u=clamp((t-aEnd)/p.settle);
 // The final movement is still a physical bee flight. Its first tangent
 // matches the attack's outgoing direction; it slows naturally at the glyph.
 const start=flightPos(p,1);
 const target={x:p.tx,y:p.ty};
 const c1={x:start.x+78*S,y:start.y-13*S};
 const c2={x:target.x-(8+10*p.ux)*S,y:target.y+(16*p.uy)*S};
 const v=easeOut(u);
 const x=cubic(start.x,c1.x,c2.x,target.x,v),y=cubic(start.y,c1.y,c2.y,target.y,v);
 const flutter=Math.sin(Math.PI*u)*(1-u);
 return {x:x+Math.sin(u*13+p.seed)*5*S*flutter,
         y:y+Math.cos(u*15+p.phase)*4*S*flutter};
}
function beeSprite(img,id,x,y,size,angle,opacity){
 beeStamp(ctx,img,id,x,y,size,angle,opacity);
}
function circle(x,y,r){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2)}
// A tear is created ONLY by red bees currently touching SWARM or by bees
// that passed through it in the preceding 480 ms. Never draw a pre-cut path.
// The exact same redPos(p, time) used to render the attack supplies the hits.
function currentSlashState(t){
 const tear=smooth((t-5720)/260)*(1-smooth((t-7830)/750));
 if(tear<=.002) return null;
 const head=pathAt(travelProgress((t-(ATTACK+300))/2320));
 return {tear, impactX:ox+head.x*S, impactY:oy+19.5*S};
}
function drawHeadSlash(t){
 // V11-type physical displacement, but applied to ALL bees, including the
 // dense pre-rendered core. An impact is born only when the red swarm reaches
 // this x-coordinate; it never pre-cuts a path in front of the flying bees.
 const cuts=[];
 for(const age of [120,60,0]){
   const s=currentSlashState(t-age);
   if(!s)continue;
   if(s.impactX<ox-45*S||s.impactX>ox+299*S)continue;
   cuts.push({x:s.impactX,y:s.impactY,a:s.tear*Math.pow(1-age/250,1.2),age});
 }
 if(!cuts.length)return;
 const radiusX=39*S,radiusY=20*S;
 // Remove an elliptical *patch* of the glyph; we then re-render the same bee
 // particles shifted above/below the flight line. This is why the letter
 // visibly tears instead of just receiving a faint transparent scratch.
 ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
 for(const c of cuts){
   ctx.globalAlpha=Math.min(1,.99*c.a);
   ctx.beginPath();ctx.ellipse(c.x,c.y,radiusX,radiusY,0,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 // Rebuild the temporarily removed cluster using the original insect
 // silhouettes, but split them vertically around the passing red swarm.
 for(let i=0;i<tearBees.length;i+=4){
   const p=tearBees[i];
   let maxImpact=0,insideMask=false;
   for(const c of cuts){
     const nx=(p.x-c.x)/radiusX,ny=(p.y-c.y)/radiusY;
     const d2=nx*nx+ny*ny;
     if(d2<1){
       insideMask=true;
       const influence=Math.pow(Math.max(0,1-nx*nx),1.1)*Math.pow(Math.max(0,1-Math.abs(ny)),.28)*c.a;
       if(influence>maxImpact)maxImpact=influence;
     }
   }
   if(!insideMask)continue;
   const towardMid=Math.max(0,1-Math.abs(p.y-(oy+19.5*S))/(23*S));
   const direction=p.y<oy+19.5*S?-1:1;
   const split=(5.6+7.8*towardMid+2.0*Math.sin(i*1.91)**2)*S*maxImpact;
   const lateral=2.4*S*Math.sin(i*.93+t*.008)*maxImpact;
   const flicker=.89+.11*Math.cos(i*.113+t*.002);
   beeSprite(blackBees,p.sprite,p.x+lateral,p.y+direction*split,
       p.size,p.angle+direction*.24*maxImpact,p.opacity*flicker);
 }
 // A sparse spray of dark bees is shed off the moving tear and dissipates.
 const front=cuts[cuts.length-1];
 for(let i=0;i<debris.length;i+=2){
   const p=debris[i],distance=Math.abs(p.x-front.x);
   if(distance>52*S)continue;
   const k=Math.pow(1-distance/(52*S),1.35)*front.a;
   if(k<.12)continue;
   const side=p.y<front.y?-1:1;
   const x=p.x+(Math.sin(i*2.1+t*.014)*8+Math.cos(i*.7)*4)*S*k;
   const y=p.y+side*(7+4*Math.sin(i*1.3)**2)*S*k;
   beeSprite(blackBees,(i*13)%112,x,y,(1.8+i%4*.23)*S,
      Math.sin(i*1.7+t*.004),.33*k);
 }
}
function draw(dt){
 const t=sceneTime(elapsed);
 ctx.clearRect(0,0,w,h);
 const intro=easeOut(Math.min(1,t/FORM_END));
 const coreFade=smooth((t-(FORM_END-105))/145);
 drawFormation(t);
 // Only fade in the pre-rendered completed letter at the END of formation.
 if(coreLayer&&coreFade>0){
   ctx.globalAlpha=.64*coreFade;
   ctx.drawImage(coreLayer,0,0,w,h);
   ctx.globalAlpha=1;
 }
 // SWARM is built from tiny bee sprites, preserving the clustered “bee-bâu” look.
 const active=[];
 for(let i=0;i<black.length;i++){
  const p=black[i];
  if(t<720 || (p.static && (coreFade>=.999 || i%6!==0)))continue;
  const q=bobStorm(p.x0,p.y0,{wave:p.stormWave,rate:p.stormRate});
  // Local eddies share a direction, while every bee has its own orbit.
  // Keep the stroke centers readable and let the edges breathe.
  const edge=p.halo?3.2:1.05+1.35*(1-p.core);
  const group=Math.floor((p.x-ox)/(23*S));
  const driftX=Math.sin(world*.0021+group*1.3)*.8;
  const driftY=Math.cos(world*.0025+group*1.7)*.65;
  let x=lerp(q.x,p.x,intro)+(Math.sin(world*.004+p.phase)*edge+driftX)*S*intro;
  let y=lerp(q.y,p.y,intro)+(Math.cos(world*.0034+p.phase)*edge+driftY)*S*intro;
  if(mouse.on){const dx=x-mouse.x,dy=y-mouse.y,r=Math.hypot(dx,dy)||1;
    if(r<44){const z=(1-r/44);x+=dx/r*z*13;y+=dy/r*z*13;}
  }
  const m=p.redId>=0?red[p.redId]:null;
  const redWithinSwarm=m&&t>=m.redAt&&t<m.depart;
  const atlas=redWithinSwarm?redBees:blackBees;
  const opacity=(redWithinSwarm?.95:(p.light?.36:p.opacity))*(p.static?1-coreFade:1)*smooth((t-720)/180);
  const angle=p.angle+Math.sin(world*.004+p.phase)*.65;
  const foreground=i%17===0&&!p.static?2.15:1;
  beeSprite(atlas,p.sprite,x,y,p.size*(.68+.32*intro)*foreground,angle,opacity);
 }
 // V11-like slash: a local, moving tear centered on the attacking head.
 // Nothing is pre-cut ahead of the bees.
 drawHeadSlash(t);
 // Track active red bees.
 for(let i=0;i<red.length;i++){
  const p=red[i];if(t<=p.depart)continue;
  const q=redPos(p,t);
  active.push({p,q});
 }
 // Flight streaks remain subtle and smooth.
 const flying=smooth((t-ATTACK)/230)*(1-smooth((t-8900)/550));
 if(flying>.025){
  ctx.strokeStyle=RED;ctx.lineCap='round';ctx.lineWidth=clamp(.42*S,.32,1.0);
  ctx.globalAlpha=flying*.22;ctx.beginPath();
  for(let i=0;i<active.length;i+=19){
   const {p,q}=active[i];const older=redPos(p,t-27);
   const len=Math.hypot(q.x-older.x,q.y-older.y);
   if(len<1||len>70)continue;
   ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-(q.x-older.x)*.6,q.y-(q.y-older.y)*.6);
  }
  ctx.stroke();
 }
 // Every red particle is a bee-shaped particle from launch to final HARM.
 for(let i=0;i<active.length;i++){
  const {p,q}=active[i];
  const early=smooth((t-p.depart)/260);
  const arrive=smooth((t-(p.attackAt+p.flight+p.settle*.82))/(p.settle*.20));
  const opacity=(.86+arrive*.10)*(1-smooth((t-10050)/650));
  const prev=redPos(p,t-18);
  const angle=Math.atan2(q.y-prev.y,q.x-prev.x);
  const size=p.size;
  beeSprite(redBees,p.sprite,q.x,q.y,size,angle,opacity*early);
 }
 // Crystallize after the bees arrive: particle texture gradually resolves to
 // the exact solid original wordmark. At the end there are NO dotted gaps.
 const harmSolid=smooth((t-10050)/650);
 if(harmSolid>.001){
   ctx.save();ctx.globalAlpha=harmSolid;ctx.fillStyle=RED;
   ctx.translate(ox+GAP*S,oy);ctx.scale(S,S);
   ctx.fill(HARM_PATH,'evenodd');ctx.restore();
 }
 ctx.globalAlpha=1;
}
function tick(now){
 animationFrame=0;
 if(!last)last=now;
 const dt=Math.min(65,now-last);last=now;
 if(visible){
  if(!paused&&!reduce){const next=Math.min(elapsed+dt,CYCLE);world+=next-elapsed;elapsed=next;}
  draw(dt);
 }
 root.dataset.animationState=elapsed>=CYCLE?'complete':'playing';
 requestTick();
}
function requestTick(){if(!animationFrame&&!paused&&!reduce&&elapsed<CYCLE)animationFrame=requestAnimationFrame(tick);}
let pending=false;
function resize(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;layout();draw(16)})}
addEventListener('resize',resize,{passive:true});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(root);
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mouse={x:e.clientX-r.left,y:e.clientY-r.top,on:true}});
canvas.addEventListener('pointerleave',()=>mouse.on=false);
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now()});
window.__swarmharmTitleDemoV3={
 seek(ms){elapsed=clamp(ms,0,CYCLE);world=elapsed;paused=true;draw(16)},
 resume(){paused=false;last=performance.now();requestTick()},
 get phase(){return elapsed},
 get scenePhase(){return sceneTime(elapsed)},
 get harmSolid(){return smooth((sceneTime(elapsed)-10050)/650)},
 get beats(){return BEATS.map(x=>x.slice())},
 get counts(){return{swarm:black.length,staticBees:black.filter(p=>p.static).length,denseCore:denseCore.length,harm:red.length,wanderingBees:wanderers.length,formationAgents:formation.length,slashActive:!!currentSlashState(sceneTime(elapsed))}},
 get targetBounds(){return{swarm:{min:ox,max:ox+257*S},harm:{min:ox+(262+GAP)*S,max:ox+(445+GAP)*S}}},
 get completedParticles(){return red.filter(p=>sceneTime(elapsed)>=p.finishAt).length}
};
function revealWhenReady(){
  if(!blackBees.complete || !blackBees.naturalWidth ||
     !redBees.complete || !redBees.naturalWidth)return;
  canvas.hidden=false;
  root.classList.add('is-ready');
}
blackBees.addEventListener('load',revealWhenReady);
redBees.addEventListener('load',revealWhenReady);
// Keep the title legible in the website's existing dark mode.
function syncTitleTheme(){
  canvas.style.filter=document.documentElement.dataset.theme==='dark'
    ?'invert(1) hue-rotate(180deg)':'none';
}
if(typeof MutationObserver!=='undefined')new MutationObserver(syncTitleTheme)
 .observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
syncTitleTheme();
layout();
if(blackBees.complete&&blackBees.naturalWidth){blackCache=buildBeeCache(blackBees);buildCoreLayer()}
if(redBees.complete&&redBees.naturalWidth)redCache=buildBeeCache(redBees);
revealWhenReady();
root.dataset.animationState=reduce?'complete':'playing';
draw(0);
requestTick();
})();
