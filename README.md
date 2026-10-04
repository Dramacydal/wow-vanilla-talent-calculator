# WoW Vanilla Talents Viewer (static)

Static build of the talent viewer: browse and plan WoW Vanilla (0.7.0-1.12.x) talent trees for
any historical client build, and compare two builds. Runs entirely in the browser - no server, no
database. See [PLAN.md](PLAN.md) for the design and the decisions behind it.

- `docs/` - the site (published by GitHub Pages from `/docs`). Hand-written files plus the
  generated `docs/tree/` pages.
- `cf-assets/` - NOT in git. Data (`data/`) and Blizzard images, deployed to Cloudflare, which
  the site loads from (`docs/assets/js/config.js` holds the base URL).
- `tools/build-site.php` - regenerates `docs/tree/` from `cf-assets/data/index.json`.
- `tools/dev-cdn.py` - serves `cf-assets/` locally with CORS for offline testing.

Data comes from the extractor and database in the main `wow-talents-viewer` repository.

## Updating the data

1. In `wow-talents-viewer/web`: `php bin/console app:export-static` (writes into `cf-assets/`).
2. Here: `php tools/build-site.php` (regenerates `docs/tree/`).
3. Redeploy the contents of `cf-assets/` to Cloudflare; commit and push this repo.

## Local testing

```
python3 -m http.server 8200 --directory docs     # the site
python3 tools/dev-cdn.py 8201                    # local stand-in for the CDN
```
Then in the browser console on the site: `localStorage.setItem('wtv-cdn-base', 'http://localhost:8201')`
(remove the key to go back to the real CDN).
