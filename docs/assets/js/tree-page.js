import './talent-tree.js'; // mounts the Vue tree app on #talent-tree-app
import { ROOT, imageUrl, loadIndex, findBuild } from './data.js';

// Picker row + settings modal: plain DOM outside the Vue app (they sit in the .tt-picker
// bar next to the tree, not inside #talent-tree-app). The stub page ships the empty
// containers; everything data-driven is filled in here from data/index.json.
const app = document.getElementById('talent-tree-app');
const buildLabel = app.dataset.build;
const classSlug = app.dataset.class;

const form = document.getElementById('tt-picker-form');
const classPicker = document.getElementById('tt-class-picker');

const treeHref = (label, slug) => `${ROOT}tree/${encodeURIComponent(label)}/${encodeURIComponent(slug)}/`;

loadIndex().then((index) => {
    const select = form.build;
    for (const b of index.builds) {
        select.add(new Option(b.label, b.label, false, b.label === buildLabel));
    }
    // Switching build keeps the current class when the new build has it, otherwise falls back
    // to that build's first available class.
    select.addEventListener('change', () => {
        const target = index.builds.find((b) => b.label === select.value);
        const slug = target.classes[classSlug] ? classSlug : Object.keys(target.classes)[0];
        location.href = treeHref(target.label, slug);
    });

    const current = findBuild(index, buildLabel);
    if (!current) return;
    for (const cls of index.classes) {
        if (!current.classes[cls.slug]) continue;
        const link = document.createElement('a');
        link.className = 'tt-class-icon' + (cls.slug === classSlug ? ' tt-class-icon--active' : '');
        link.href = treeHref(current.label, cls.slug);
        link.title = cls.name;
        const iconUrl = imageUrl('class-icons', cls.iconPath);
        if (iconUrl) {
            const img = document.createElement('img');
            img.className = 'tt-class-icon-img';
            img.src = iconUrl;
            img.alt = cls.name;
            link.append(img);
        }
        classPicker.append(link);
    }
}).catch(() => {
    // The tree app reports its own load error; the picker just stays empty.
});

const gear = document.getElementById('tt-settings-gear');
const overlay = document.getElementById('tt-settings-overlay');
const closeButton = document.getElementById('tt-settings-close');
const sortAlpha = document.getElementById('tt-setting-sort-alpha');
const showId = document.getElementById('tt-setting-show-id');

gear.addEventListener('click', () => {
    // window.ttApp is the mounted Vue instance (assigned at the bottom of talent-tree.js) -
    // read its live `settings` rather than re-reading localStorage (single source of truth).
    const settings = window.ttApp.settings;
    sortAlpha.checked = settings.sortTabsAlphabetically;
    showId.checked = settings.showTalentIdInTooltip;
    overlay.hidden = false;
});
closeButton.addEventListener('click', () => { overlay.hidden = true; });
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
});

// Mutating window.ttApp.settings directly triggers Vue's own reactivity (same reactive object
// the app renders from) and its $watch persists to localStorage.
sortAlpha.addEventListener('change', (e) => { window.ttApp.settings.sortTabsAlphabetically = e.target.checked; });
showId.addEventListener('change', (e) => { window.ttApp.settings.showTalentIdInTooltip = e.target.checked; });
