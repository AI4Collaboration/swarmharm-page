const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const api={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'static/js/trajectory-graph.js'),'utf8'),api);
const {connectionsAtTime}=api.window.swarmTrajectorySelection;
const data=JSON.parse(fs.readFileSync(path.join(root,'static/data/trajectories/r136.json'),'utf8'));
const events=new Map(data.events.map(event=>[event.id,event]));
const second=id=>events.get(id).time.split(':').reduce((total,n)=>total*60+Number(n),0);
const reads=data.messages.flatMap(message=>[...message.reads,...(message.repeatReads||[])].map(receipt=>
  ({...receipt,kind:'read',message}))).sort((a,b)=>a.event-b.event);
reads.forEach((read,order)=>{read.order=order;});
const multiple=reads.find(read=>read.event===51);
const ids=items=>Array.from(items,item=>item.message.id+':'+item.actor);

test('one native read action exposes all four messages, not only the chosen message',()=>{
  assert.deepEqual(ids(connectionsAtTime(reads,multiple,second)),[
    'm46-1:C','m46-2:C','m47-3:C','m49-4:C'
  ]);
});
test('selecting a post exposes all later readers of every message posted at that second',()=>{
  const outgoing=connectionsAtTime(reads,{kind:'send',event:46},second);
  assert.equal(outgoing.length,6);
  assert.deepEqual([...new Set(outgoing.map(read=>read.actor))].sort(),['A','C','D']);
  assert.ok(outgoing.every(read=>read.message.event===46));
});
test('agent focus includes incoming and outgoing messages and leaves input evidence unchanged',()=>{
  const original=JSON.stringify(reads);
  assert.deepEqual(ids(connectionsAtTime(reads,multiple,second,'B')),['m46-1:C','m46-2:C']);
  assert.equal(connectionsAtTime(reads,multiple,second,'C').length,4);
  assert.equal(connectionsAtTime(reads,multiple,second,'A').length,1);
  assert.equal(JSON.stringify(reads),original);
});
test('time selection groups different events in one second, including incoming and outgoing',()=>{
  const times=new Map([[1,4],[2,10],[3,10],[4,18],[5,24]]);
  const fixture=[
    {event:2,actor:'B',message:{id:'one',actor:'A',event:1}},
    {event:3,actor:'C',message:{id:'two',actor:'D',event:1}},
    {event:4,actor:'D',message:{id:'three',actor:'B',event:3}},
    {event:5,actor:'A',message:{id:'four',actor:'D',event:4}}
  ];
  assert.deepEqual(ids(connectionsAtTime(fixture,{kind:'read',event:2},id=>times.get(id))),['one:B','two:C','three:D']);
});
test('scrubbing backwards cannot leave unrelated later connections selected',()=>{
  connectionsAtTime(reads,reads.at(-1),second);
  assert.equal(connectionsAtTime(reads,{kind:'action',event:data.events[0].id},second).length,0);
  assert.equal(connectionsAtTime(reads,{kind:'outcome',event:Infinity},second).length,0);
  assert.equal(connectionsAtTime([],multiple,second).length,0);
});
function canvasStub() {
  const log={curves:0,dashes:[],text:[]};
  const ctx=new Proxy({
    measureText:text=>({width:text.length*6}),
    quadraticCurveTo:()=>{log.curves++;},
    setLineDash:dash=>{if(dash.length)log.dashes.push([...dash]);},
    fillText:text=>log.text.push(text)
  },{get:(object,key)=>key in object?object[key]:()=>{}});
  return {ctx,log};
}
const paint={agents:new Map(data.actors.map(actor=>[actor.id,'#82aabb'])),paper:'#111315',muted:'#aaaaaa',ink:'#eeeeee',guide:'#888888',packet:'#ffffff'};
const actorEvents=new Map(data.actors.map(actor=>[actor.id,data.events.filter(event=>event.actor===actor.id)]));
test('graph bundles the two B-to-C notes without losing the four selectable receipts',()=>{
  const graph=api.window.createMessageGraph({actors:data.actors,actorEvents,fontFamily:'sans-serif'});
  const {ctx,log}=canvasStub();
  const connections=connectionsAtTime(reads,multiple,second);
  const nodes=graph.draw({ctx,width:700,height:380,paint,active:multiple,connections,history:[],focus:null,second,progress:0,animate:false});
  assert.equal(log.curves,3);
  assert.ok(log.text.includes('2 reads'));
  assert.equal(log.dashes.length,0,'same-event receipts must not be labelled as later reads');
  assert.equal(connections.length,4);
  assert.equal(nodes.length,4);
});
test('graph shows future receipts as dashed and never creates edges in a no-message run',()=>{
  const graph=api.window.createMessageGraph({actors:data.actors,actorEvents,fontFamily:'sans-serif'});
  const future=canvasStub(), active={kind:'send',event:46,actor:'B',order:0};
  graph.draw({ctx:future.ctx,width:312,height:310,paint,active,connections:connectionsAtTime(reads,active,second),history:[],focus:null,second,progress:0,animate:false});
  assert.equal(future.log.dashes.length,3);
  const empty=canvasStub();
  const nodes=graph.draw({ctx:empty.ctx,width:312,height:310,paint,active:{kind:'action',event:1,actor:'A'},connections:[],history:[],focus:null,second,progress:0,animate:false});
  assert.equal(empty.log.curves,0);
  assert.equal(graph.edgeHit(156,155),null);
  assert.ok(nodes.every(node=>node.bounds.x>=0&&node.bounds.x+node.bounds.w<=312&&node.bounds.y>=0&&node.bounds.y+node.bounds.h<=310));
});
