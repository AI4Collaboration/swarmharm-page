/* Floor-level action tracks and a smooth 3D arc for the selected recorded read. */
(() => {
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  function arcHeight(timeSpan,laneSpan,length,laneSpacing,ceiling) {
    const span=Math.hypot(timeSpan*length,laneSpan*laneSpacing);
    return clamp(span*.72,ceiling*.34,ceiling);
  }

  // The camera looks at three world coordinates: elapsed time (x), agent (y), and layer (z).
  function makeFrame(width,height,yaw,pitch,actorCount,readSpans) {
    const length = Math.max(190,width-86), depth = clamp(100+width*.08,124,182);
    const elevation = depth+9, laneSpacing=depth/Math.max(1,actorCount-1);
    const cosY=Math.cos(yaw), sinY=Math.sin(yaw), cosP=Math.cos(pitch), sinP=Math.sin(pitch);
    const eye = Math.max(850,length*3.6);
    function view(fraction,lane,z) {
      const x=(fraction-.5)*length, y=(lane/Math.max(1,actorCount-1)-.5)*depth;
      const across=x*cosY+y*sinY, toward=y*cosY-x*sinY;
      const scale=eye/(eye-toward*cosP-z*sinP);
      return [across*scale,(toward*sinP-z*cosP)*scale];
    }
    const back=-.36, front=actorCount-1+.36;
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    function include(t,lane,z) {
      const [x,y]=view(t,lane,z);
      minX=Math.min(minX,x); maxX=Math.max(maxX,x);
      minY=Math.min(minY,y); maxY=Math.max(maxY,y);
    }
    for(const t of [-.015,1.015]) for(const lane of [back,front]) for(const z of [-5,0]) include(t,lane,z);
    // Frame the same set of recorded arcs throughout the case so stepping never moves the floor.
    for(const [start,from,end,to] of readSpans) {
      const rise=arcHeight(end-start,to-from,length,laneSpacing,elevation);
      for(let i=1;i<8;i++) {
        const t=i/8;
        include(start+(end-start)*t,from+(to-from)*t,4*rise*t*(1-t));
      }
    }
    const extentX=maxX-minX, extentY=maxY-minY;
    const left=width<480?50:60, top=width<480?62:52, plotWidth=width-left-14, plotHeight=height-top-29;
    const fit=Math.min(plotWidth/extentX,plotHeight/extentY);
    const ox=left+(plotWidth-fit*extentX)/2, oy=top+(plotHeight-fit*extentY)/2;
    function project(t,lane,z=0) {
      const p=view(t,lane,z);
      return [ox+(p[0]-minX)*fit,oy+(p[1]-minY)*fit];
    }
    return {project,back,front,elevation,length,laneSpacing};
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
    if(length<.01)return;
    const ux=dx/length, uy=dy/length, x=a[0], y=a[1];
    face(ctx,[[x+4*ux,y+4*uy],[x-4*ux-3*uy,y-4*uy+3*ux],[x-4*ux+3*uy,y-4*uy-3*ux]],ink);
  }

  window.createLinearTimeline = ({actors,moments,eventFraction,fontFamily}) => {
    const lanes=new Map(actors.map((actor,i)=>[actor.id,i]));
    const floorEvents=moments.map(m=>({moment:m,t:eventFraction(m.event),lane:lanes.get(m.actor)}));
    const readSpans=floorEvents.filter(({moment})=>moment.kind==='read')
      .map(({moment,t,lane})=>[eventFraction(moment.message.event),lanes.get(moment.message.actor),t,lane]);
    let frame, geometryKey, points=[], arc=null;
    function layout(width,height,angle) {
      const key=[width,height,angle.yaw,angle.pitch].join('/');
      if(key===geometryKey)return;
      geometryKey=key;
      frame=makeFrame(width,height,angle.yaw,angle.pitch,actors.length,readSpans);
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
        mark(ctx,points[moment.order],moment,ink(moment.actor)+alpha);
      }

      arc=null;
      if(post) {
        const posted=eventFraction(post.event), authorLane=lanes.get(post.actor), readerLane=lanes.get(active.actor);
        const rise=arcHeight(now-posted,readerLane-authorLane,frame.length,frame.laneSpacing,elevation);
        // The curve stays within the two observed timestamps, even when they coincide.
        const pointAt=t=>project(posted+(now-posted)*t,authorLane+(readerLane-authorLane)*t,4*rise*t*(1-t));
        const route=Array.from({length:65},(_,i)=>pointAt(i/64));
        const sender=ink(post.actor), reader=ink(active.actor);
        const line=ctx.createLinearGradient(...route[0],...route.at(-1));
        line.addColorStop(0,sender); line.addColorStop(.52,paint.packet); line.addColorStop(1,reader);
        stroke(ctx,route,reader+(paint.dark?'20':'16'),6);
        stroke(ctx,route,line,2.3);
        arrow(ctx,pointAt(.68),pointAt(.7),paint.packet);
        mark(ctx,points[post.order],post,sender,true);
        ctx.font='600 11px '+fontFamily;
        const label=recordLabel+' '+String(active.index+1).padStart(2,'0')+' ↗';
        const w=ctx.measureText(label).width+14, h=20;
        const top=route.reduce((highest,p)=>p[1]<highest[1]?p:highest);
        let x=clamp(top[0]-w/2,4,width-w-4);
        const y=Math.max(5,top[1]-h-6);
        ctx.fillStyle=paint.paper; ctx.strokeStyle=reader+'76'; ctx.lineWidth=.8;
        ctx.beginPath(); ctx.roundRect(x,y,w,h,5); ctx.fill(); ctx.stroke();
        ctx.fillStyle=paint.ink; ctx.fillText(label,x+7,y+13.5);
        arc={route,pointAt,badge:{x,y,w,h},moment:active};
      }
      if(active.kind!=='outcome') {
        const point=points[active.order];
        ctx.beginPath(); ctx.arc(point.x,point.y,8,0,2*Math.PI); ctx.fillStyle=ink(active.actor)+'2d'; ctx.fill();
        mark(ctx,point,active,paint.packet,true);
      }
      if(hovered && !hovered.arc) {
        ctx.beginPath(); ctx.arc(hovered.x,hovered.y,7,0,2*Math.PI); ctx.strokeStyle=paint.ink; ctx.lineWidth=1; ctx.stroke();
      }
      ctx.restore();
      return points;
    }

    function arcHit(x,y) {
      if(!arc)return null;
      const {route,badge,moment}=arc;
      let hit=x>=badge.x-2 && x<=badge.x+badge.w+2 && y>=badge.y-2 && y<=badge.y+badge.h+2;
      // The endpoints select the post or read. The arc opens the original message.
      if(!hit && [route[0],route.at(-1)].some(p=>Math.hypot(x-p[0],y-p[1])<9))return null;
      for(let i=1;!hit && i<route.length;i++) {
        const a=route[i-1], b=route[i], dx=b[0]-a[0], dy=b[1]-a[1];
        const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
        hit=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<7;
      }
      return hit ? {x,y,arc:true,event:moment.event,message:moment.message.id,moment:moment.order} : null;
    }
    function signalAt(progress) {
      return arc ? arc.pointAt(clamp(progress,0,1)) : null;
    }
    return {draw,arcHit,signalAt};
  };
})();
