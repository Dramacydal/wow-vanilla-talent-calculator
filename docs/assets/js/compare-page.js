import './compare-tree.js'; // mounts the Vue compare app on #compare-tree-app
import { ROOT, imageUrl, loadIndex, findBuild } from './data.js';

// Header (class icon + "A vs B" linking to each build's tree page) and the document title.
// The diff itself is rendered by compare-tree.js; this only needs index.json, not the trees.
const params = new URLSearchParams(location.search);
const header = document.getElementById('cmp-header');

loadIndex().then((index) => {
    const cls = index.classes.find((c) => c.slug === params.get('class'));
    const buildA = findBuild(index, params.get('a') ?? '');
    const buildB = findBuild(index, params.get('b') ?? '');
    if (!cls || !buildA || !buildB) return; // compare-tree.js shows the error message

    document.title = `${cls.name} - ${buildA.label} vs ${buildB.label} - WoW Vanilla Talents Viewer`;

    const iconUrl = imageUrl('class-icons', cls.iconPath);
    if (iconUrl) {
        const img = document.createElement('img');
        img.className = 'cmp-header-icon';
        img.src = iconUrl;
        img.alt = cls.name;
        header.append(img);
    }

    const buildLink = (build) => {
        const a = document.createElement('a');
        a.className = 'cmp-header-build-link';
        a.href = `${ROOT}tree/${encodeURIComponent(build.label)}/${encodeURIComponent(cls.slug)}/`;
        a.textContent = build.label;
        return a;
    };
    const span = document.createElement('span');
    span.append(buildLink(buildA), ' vs ', buildLink(buildB));
    header.append(span);
}).catch(() => {});
