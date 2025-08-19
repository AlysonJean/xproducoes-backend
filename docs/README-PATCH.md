Persisting local fixes for node_modules using patch-package

1) We applied a local fix to `etag` to use `sha256` instead of `sha1`.

2) The change is saved as a patch at `patches/etag+1.8.1.patch`. After running `npm install`, `patch-package` will re-apply the patch automatically thanks to the `postinstall` script in package.json.

Commands used:

```powershell
cd "d:\agora vai\backend"
npm install --save-dev patch-package postinstall-postinstall
# modify node_modules/etag/index.js
npx patch-package etag
# ensure package.json has: "postinstall": "patch-package"
```

3) Long term options:
- Open an issue / PR on upstream `jshttp/etag` with the proposed change.
- Replace dependency with maintained fork or alternative package.

4) Reverting the patch:
- Delete `patches/etag+1.8.1.patch` and remove the `postinstall` script, then run `npm install`.
