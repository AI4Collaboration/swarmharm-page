/* Project recorded time and agent lanes on the floor. Only a verified read rises above it. */
(() => {
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  // The camera looks at three world coordinates: elapsed time (x), agent (y), and layer (z).
  function makeFrame(width,height,yaw,pitch,actorCount,hasReads) {
    const length = Math.max(190,width-86), depth = clamp(100+width*.08,124,182);
    const elevation = depth+9;
    const cosY=Math.cos(yaw), sinY=Math.sin(yaw), cosP=Math.cos(pitch), sinP=Math.sin(pitch);
    const eye = Math.max(850,length*3.6);
    function view(fraction,lane,z) {
      const x=(fraction-.5)*length, y=(lane/Math.max(1,actorCount-1)-.5)*depth;
      const across=x*cosY+y*sinY, toward=y*cosY-x*sinY;
      const scale=eye/(eye-toward*cosP-z*sinP);
      return [across*scale,(toward*sinP-z*cosP)*scale];
    }
    const back=-.36, front=actorCount-1+.36;
    const corners=[];
    for(const t of [-.015,1.015]) for(const lane of [back,front]) for(const z of [-5,hasReads?elevation:0]) corners.push(view(t,lane,z));
    const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
    const minX=Math.min(...xs), minY=Math.min(...ys);
    const extentX=Math.max(...xs)-minX, extentY=Math.max(...ys)-minY;
    const left=width<480?51:66, top=32, plotWidth=width-left-14, plotHeight=height-top-52;
    const fit=Math.min(plotWidth/extentX,plotHeight/extentY);
    const ox=left+(plotWidth-fit*extentX)/2, oy=top+(plotHeight-fit*extentY)/2;
    function project(t,lane,z=0) {
      const p=view(t,lane,z);
      return [ox+(p[0]-minX)*fit,oy+(p[1]-minY)*fit];
    }
    return {project,back,front,elevation,length,laneSpacing:depth/Math.max(1,actorCount-1)};
  }

  function path(ctx,points) {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for(let i=1;i<points.length;i++) ctx.lineTo(...points[i]);
  }
  function stroke(ctx,points,ink,width=1) {
    path(ctx,points); ctx.strokeStyle=ink; ctx.lineWidth=width; ctx.stroke();
  }
  function face(ctx,points,ink) {
    path(ctx,points); ctx.closePath(); ctx.fillStyle=ink; ctx.fill();
  }
  function arrow(ctx,a,b,ink) {
    const dx=b[0]-a[0], dy=b[1]-a[1], length=Math.hypot(dx,dy);
    if(length<9)return;
    const ux=dx/length, uy=dy/length, x=a[0]+dx*.64, y=a[1]+dy*.64;
    face(ctx,[[x+4*ux,y+4*uy],[x-4*ux-3*uy,y-4*uy+3*ux],[x-4*ux+3*uy,y-4*uy-3*ux]],ink);
  }

  window.createLinearTimeline = ({actors,moments,eventFraction,fontFamily}) => {
    const lanes=new Map(actors.map((actor,i)=>[actor.id,i]));
    const floorEvents=moments.map(m=>({moment:m,t:eventFraction(m.event),lane:lanes.get(m.actor)}));
    const hasReads=moments.some(m=>m.kind==='read');
    let frame, geometryKey, points=[], bridge=null;
    function layout(width,height,angle) {
      const key=[width,height,angle.yaw,angle.pitch].join('/');
      if(key===geometryKey)return;
      geometryKey=key;
      frame=makeFrame(width,height,angle.yaw,angle.pitch,actors.length,hasReads);
      points=floorEvents.map(({moment,t,lane})=>{
        const [x,y]=frame.project(t,lane);
        return {x,y,r:8,event:moment.event,moment:moment.order,message:moment.message?.id};
      });
    }
    function draw({ctx,width,height,angle,paint,active,post,ticks,duration,mark,hovered,recordLabel,clockLabel}) {
      layout(width,height,angle);
      const {project,back,front,elevation}=frame;
      const floor=[project(-.015,back),project(1.015,back),project(1.015,front),project(-.015,front)];
      const lowerFront=[project(1.015,front,-5),project(-.015,front,-5)];
      const ink=id=>paint.agents.get(id)||paint.muted;
      const ground=ctx.createLinearGradient(0,Math.min(...floor.map(p=>p[1])),0,Math.max(...floor.map(p=>p[1])));
      ground.addColorStop(0,paint.blue+(paint.dark?'0a':'06')); ground.addColorStop(1,paint.blue+(paint.dark?'1c':'10'));
      ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
      face(ctx,[floor[2],floor[3],lowerFront[1],lowerFront[0]],paint.guide+(paint.dark?'20':'18'));
      face(ctx,floor,ground); stroke(ctx,[...floor,floor[0]],paint.guide+'4c',.8);
      // Label the front edge in its projected position, rather than reading screen x as time.
      ctx.font='10px '+fontFamily; ctx.textAlign='center';
      let lastLabelX=-Infinity;
      const endX=project(1,front)[0];
      for(const second of ticks) {
        const t=duration?second/duration:0;
        const point=project(t,front);
        stroke(ctx,[project(t,back),point],paint.guide+'37',.8);
        if(second===0 || second===duration || (point[0]-lastLabelX>58 && endX-point[0]>52)) {
          ctx.fillStyle=paint.muted; ctx.fillText(clockLabel(second),point[0],point[1]+14);
          lastLabelX=point[0];
        }
      }
      const now=eventFraction(active.event);
      stroke(ctx,[project(now,back),project(now,front)],paint.packet+'70',1);
      actors.forEach((actor,row)=>{
        const color=ink(actor.id), origin=project(0,row);
        stroke(ctx,[origin,project(1,row)],color+'67',1);
        if(now>0)stroke(ctx,[origin,project(now,row)],color+'b5',1.2);
        ctx.font='500 11px '+fontFamily; ctx.textAlign='right'; ctx.fillStyle=color;
        ctx.fillText('Agent '+actor.id,origin[0]-7,origin[1]+3);
      });
      ctx.textAlign='left';
      for(const {moment} of floorEvents) {
        const alpha=moment.order>active.order?'57':moment.kind==='action'?'9d':'d5';
        mark(moment,ink(moment.actor)+alpha,false,points[moment.order]);
      }

      bridge=null;
      if(post) {
        const a=points[post.order];
        const posted=eventFraction(post.event), authorLane=lanes.get(post.actor), readerLane=lanes.get(active.actor);
        const world=[[posted,authorLane,0],[posted,authorLane,elevation],[now,readerLane,elevation],[now,readerLane,0]];
        const route=world.map(p=>project(...p));
        const [start,up,across,end]=route, sender=ink(post.actor), reader=ink(active.actor);
        const curtain=ctx.createLinearGradient(0,Math.min(up[1],across[1]),0,Math.max(start[1],end[1]));
        curtain.addColorStop(0,reader+(paint.dark?'14':'10')); curtain.addColorStop(1,reader+'00');
        face(ctx,route,curtain);
        stroke(ctx,[start,up],sender,1.6);
        stroke(ctx,[across,end],reader,1.6);
        const line=ctx.createLinearGradient(...up,...across); line.addColorStop(0,sender); line.addColorStop(1,reader);
        stroke(ctx,[up,across],reader+(paint.dark?'22':'18'),7);
        stroke(ctx,[up,across],line,2.8);
        arrow(ctx,up,across,paint.packet);
        for(const p of [up,across]) {
          ctx.beginPath(); ctx.arc(...p,2,0,Math.PI*2); ctx.fillStyle=paint.packet; ctx.fill();
        }
        mark(post,sender,true,a);
        ctx.font='600 11px '+fontFamily;
        const label=recordLabel+' '+String(active.index+1).padStart(2,'0')+' ↗';
        const w=ctx.measureText(label).width+14, h=20;
        const top=up[1]<across[1]?up:across;
        let x=clamp(top[0]-w/2,4,width-w-4);
        const y=Math.max(5,top[1]-h-6);
        if(y<31 && x+w>width-118)x=Math.max(4,width-121-w);
        ctx.fillStyle=paint.paper; ctx.strokeStyle=reader+'76'; ctx.lineWidth=.8;
        ctx.beginPath(); ctx.roundRect(x,y,w,h,5); ctx.fill(); ctx.stroke();
        ctx.fillStyle=paint.ink; ctx.fillText(label,x+7,y+13.5);
        const span=Math.hypot((now-posted)*frame.length,(readerLane-authorLane)*frame.laneSpacing);
        bridge={route,world,lengths:[elevation,span,elevation],total:2*elevation+span,badge:{x,y,w,h},moment:active};
      }
      if(active.kind!=='outcome') {
        const point=points[active.order];
        ctx.beginPath(); ctx.arc(point.x,point.y,8,0,2*Math.PI); ctx.fillStyle=ink(active.actor)+'2d'; ctx.fill();
        mark(active,paint.packet,true,point);
      }
      if(hovered && !hovered.bridge) {
        ctx.beginPath(); ctx.arc(hovered.x,hovered.y,7,0,2*Math.PI); ctx.strokeStyle=paint.ink; ctx.lineWidth=1; ctx.stroke();
      }
      ctx.restore();
      return points;
    }

    function bridgeHit(x,y) {
      if(!bridge)return null;
      const {route,badge,moment}=bridge;
      let onBridge=x>=badge.x-2 && x<=badge.x+badge.w+2 && y>=badge.y-2 && y<=badge.y+badge.h+2;
      // A click on a floor marker selects that exact moment. The rest of the bridge opens its note.
      if(!onBridge && [route[0],route[3]].some(p=>Math.hypot(x-p[0],y-p[1])<9))return null;
      for(let i=1;!onBridge && i<route.length;i++) {
        const a=route[i-1], b=route[i], dx=b[0]-a[0], dy=b[1]-a[1];
        const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
        onBridge=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<7;
      }
      return onBridge ? {x,y,bridge:true,event:moment.event,message:moment.message.id,moment:moment.order} : null;
    }
    function signalAt(progress) {
      if(!bridge)return null;
      let distance=progress*bridge.total;
      for(let i=0;i<bridge.lengths.length;i++) {
        const length=bridge.lengths[i];
        if(distance<=length && length>0) {
          const a=bridge.world[i],b=bridge.world[i+1],t=distance/length;
          return frame.project(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);
        }
        distance-=length;
      }
      return bridge.route[3];
    }
    return {draw,bridgeHit,signalAt};
  };
})();
