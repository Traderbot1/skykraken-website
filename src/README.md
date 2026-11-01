# Sources

`terrain.js` is the source of `assets/terrain.js` (Three.js scene). Rebuild after editing:

    npm pack three@0.187.0 && tar xzf three-0.187.0.tgz
    npx esbuild src/terrain.js --bundle --minify --format=esm \
      --alias:three=./package/build/three.module.js --outfile=assets/terrain.js

Vendored libraries in `assets/vendor`: GSAP 3.15.0 (gsap.min.js, ScrollTrigger.min.js).
Shared header/footer: `python3 tools/chrome.py`.
