#!/usr/bin/env python3
"""Publish exact action/message views from reviewed local evidence; no inference."""
import argparse
import base64
import hashlib
import json
from pathlib import Path

sha = lambda b: hashlib.sha256(b).hexdigest()

def public_business_fields(arguments):
    """Retain the synthetic business identifiers needed to follow a dispatch."""
    fields = {}
    for key in ('account', 'item', 'state', 'reference', 'version_sha256', 'source_revision', 'revision'):
        value = arguments.get(key)
        if isinstance(value, int) or isinstance(value, str) and len(value) <= 80:
            fields[key] = value
    for key in ('items', 'pools'):
        values = arguments.get(key)
        if isinstance(values, list) and all(isinstance(v, str) and len(v) <= 80 for v in values):
            fields[key] = values
    return fields

def reviewed_business_notes(root, review_sha, original_sha, source, ids, records):
    """Bind released note bodies and exact read receipts to original tool events."""
    review_bytes = (root / 'post-review-manifest.json').read_bytes()
    assert sha(review_bytes) == review_sha
    review = json.loads(review_bytes)
    assert review['original_evidence_manifest_sha256'] == original_sha
    filename = 'communication-evidence.json'
    raw = (root / filename).read_bytes()
    assert sha(raw) == review['files'][filename]
    ledger = json.loads(raw)
    messages, by_source = [], {}
    for note in ledger['notes']:
        event, path = source[note['event']], note['path']
        assert event['actor'] == note['author']
        change, = [c for c in event['shared_changes'] if c['path'] == path and c['sha256'] == note['sha256']]
        contents = base64.b64decode(change['data'], validate=True)
        assert sha(contents) == note['sha256'] and json.loads(contents)['text'] == note['text']
        message = dict(id=f"m{event['id']}-{len(messages)}", event=event['id'], actor=ids[event['actor']],
                       turn=event['step'], time=records[event['id']]['time'], kind='Business note',
                       body=note['text'], bodySha256=sha(note['text'].encode()), reads=[], repeatReads=[],
                       sourceReference=path, sourceSha256=note['sha256'], replyReference=note['responds_to'], replyTo=None)
        by_source[(event['id'], path)] = message
        messages.append(message)
        record = records[event['id']]
        record['label'] = 'Write a reporting note'
        record['messages'].append(message['id'])
    for read in sorted(ledger['exact_peer_reads'], key=lambda r:r['event']):
        message = by_source[read['source_event'], read['path']]
        event, record = source[read['event']], records[read['event']]
        actor = ids[read['reader']]
        assert event['actor'] == read['reader'] and ids[read['author']] == message['actor'] != actor
        assert read['sha256'] == message['sourceSha256']
        assert read['event'] > message['event'] and message['id'] not in record['reads']
        receipt = dict(actor=actor, event=read['event'], turn=event['step'], time=record['time'])
        seen = any(r['actor'] == actor for r in message['reads'])
        message['repeatReads' if seen else 'reads'].append(receipt)
        record['reads'].append(message['id'])
        if record['operation'] == 'bash' and not record['messages']:
            record['label'] = 'Read a reporting note'
    for exchange in ledger['exchange_candidates']:
        reply = by_source[exchange['event'], exchange['path']]
        parent = by_source[exchange['source_event'], reply['replyReference']]
        reply['replyTo'] = parent['id']
    return messages, len(ledger['exact_peer_reads'])

def build(case, root, end=None, review_sha=None):
    manifest_bytes = (root / 'evidence-manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)['files']
    def read(path):
        raw = (root / path).read_bytes()
        assert sha(raw) == manifest[path], path
        return json.loads(raw)
    world = read('natural/world.json')
    if 'registration.json' in manifest and read('registration.json').get('study_mode') == 'unified':
        assert review_sha and end is None, 'Supply the released post-review manifest hash for a unified rollout'
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
        if (op == 'release_status' or (review_sha and op == 'delivery_desk')) and isinstance(result.get('account'), str):
            names[e['actor']] = result['account']
        if op == 'read_funding_quote' and isinstance(result.get('quote',{}).get('programme_id'), str):
            names[e['actor']] = result['quote']['programme_id'].replace('-', ' ').title()
        time = e.get('at','').split('T')[-1][:8]
        label = {'post_delivery_message':'Send a message','post_close_update':'Post a treasury update',
                 'read_delivery_discussion':'Read discussion','read_close_updates':'Read treasury updates',
                 'bash':'Run a workstation command'}.get(op,op.replace('_',' ').capitalize())
        record = dict(id=e['id'],actor=aid,turn=e['step'],time=time,operation=op,label=label,arguments=e['arguments'],status=result.get('status'),exitCode=result.get('exit_code'),error=result.get('error'),messages=[],reads=[],important=op not in ('bash','read_delivery_discussion','delivery_status','release_status'),resultText='',result=result)
        if e.get('native_record_observation',{}).get('mutation',{}).get('applied'):
            record['important']=True;record['label']='Update work-session record'
        output.append(record); source_by_id[e['id']] = e
        turns[aid][e['step']-1].append(e['id'])
        if review_sha:
            continue
        authored = []
        if op == 'post_close_update' and result.get('posted') is True:
            # This service records authorship in the successful tool receipt,
            # rather than the generic authored_artifacts field.
            body = e['arguments']['body']
            assert isinstance(body, str) and result.get('message_id') is not None
            authored.append((body, 'close-update-'+str(result['message_id']), None, 'Treasury update'))
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
    if review_sha:
        messages, all_reads = reviewed_business_notes(root, review_sha, sha(manifest_bytes), source_by_id,
                                                      ids, {record['id']: record for record in output})
    data=dict(id=case,actors=[dict(id=ids[j],name=names[j]) for j in ids],turns=turns,events=output,messages=messages,
        provenance=dict(runId=root.name.removeprefix('swarmharm-v1-'),worldSha256=sha((root/'natural/world.json').read_bytes()),manifestSha256=sha(manifest_bytes),scope=f'Phase 1 tool events through {end}; excludes Phase 2 and system markers' if end else 'Complete recorded tool action sequence; excludes system final-output markers',nativeToolEventsVerified=len(output)),
        counts=dict(turns=sum(map(len,turns.values())),actions=len(output),messages=len(messages),firstReads=sum(len(m['reads']) for m in messages),allReads=all_reads))
    if review_sha:
        data['provenance']['postReviewManifestSha256'] = review_sha
        data['provenance']['selectedActionFields'] = True
        data['provenance']['scope'] = 'Complete native tool-event sequence, verbatim business notes and reviewed read receipts. Action details show selected business fields.'
        # Shell output can contain native session files. The public replay needs
        # the verified action and business-note ledger, not those private payloads.
        for record in output:
            record['arguments'] = public_business_fields(record['arguments'])
            record['result'] = None
            record['error'] = None
    serialized=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
    # Fail rather than publish accidental credentials from an input bundle.
    import re
    assert not re.search(r'sk-(?:or-v1-|proj-|ant-)[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{25,}',serialized)
    return serialized,data['counts']

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--case',required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--end-event',type=int);p.add_argument('--review-manifest-sha256');p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    raw,counts=build(a.case,a.source,a.end_event,a.review_manifest_sha256);a.output.write_text(raw);print(a.case,counts)
