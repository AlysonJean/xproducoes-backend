Title: Proposal: use sha256 instead of sha1 for entity tag computation

Description:

The current implementation of `etag` (v1.8.1) uses `crypto.createHash('sha1')` to compute ETag entity hashes (see `index.js`). SHA-1 is considered weak and is flagged by security scanners (for example Snyk's lesson on insecure hash algorithms: https://learn.snyk.io/lesson/insecure-hash/?loc=ide&ecosystem=javascript).

Proposal:
- Replace `sha1` with `sha256` in the entity hash computation. This increases collision resistance without changing the public API (ETag values will change, which is acceptable).

Rationale:
- SHA-1 suffers from known collision attacks; modern best practices prefer SHA-2 family (sha256) or stronger.
- ETag values are used for caching; stronger hashes reduce risk of accidental collision-based cache poisoning.

Compatibility notes:
- ETag values will change; downstream caches may invalidate previous cached entries. This is a benign backward-incompatible change and acceptable for security.
- Project maintainers may prefer to expose configuration (algorithm option) instead of forcing sha256.

Suggested patch (diff):
```diff
-  var hash = crypto
-    .createHash('sha1')
-    .update(entity, 'utf8')
-    .digest('base64')
-    .substring(0, 27)
+  var hash = crypto
+    .createHash('sha256')
+    .update(entity, 'utf8')
+    .digest('base64')
+    .substring(0, 27)
```

Testing:
- Run server and verify responses include ETag header and no runtime errors.
- Optional: add an option to the module to select the algorithm, defaulting to sha256.

If you want, I can open a PR with the patch and tests.
