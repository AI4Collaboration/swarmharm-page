#!/usr/bin/env python3
"""Publish exact action/message views from reviewed local evidence; no inference."""
import argparse
import base64
import hashlib
import json
from pathlib import Path

sha = lambda b: hashlib.sha256(b).hexdigest()

def build(case, root, end=None):
    manifest_bytes = (root / 'evidence-manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)['files']
    def read(path):
        raw = (root / path).read_bytes()
        assert sha(raw) == manifest[path], path
        return json.loads(raw)
    world = read('natural/world.json')
    plan = world['plan']
    ids = {job: chr(65+i) for i, job in enumerate(plan)}
    events = sorted((e for e in world['events'] if e['actor'] in ids and e['operation'] != 'final_output' and (end is None or (e['id'] <= end and not e.get('continuation')))), key=lambda e:e['id'])
    turns, names = {}, {job:'Agent '+ids[job] for job in ids}
    for job in ids:
        responses = sorted(p for p in manifest if p.startswith(f'natural/{job}/trace/') and p.endswith('.response.json'))
        if end is not None:
            last = max(e['step'] for e in events if e['actor']==job)
            responses = [p for p in responses if int(Path(p).name.split('.')[0]) <= last]
        turns[ids[job]] = [[] for _ in range(max(int(Path(p).name.split('.')[0]) for p in responses))]
        for path in responses:
            read(path)
    # Each displayed action must also occur in the original native tool record.
    native = {}
    for path in manifest:
        if '/trace/' in path and '-tool-' in path and path.endswith('.json'):
            data = read(path)
            if 'event_id' in data: native[(path.split('/')[1],data['event_id'])] = data
    output, messages, source_by_id = [], [], {}
    for e in events:
        n = native[(e['actor'],e['id'])]
        assert n['name']==e['operation'] and json.loads(n['arguments'])==e['arguments'] and n['result']==e['result']
        aid, op = ids[e['actor']], e['operation']
        result = e.get('result',{})
        time = e.get('at','').split('T')[-1][:8]
        label = {'post_delivery_message':'Send a message','read_delivery_discussion':'Read discussion', 'bash':'Run a workstation command'}.get(op,op.replace('_',' ').capitalize())
        record = dict(id=e['id'],actor=aid,turn=e['step'],time=time,operation=op,label=label,arguments=e['arguments'],status=result.get('status'),exitCode=result.get('exit_code'),error=result.get('error'),messages=[],reads=[],important=op not in ('bash','read_delivery_discussion','delivery_status','release_status'),resultText='',result=result)
        if e.get('native_record_observation',{}).get('mutation',{}).get('applied'):
            record['important']=True;record['label']='Update work-session record'
        output.append(record); source_by_id[e['id']] = e
        turns[aid][e['step']-1].append(e['id'])
        authored = []
        for a in e.get('authored_artifacts',[]):
            if isinstance(a.get('text'),str):
                authored.append((a['text'],a.get('reference'),a.get('reply_to'),'Message'))
                if a.get('sender'): names[e['actor']]=a['sender']
        for change in e.get('shared_changes',[]):
            if change.get('origin')!='bash' or change.get('author')!=e['actor']:continue
            raw = base64.b64decode(change['data'])
            assert sha(raw)==change['sha256']
            try: note=json.loads(raw)
            except (ValueError,UnicodeDecodeError): continue
            if isinstance(note,dict):
                body = note.get('note') or note.get('message') or note.get('body')
                if isinstance(body,str): authored.append((body,change['path'],None,'Shared-file note'))
        for body,ref,reply,kind in authored:
            mid=f"m{e['id']}-{len(messages)}"
            messages.append(dict(id=mid,event=e['id'],actor=aid,turn=e['step'],time=time,kind=kind,body=body,bodySha256=sha(body.encode()),reads=[],replyTo=None,sourceReference=ref,replyReference=reply))
            record['messages'].append(mid)
    all_reads=0
    for m in messages:
        seen=set()
        for record in output:
            if record['id']<=m['event'] or record['actor']==m['actor']:continue
            # Exact text in the returned value, not a guessed link from timing.
            raw=json.dumps(source_by_id[record['id']]['result'],ensure_ascii=False)
            if json.dumps(m['body'],ensure_ascii=False)[1:-1] not in raw: continue
            record['reads'].append(m['id']);all_reads+=1
            if record['actor'] not in seen:
                m['reads'].append(dict(actor=record['actor'],turn=record['turn'],event=record['id'],time=record['time']))
                seen.add(record['actor'])
        if m['replyReference']:
            target=next((x for x in reversed(messages) if x['event']<m['event'] and x['sourceReference']==m['replyReference']),None)
            if target:m['replyTo']=target['id']
    data=dict(id=case,actors=[dict(id=ids[j],name=names[j]) for j in ids],turns=turns,events=output,messages=messages,
        provenance=dict(runId=root.name.removeprefix('swarmharm-v1-'),worldSha256=sha((root/'natural/world.json').read_bytes()),manifestSha256=sha(manifest_bytes),scope=f'Phase 1 tool events through {end}; excludes Phase 2 and system markers' if end else 'Complete recorded tool action sequence; excludes system final-output markers',nativeToolEventsVerified=len(output)),
        counts=dict(turns=sum(map(len,turns.values())),actions=len(output),messages=len(messages),firstReads=sum(len(m['reads']) for m in messages),allReads=all_reads))
    serialized=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
    # Fail rather than publish accidental credentials from an input bundle.
    import re
    assert not re.search(r'sk-(?:or-v1-|proj-)[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{25,}',serialized)
    return serialized,data['counts']

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--case',required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--end-event',type=int);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    raw,counts=build(a.case,a.source,a.end_event);a.output.write_text(raw);print(a.case,counts)
