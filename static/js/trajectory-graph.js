/* A stationary message graph. Every edge is backed by a recorded post and read. */
(() => {
  const related = (read, actor) => !actor || read.actor === actor || read.message.actor === actor;
  function connectionsAtTime(reads, moment, second, actor = null) {
    if (moment.kind === 'outcome') return [];
    const time = second(moment.event);
    return reads.filter(read => related(read, actor) &&
      (second(read.event) === time || second(read.message.event) === time));
  }
  window.swarmTrajectorySelection = {connectionsAtTime, related};

  window.createMessageGraph = ({actors, actorEvents, fontFamily}) => {
    let paths = [], transitioning=false, hasDrawn=false;
    const emphasis=new Map();
    function emphasisAt(key,target,now,reduced) {
      const old=emphasis.get(key);
      const sample=state=>{const t=Math.min(1,(now-state.started)/420);return state.from+(state.to-state.from)*t*t*(3-2*t);};
      let state=old;
      if(!old || old.to!==target) {
        state={from:old?sample(old):hasDrawn?0:target,to:target,started:now};
        emphasis.set(key,state);
      }
      if(reduced) {state.from=state.to;return target;}
      const value=sample(state);
      if(now-state.started<420 && Math.abs(value-target)>.001)transitioning=true;
      return value;
    }
    const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
    function pointOn(path, t) {
      const s=1-t;
      return {x:s*s*path.a.x+2*s*t*path.c.x+t*t*path.b.x,
        y:s*s*path.a.y+2*s*t*path.c.y+t*t*path.b.y};
    }
    function arrow(ctx, path, ink) {
      const p=pointOn(path,.83), q=pointOn(path,.86), angle=Math.atan2(q.y-p.y,q.x-p.x);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(-3,-3.5); ctx.lineTo(-3,3.5);
      ctx.closePath(); ctx.fillStyle=ink; ctx.fill(); ctx.restore();
    }
    function draw({ctx,width,height,paint,active,connections,history,focus,second,progress,animate,reduced=false}) {
      const now=typeof performance==='undefined'?0:performance.now();
      transitioning=false;
      const compact=width<420, cardWidth=compact?96:114, cardHeight=54;
      const cx=width/2, cy=height/2+9;
      const rx=Math.max(42,(width-cardWidth-44)/2), ry=Math.max(45,(height-cardHeight-110)/2);
      const nodes=new Map(actors.map((actor,i)=>{
        const angle=-Math.PI*.75+i*2*Math.PI/actors.length;
        // Four nodes use the corners of a rectangle, with room for cross-agent links.
        const x=actors.length===4?cx+rx*(i===0||i===3?-1:1):cx+rx*Math.cos(angle);
        const y=actors.length===4?cy+ry*(i<2?-1:1):cy+ry*Math.sin(angle);
        return [actor.id,{actor:actor.id,x,y,r:cardWidth/2,
          bounds:{x:x-cardWidth/2,y:y-cardHeight/2,w:cardWidth,h:cardHeight}}];
      }));
      const bundles=new Map();
      const visibleReads=new Set([...history,...connections]);
      if(active.kind==='read')visibleReads.add(active);
      for(const read of visibleReads) {
        const key=read.message.actor+':'+read.actor;
        let bundle=bundles.get(key);
        if(!bundle) { bundle={read,selected:[],past:false}; bundles.set(key,bundle); }
        if(connections.includes(read)||read===active) {
          bundle.selected.push(read);
          if(read===active || bundle.selected.length===1)bundle.read=read;
        } else bundle.past=true;
      }
      ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
      paths=[];
      for(const bundle of [...bundles.values()].sort((a,b)=>Number(a.selected.includes(active))-Number(b.selected.includes(active))||a.selected.length-b.selected.length)) {
        const read=bundle.read, from=nodes.get(read.message.actor), to=nodes.get(read.actor);
        if(!from||!to)continue;
        const dx=to.x-from.x, dy=to.y-from.y, length=Math.hypot(dx,dy)||1;
        const ux=dx/length, uy=dy/length;
        const edgeDistance=Math.min((cardWidth/2+7)/(Math.abs(ux)||.001),(cardHeight/2+7)/(Math.abs(uy)||.001));
        const a={x:from.x+ux*edgeDistance,y:from.y+uy*edgeDistance};
        const b={x:to.x-ux*edgeDistance,y:to.y-uy*edgeDistance};
        const bend=clamp(length*.13,14,38);
        const c={x:(a.x+b.x)/2-uy*bend,y:(a.y+b.y)/2+ux*bend};
        const path={a,b,c,read,selected:bundle.selected.length>0,current:bundle.selected.includes(active)};
        paths.push(path);
        const isCurrent=bundle.selected.includes(active), inFocus=related(read,focus);
        const ink=paint.agents.get(read.actor)||paint.muted;
        const future=second(read.event)>second(active.event);
        const strength=emphasisAt('edge:'+read.message.actor+':'+read.actor,isCurrent?1:!inFocus ? .08 : path.selected ? .28 : .12,now,reduced);
        ctx.globalAlpha=strength;
        ctx.strokeStyle=path.selected?ink:paint.guide;
        ctx.lineWidth=1.1+2.0*strength;
        ctx.setLineDash(path.selected&&future?[5,4]:[]);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(c.x,c.y,b.x,b.y); ctx.stroke();
        ctx.setLineDash([]); arrow(ctx,path,path.selected?ink:paint.guide);
        if(path.selected) {
          const p=pointOn(path,.48), label=isCurrent?'Message '+((active.index??0)+1):bundle.selected.length>1?bundle.selected.length+' reads':future?'Later read':'Read';
          ctx.font='10px '+fontFamily; ctx.textAlign='center';
          const w=ctx.measureText(label).width+10;
          ctx.fillStyle=paint.paper; ctx.fillRect(p.x-w/2,p.y-7,w,14);
          ctx.fillStyle=ink; ctx.fillText(label,p.x,p.y+3);
        }
        if(isCurrent&&animate&&progress<1&&inFocus) {
          const p=pointOn(path,clamp(progress,0,1));
          ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2); ctx.fillStyle=paint.packet; ctx.fill();
        }
      }
      ctx.globalAlpha=1;
      for(const [id,node] of nodes) {
        const ink=paint.agents.get(id)||paint.muted;
        const involved=id===active.actor||id===active.message?.actor;
        const selected=focus===id;
        const strength=emphasisAt('agent:'+id,involved?1:focus ? (selected ? .85 : .25) : active.kind==='read' ? .32 : .7,now,reduced);
        ctx.globalAlpha=.15+.85*strength;
        const {x,y,w,h}=node.bounds;
        ctx.beginPath(); ctx.roundRect(x,y,w,h,9); ctx.fillStyle=paint.paper; ctx.fill();
        ctx.fillStyle=ink+Math.round(8+30*strength).toString(16).padStart(2,'0'); ctx.fill();
        ctx.strokeStyle=ink+(selected?'ff':involved?'ba':'60'); ctx.lineWidth=1+strength; ctx.stroke();
        ctx.fillStyle=ink; ctx.beginPath(); ctx.arc(x+13,y+17,3,0,Math.PI*2); ctx.fill();
        ctx.textAlign='left'; ctx.font='600 12px '+fontFamily; ctx.fillStyle=paint.ink;
        ctx.fillText('Agent '+id,x+23,y+21);
        const latest=actorEvents.get(id).findLast(event=>event.id<=active.event);
        const status=active.kind==='outcome'?'Complete':active.kind==='read'&&active.message.actor===id?'Sender':active.actor===id?
          active.kind==='read'?'Reader':active.kind==='send'?'Sharing':'Acting':latest?'Working':'Not started';
        ctx.font='10px '+fontFamily; ctx.fillStyle=paint.muted; ctx.fillText(status,x+13,y+40);
      }
      ctx.globalAlpha=1;
      if(!paths.length) {
        ctx.textAlign='center'; ctx.font='11px '+fontFamily; ctx.fillStyle=paint.muted;
        ctx.fillText(active.kind==='send'?'Posted, not yet read':'No recorded exchanges yet',cx,cy+4);
      }
      ctx.restore();
      hasDrawn=true;
      return [...nodes.values()];
    }
    function edgeHit(x,y) {
      let best=null, closest=7;
      for(const path of paths) {
        for(let t=.06;t<.96;t+=.025) {
          const p=pointOn(path,t), distance=Math.hypot(x-p.x,y-p.y);
          if(distance<closest || (distance<7 && path.current && !best?.current && distance<closest+1)) { best=path; closest=distance; }
        }
      }
      return best?{x,y,r:7,arc:true,earlierRead:true,event:best.read.event,
        message:best.read.message.id,moment:best.read.order}:null;
    }
    return {draw,edgeHit,get transitioning(){return transitioning;}};
  };
})();
