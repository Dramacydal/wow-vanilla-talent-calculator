<?php

/**
 * Generates the per-route pages of the static site from data/index.json:
 *   docs/tree/<build>/<class>/index.html   one page per build GROUP representative x class
 *   docs/tree/<member>/<class>/index.html  tiny redirect to the representative, for builds
 *                                          that were collapsed into a group
 *
 * Usage: php tools/build-site.php [--index=path/to/index.json]
 * Defaults to ../cf-assets/data/index.json. Regenerates docs/tree/ from scratch every run.
 * Every URL on a page is relative (data-root says how far up the site root is), so the
 * site works unchanged under /<repo>/ or on a custom domain.
 */

$root = dirname(__DIR__);
$indexPath = $root.'/cf-assets/data/index.json';
foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--index=')) {
        $indexPath = substr($arg, strlen('--index='));
    }
}
$index = json_decode((string) file_get_contents($indexPath), true, 512, JSON_THROW_ON_ERROR);

$safe = static function (string $s): string {
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $s)) {
        throw new RuntimeException("Unsafe path component: $s");
    }

    return $s;
};
$h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$classNames = [];
foreach ($index['classes'] as $c) {
    $classNames[$c['slug']] = $c['name'];
}

$treeDir = $root.'/docs/tree';
if (is_dir($treeDir)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($treeDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($it as $f) {
        $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
    }
}

const SITE_ROOT_FROM_TREE_PAGE = '../../../';

$treePage = <<<'HTML'
<!DOCTYPE html>
<html lang="en" data-root="%ROOT%">
<head>
    <meta charset="UTF-8">
    <title>%TITLE%</title>
    <link rel="icon" type="image/x-icon" href="%ROOT%favicon.ico">
    <link rel="stylesheet" href="%ROOT%assets/css/app.css">
    <link rel="stylesheet" href="%ROOT%assets/css/talent-tree.css">
    <script type="importmap">{"imports":{"vue":"%ROOT%assets/lib/vue.esm-browser.js"}}</script>
    <script type="module" src="%ROOT%assets/js/tree-page.js"></script>
</head>
<body>
    <div class="tt-picker">
        <a class="tt-picker-home" href="%ROOT%">&larr; Builds</a>
        <form id="tt-picker-form">
            <select name="build"></select>
        </form>
        <div class="tt-class-picker" id="tt-class-picker"></div>
        <button id="tt-settings-gear" class="tt-settings-gear" type="button" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        </button>
    </div>
    <div id="talent-tree-app" data-build="%BUILD%" data-class="%CLASS%"></div>
    <div id="tt-settings-overlay" class="tt-settings-overlay" hidden>
        <div class="tt-settings-modal">
            <h2>Settings</h2>
            <label class="tt-settings-row">
                <input id="tt-setting-sort-alpha" type="checkbox">
                Sort tabs alphabetically
            </label>
            <label class="tt-settings-row">
                <input id="tt-setting-show-id" type="checkbox">
                Show talent ID in tooltip
            </label>
            <button id="tt-settings-close" class="tt-settings-close" type="button">Close</button>
        </div>
    </div>
</body>
</html>
HTML;

$redirectPage = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>%MEMBER% - same as %REP%</title>
    <script>location.replace('%TARGET%' + location.search + location.hash);</script>
    <noscript><meta http-equiv="refresh" content="0; url=%TARGET%"></noscript>
</head>
<body>
    <p>Build %MEMBER% has the same talents as <a href="%TARGET%">%REP%</a>.</p>
</body>
</html>
HTML;

$write = static function (string $path, string $content): void {
    if (!is_dir(dirname($path))) {
        mkdir(dirname($path), 0775, true);
    }
    file_put_contents($path, $content);
};

$pages = $redirects = 0;
foreach ($index['builds'] as $build) {
    $rep = $safe($build['label']);
    foreach (array_keys($build['classes']) as $slug) {
        $safe($slug);
        $title = $classNames[$slug].' - '.$build['label'].' - WoW Alpha and Vanilla Talents Calculator';
        $write("$treeDir/$rep/$slug/index.html", strtr($treePage, [
            '%ROOT%' => SITE_ROOT_FROM_TREE_PAGE,
            '%TITLE%' => $h($title),
            '%BUILD%' => $h($build['label']),
            '%CLASS%' => $h($slug),
        ]));
        ++$pages;

        foreach ($build['members'] as $member) {
            $safe($member);
            $write("$treeDir/$member/$slug/index.html", strtr($redirectPage, [
                '%MEMBER%' => $h($member),
                '%REP%' => $h($rep),
                '%TARGET%' => $h("../../$rep/$slug/"),
            ]));
            ++$redirects;
        }
    }
}

echo "tree pages: $pages, redirect stubs: $redirects\n";
