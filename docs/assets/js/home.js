import { ROOT, imageUrl, loadIndex, findBuild } from './data.js';

const modeViewBtn = document.getElementById('home-mode-view');
const modeCompareBtn = document.getElementById('home-mode-compare');
const selectA = document.getElementById('home-build-select');
const selectB = document.getElementById('home-build-select-b');
const vsLabel = document.getElementById('home-build-vs');
const classRow = document.getElementById('home-class-row');
const emptyMessage = document.getElementById('home-class-row-empty');
const sameBuildHint = document.getElementById('home-build-row-hint');
const note = document.getElementById('home-build-note');
const errorEl = document.getElementById('home-error');

let mode = 'view';

function enc(s) {
    return encodeURIComponent(s);
}

loadIndex().then((index) => {
    const byLabel = new Map(index.builds.map((b) => [b.label, b]));

    for (const select of [selectA, selectB]) {
        for (const b of index.builds) select.add(new Option(b.label, b.label));
    }
    const last = index.builds[index.builds.length - 1].label;
    // ?build=<label> preselects a build (a collapsed member label resolves to its group).
    const requested = findBuild(index, new URLSearchParams(location.search).get('build') ?? '');
    selectA.value = requested?.label ?? last;
    selectB.value = last;

    const icons = index.classes.map((cls) => {
        const link = document.createElement('a');
        link.className = `class-icon class-icon--${cls.slug}`;
        link.dataset.slug = cls.slug;
        link.title = cls.name;
        const url = imageUrl('class-icons', cls.iconPath);
        if (url) {
            const img = document.createElement('img');
            img.className = 'class-icon-img';
            img.src = url;
            img.alt = cls.name;
            link.append(img);
        } else {
            const label = document.createElement('span');
            label.className = 'class-icon-label';
            label.textContent = cls.name.slice(0, 3).toUpperCase();
            link.append(label);
        }
        classRow.insertBefore(link, emptyMessage);

        return link;
    });

    function updateNote(builds) {
        note.textContent = builds
            .filter((b) => b.members.length)
            .map((b) => `${b.label} also covers ${b.members.join(', ')}`)
            .join(' · ');
    }

    function showClasses(available, hrefFor) {
        let any = false;
        for (const link of icons) {
            const ok = available(link.dataset.slug);
            link.hidden = !ok;
            if (ok) {
                any = true;
                link.href = hrefFor(link.dataset.slug);
            }
        }
        emptyMessage.hidden = any;
    }

    function refresh() {
        const a = byLabel.get(selectA.value);
        if (mode === 'view') {
            sameBuildHint.hidden = true;
            updateNote([a]);
            showClasses((slug) => a.classes[slug], (slug) => `${ROOT}tree/${enc(a.label)}/${enc(slug)}/`);
            return;
        }

        const b = byLabel.get(selectB.value);
        updateNote([a, b]);
        if (a === b) {
            for (const link of icons) link.hidden = true;
            emptyMessage.hidden = true;
            sameBuildHint.hidden = false;
            return;
        }
        sameBuildHint.hidden = true;
        // A class can only be compared if it has talent data on BOTH builds.
        showClasses(
            (slug) => a.classes[slug] && b.classes[slug],
            (slug) => `${ROOT}compare/?a=${enc(a.label)}&b=${enc(b.label)}&class=${enc(slug)}`,
        );
    }

    function setMode(next) {
        mode = next;
        const compare = next === 'compare';
        modeViewBtn.setAttribute('aria-pressed', String(!compare));
        modeCompareBtn.setAttribute('aria-pressed', String(compare));
        vsLabel.hidden = !compare;
        selectB.hidden = !compare;
        refresh();
    }

    modeViewBtn.addEventListener('click', () => setMode('view'));
    modeCompareBtn.addEventListener('click', () => setMode('compare'));
    selectA.addEventListener('change', () => {
        if (mode === 'view') {
            const url = new URL(location.href);
            url.searchParams.set('build', selectA.value);
            history.replaceState(null, '', url);
        }
        refresh();
    });
    selectB.addEventListener('change', refresh);

    refresh();
}).catch((e) => {
    errorEl.textContent = `Failed to load build data: ${e.message}`;
    errorEl.hidden = false;
});
