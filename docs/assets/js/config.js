// Base URL of the Cloudflare deployment that serves data/ and the images (see PLAN.md).
// The localStorage key lets a local copy of cf-assets/ stand in during development; it is
// deliberately NOT a URL parameter, so a shared link can never redirect the site's data source.
function override() {
    try {
        return localStorage.getItem('wtv-cdn-base');
    } catch {
        return null;
    }
}

export const CDN_BASE = (override() || 'https://lucky-mud-f0cd.elsoldollo.workers.dev').replace(/\/$/, '');
