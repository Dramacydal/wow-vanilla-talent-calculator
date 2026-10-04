import { CDN_BASE } from './config.js';

// Relative path from the current page up to the site root ("../../../" on a tree page). Set per
// page - the stub generator writes it into <html data-root> - so the site works under any base
// path (user.github.io/<repo>/ or a custom domain) with no absolute URLs anywhere.
export const ROOT = document.documentElement.dataset.root ?? './';

export function imageUrl(folder, hash) {
    return hash ? `${CDN_BASE}/${folder}/${hash}.png` : null;
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
    return response.json();
}

let indexPromise = null;

/** data/index.json: classes, plus one entry per build GROUP (representative label, collapsed members, class -> tree hash). */
export function loadIndex() {
    indexPromise ??= fetchJson(`${CDN_BASE}/data/index.json`);
    return indexPromise;
}

/** A label is either a group's representative or one of the builds collapsed into it. */
export function findBuild(index, label) {
    return index.builds.find((b) => b.label === label || b.members.includes(label)) ?? null;
}

const treeCache = new Map();

/** Raw tree file for one class of a build group; named by content hash, so safe to memoize forever. */
export function loadTree(build, slug) {
    const hash = build.classes[slug];
    if (!hash) return Promise.reject(new Error(`No ${slug} tree for ${build.label}`));
    if (!treeCache.has(hash)) treeCache.set(hash, fetchJson(`${CDN_BASE}/data/trees/${hash}.json`));
    return treeCache.get(hash);
}

/** Raw tree + build/class info -> the shape the tree view renders (image hashes resolved to URLs). */
export function hydrateTree(raw, build, cls) {
    return {
        build: { label: build.label, members: build.members },
        class: { slug: cls.slug, name: cls.name, iconUrl: imageUrl('class-icons', cls.iconPath) },
        tabs: raw.tabs.map((tab) => ({
            id: tab.id,
            name: tab.name,
            iconUrl: imageUrl('icons', tab.iconPath),
            background: {
                topLeft: imageUrl('backgrounds', tab.background.topLeft),
                topRight: imageUrl('backgrounds', tab.background.topRight),
                bottomLeft: imageUrl('backgrounds', tab.background.bottomLeft),
                bottomRight: imageUrl('backgrounds', tab.background.bottomRight),
            },
            talents: tab.talents.map((t) => ({
                ...t,
                ranks: t.ranks.map((r) => ({ ...r, iconUrl: imageUrl('icons', r.iconPath) })),
            })),
        })),
    };
}

export async function loadTreeView(label, slug) {
    const index = await loadIndex();
    const build = findBuild(index, label);
    const cls = index.classes.find((c) => c.slug === slug);
    if (!build || !cls) throw new Error(`Unknown build or class: ${label} / ${slug}`);
    return hydrateTree(await loadTree(build, slug), build, cls);
}
