# 2026-01-01 — A fictional cache ownership decision

## Conclusion

In this example the parser owns a cache keyed by content identity. Callers consume the result without constructing a second cache.

## Material value

- Topic key: cache-ownership
- Interview: no
- Share: yes — explain duplicate ownership with a small example

## Problem and constraints

Two fictional callers proposed independent caches for the same parser output.

## Decision and alternatives

Keep one cache beside the parser. A second cache would introduce another invalidation owner.

## Outcome and evidence boundaries

An illustrative design narrative, not an executed experiment. Latency, adoption and production impact are unmeasured.
