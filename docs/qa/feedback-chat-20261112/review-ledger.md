# Original review findings — final disposition

Runtime: `b386df48b84bf3571bb91938cbca9a3eeaf71246`. Independent original review ran at `2d8b147`; bounded source/component closure ran at this runtime revision. No new theme hunt was performed. Parent exact-revision native evidence closes the final conditional runtime gate in that source review.

| ID | Verified fix | Final evidence |
| --- | --- | --- |
| R1 | Busy textarea is read-only, not disabled; native focus survives failed save. Duplicate-send and reselection fences remain. | Native actual HTTP 503 → Enter-only retry → exact original UUID/body → confirmed 202; visible Done focus. |
| P2-001 | Actual node/route checks distinguish intentional target changes; incidental selector/class movement does not split the original operation. | Independent adversarial/component replay plus native same-node/sibling/class movement: original full body and UUID retained. New node/route/note protections pass separately. |
| P2-002 | Origin focus is consumed once on actual exit. Hidden late success cannot restore stale focus. | Independent deferred-success probe plus native delivery hold of a genuine successful local HTTP response: Close → unrelated input → release leaves that input focused. |

All three are closed. Source, component, native-local and hosted/provider evidence are distinct: native tests here use synthetic Linear and do not claim a new live provider submission or production release.
