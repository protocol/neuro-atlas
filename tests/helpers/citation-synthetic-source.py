#!/usr/bin/env python3
"""TEST ONLY: generate an explicitly synthetic private receipt run, no network."""
import argparse
import importlib.util
from pathlib import Path
import sys
from unittest.mock import patch
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('citation_test_adapter',root/'scripts/openalex-citation-latency.py')
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
folder=Path(sys.argv[1]).resolve()
remaining=10000

def request(path,params):
    global remaining
    if path=='/rate-limit':
        return {'rate_limit':{'daily_budget_usd':1,'daily_used_usd':0,'daily_remaining_usd':1,'prepaid_remaining_usd':0}},{}
    filt=params['filter']
    remaining-=10 if 'title_and_abstract' in filt else 1
    headers={'X-RateLimit-Remaining':str(remaining),'X-RateLimit-Limit':'10000'}
    if filt.startswith('openalex_id:'):
        return {'results':[{'id':'https://openalex.org/W1','publication_year':1990}]},headers
    if 'sample' in params:
        year=int(filt.split('publication_year:')[-1])
        return {'results':[{'id':f'https://openalex.org/W{100+i}','publication_year':year,'referenced_works':['https://openalex.org/W1']} for i in range(8)]},headers
    return {'meta':{'count':8 if 'title_and_abstract' in filt else 100}},headers

args=argparse.Namespace(run=str(folder),out=str(folder/'neurotech.csv'),acquire=True,lock=str(folder.parent/'synthetic.lock'),max_credits=3000,reserve_credits=1000,max_seconds=7200)
with patch.object(module,'request',request),patch.object(module.time,'sleep',lambda _:None):
    module.run(args)
