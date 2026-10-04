import { imageUrl, loadIndex, loadTree, findBuild } from './data.js';

// Browser port of the server-side TalentTreeComparer. Same matching rule: a talent is "the
// same talent" across two builds when its FIRST rank has the same real Blizzard spell id
// (tab/talent ids are build-local and get renumbered). A talent whose rank-1 ability was
// swapped for a different one is therefore remove + add, not a change.

function indexTalents(rawTree) {
    const byAnchor = new Map();
    for (const tab of rawTree.tabs) {
        for (const talent of tab.talents) {
            const rank1 = talent.ranks.find((r) => r.rankIndex === 1);
            if (!rank1) continue; // every real talent has a rank 1 - defensive only
            byAnchor.set(rank1.spellId, { tabName: tab.name, talent });
        }
    }
    return byAnchor;
}

const RANK_FIELDS = [
    'spellId', 'name', 'iconPath', 'description', 'isAbility', 'powerType', 'powerCost',
    'isMeleeRange', 'rangeMinYards', 'rangeMaxYards', 'castTimeMs', 'cooldownMs',
    'stanceRequirement', 'equipRequirement',
];

function ranksDiffer(a, b) {
    return RANK_FIELDS.some((f) => a[f] !== b[f]);
}

function talentsDiffer(a, b) {
    if (a.talent.tier !== b.talent.tier || a.talent.columnIndex !== b.talent.columnIndex) return true;
    if (a.talent.maxRank !== b.talent.maxRank || a.tabName !== b.tabName) return true;

    const ranksA = new Map(a.talent.ranks.map((r) => [r.rankIndex, r]));
    const ranksB = new Map(b.talent.ranks.map((r) => [r.rankIndex, r]));
    for (const idx of new Set([...ranksA.keys(), ...ranksB.keys()])) {
        const ra = ranksA.get(idx);
        const rb = ranksB.get(idx);
        if (!ra || !rb || ranksDiffer(ra, rb)) return true;
    }
    return false;
}

function serialize({ tabName, talent }) {
    return {
        tabName,
        tier: talent.tier,
        columnIndex: talent.columnIndex,
        maxRank: talent.maxRank,
        ranks: talent.ranks.map((r) => ({ ...r, iconUrl: imageUrl('icons', r.iconPath) })),
    };
}

/** -> [{ anchorSpellId, status: added|removed|changed|unchanged, a, b }]; unchanged carry no payload. */
export function compareTrees(rawA, rawB) {
    const talentsA = indexTalents(rawA);
    const talentsB = indexTalents(rawB);
    const anchors = [...new Set([...talentsA.keys(), ...talentsB.keys()])].sort((x, y) => x - y);

    return anchors.map((anchorSpellId) => {
        const a = talentsA.get(anchorSpellId);
        const b = talentsB.get(anchorSpellId);
        if (!a) return { anchorSpellId, status: 'added', a: null, b: serialize(b) };
        if (!b) return { anchorSpellId, status: 'removed', a: serialize(a), b: null };
        const changed = talentsDiffer(a, b);
        return { anchorSpellId, status: changed ? 'changed' : 'unchanged', a: changed ? serialize(a) : null, b: changed ? serialize(b) : null };
    });
}

/** Resolves both builds (a collapsed member label maps to its group) and compares one class between them. */
export async function loadCompare(labelA, labelB, slug) {
    const index = await loadIndex();
    const cls = index.classes.find((c) => c.slug === slug);
    const buildA = findBuild(index, labelA ?? '');
    const buildB = findBuild(index, labelB ?? '');
    if (!cls || !buildA || !buildB) throw new Error('Unknown build or class in the link.');
    if (!buildA.classes[slug] || !buildB.classes[slug]) throw new Error(`${cls.name} has no talent data on one of these builds.`);

    const [rawA, rawB] = await Promise.all([loadTree(buildA, slug), loadTree(buildB, slug)]);
    return { buildA, buildB, class: cls, talents: compareTrees(rawA, rawB) };
}
