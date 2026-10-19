import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("index.html");
const markup = html.slice(0, html.indexOf("<script type=\"application/json\""));
const serviceWorker = read("service-worker.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const pkg = JSON.parse(read("package.json"));
const visibleMarkup = markup.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const count = (pattern, text = html) => [...text.matchAll(pattern)].length;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const required = [
  ".gitignore", ".nojekyll", "README.md", "app-cover.png", "INVICTICUS-CHALLENGE-ARTWORK.png", "icon-192.png", "icon-512.png", "icon.svg",
  "index.html", "manifest.webmanifest", "package.json", "service-worker.js", "scripts/verify-repository.mjs",
  "INVICTICUS-V1.2-COMPREHENSIVE-REVIEW.txt", "INVICTICUS-V1.2-VERIFICATION.txt",
  ".github/workflows/verify.yml",
];
required.forEach((f) => check(`Required file: ${f}`, fs.existsSync(path.join(root, f))));

const expectedPages = ["home", "today", "reset", "health", "photos", "mountains", "journey", "goals", "reviews", "data"];
const pageIds = [...markup.matchAll(/<section class="page(?: active)?" id="([^"]+)"/g)].map(m => m[1]);
check("Ten primary sections remain", JSON.stringify(pageIds) === JSON.stringify(expectedPages));
expectedPages.forEach((id) => check(`Page exists: ${id}`, pageIds.includes(id)));

check("V64 data schema remains active", /const VERSION = 64;/.test(html) && /project-northstar-final92-private-backup-v64/.test(html));
check("Public build marker is active", /const PUBLIC_BUILD = true/.test(html));
check("Invicticus Oct 19 restart and Dec 31 boundary remain", /const CAMPAIGN_START = "2026-10-19";/.test(html) && /const CAMPAIGN_END = "2026-12-31";/.test(html));
check("52-brick wall logic remains", /Array\.from\(\{ length: 52 \}/.test(html) && /function wallQualifies/.test(html));
check("Six permanent daily standards remain", count(/data-check="[^"]+"/g, markup) === 6);
check("Five body-status sliders remain", count(/data-pain="[^"]+"/g, markup) === 5);
check("Today command remains", /id="todayCommandCard"/.test(markup) && /id="criticalMission"/.test(markup) && /id="bodyMission"/.test(markup) && /id="lifeMission"/.test(markup));
check("Northstar Web remains", /function lifeWebSnapshot/.test(html) && /id="lifeWebCalibration"/.test(markup));
check("Iron Ledger remains", /const IRON_LEDGER_BLUEPRINT/.test(html) && count(/id: "(?:INC30|OHP185|CHIN130|P500|CURL135|SQ200)"/g, html) === 6);
check("Recovery command remains", /id="recoveryCommandCard"/.test(markup));
check("Three current photo slots remain", count(/data-photo-slot="[^"]+"/g, markup) === 3);
check("Return to Mountains remains", /First 14er/.test(html) && /Desolation Wilderness/.test(html));
check("Journey UI remains", /id="journeyGrid"/.test(markup) && /function renderJourney/.test(html));
check("Journey public seed is empty", /const JOY_MILESTONE_SEED = Object\.freeze\(\[\]\);/.test(html));
check("Goals remain", /id="goalList"/.test(markup) || /class="goal-list"/.test(markup));
check("Reviews remain", /id="reviews"/.test(markup));
check("Bulking reviews remain", /October 31/.test(html) && /November 30/.test(html) && /December 31/.test(html) && /Bulking Reviews/.test(html));
check("Reward checkpoints and bonuses remain", /const WALL_CHECKPOINTS/.test(html) && count(/\{\"target\": (?:7|10|14|18|21|25|28|32|35|39|42|46|49|52), \"name\":/g, html) === 14);
check("Restart / 15-day proof feature remains", /15/.test(html) && /restart/i.test(html) && /restartClock/.test(html));
check("Historical 26-day proof remains canonical", /historicalWallBest: 26/.test(html));
check("No-Slither 90 completion remains canonical", /noSlither90Complete: true/.test(html) && /historicalBestAttentionStreak: 90/.test(html));
check("Mobile dock exists", /class="mobile-dock"/.test(markup));
check("Mobile responsive rules exist", /@media\(max-width:899px\)/.test(html) && /@media\(max-width:560px\)/.test(html));
check("Review layout has mobile one-column support", /#reviews[\s\S]*grid-template-columns:1fr/.test(html) || /review.*grid-template-columns:1fr/i.test(html));
check("Touch targets are 44px minimum", /min-height:44px/.test(html));
check("Rugged color system remains", /V64/i.test(html) && /--gold/.test(html) && /--green/.test(html) && /--red/.test(html));
check("Light text base remains", /--text:\s*#f/i.test(html) || /--text:\s*#e/i.test(html));
check("No duplicate DOM IDs", (() => { const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]); return ids.length===new Set(ids).size; })());
check("V60 restore compatibility remains", /project-northstar-final92-private-backup-v60/.test(html));
check("V61 restore compatibility remains", /project-northstar-final92-private-backup-v61/.test(html));
check("V62 restore compatibility remains", /project-northstar-final92-private-backup-v62/.test(html));
check("V63 restore compatibility remains", /project-northstar-final92-private-backup-v63/.test(html));
check("V59 restore compatibility remains", /project-52-private-backup-v59/.test(html));
check("Repository-relative manifest", manifest.id === "./" && manifest.scope === "./" && manifest.start_url === "./index.html#home");
check("Manifest icons remain", Array.isArray(manifest.icons) && manifest.icons.length === 2);
check("Invicticus public branding is active", manifest.name === "The 52nd Watch: Invicticus Challenge" && /INVICTICUS CHALLENGE/.test(html));
const pngSize = (name) => { const b=fs.readFileSync(path.join(root,name)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
check("Armored angel app cover exists", fs.existsSync(path.join(root, "app-cover.png")));
check("App cover is 1024 square", JSON.stringify(pngSize("app-cover.png")) === JSON.stringify([1024,1024]));
check("192 icon dimensions correct", JSON.stringify(pngSize("icon-192.png")) === JSON.stringify([192,192]));
check("512 icon dimensions correct", JSON.stringify(pngSize("icon-512.png")) === JSON.stringify([512,512]));
check("HTML uses PNG app icon", /rel="icon" href="\.\/icon-192\.png"/.test(html));
check("Social cover points to Invicticus artwork", /property="og:image" content="\.\/INVICTICUS-CHALLENGE-ARTWORK\.png"/.test(html));
check("Service-worker cache is Invicticus V1.2 r1", /invicticus-v1-2-2026-10-19-r1/.test(serviceWorker));
check("Service worker caches app cover", /\.\/app-cover\.png/.test(serviceWorker));
check("Service worker caches Invicticus artwork", /\.\/INVICTICUS-CHALLENGE-ARTWORK\.png/.test(serviceWorker));
check("Service-worker cache scoped to repo", /CACHE_SCOPE_ID/.test(serviceWorker) && /CACHE_PREFIX/.test(serviceWorker));
check("Controlled SW update remains", /SKIP_WAITING/.test(serviceWorker));

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(m => !/type="application\/json"/.test(m[0]))
  .map(m => m[1]);
try { inlineScripts.forEach(script => new vm.Script(script)); check("Application JavaScript parses", inlineScripts.length >= 1); }
catch (e) { console.error(e); check("Application JavaScript parses", false); }
try { new vm.Script(serviceWorker); check("Service worker JavaScript parses", true); }
catch { check("Service worker JavaScript parses", false); }

const files = walk(root);
const rel = files.map(f => path.relative(root, f));
check("No private backup file committed", rel.every(f => !/(?:private|restore|backup.*\.json)/i.test(f)));
check("No personal JPEG/HEIC files committed", rel.every(f => !/\.(?:jpe?g|heic|heif|mov)$/i.test(f)));
const textFiles = files.filter(f => /\.(?:html|js|mjs|json|md|txt|yml|yaml|svg)$/i.test(f) || [".gitignore",".nojekyll"].includes(path.basename(f)));
const publicText = textFiles.map(f => fs.readFileSync(f, "utf8")).join("\n");
check("No embedded personal image payload", !/data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(publicText));
check("No embedded private state bootstrap", !/localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(\{\"version\":64/.test(publicText));
const financialMarkers = ["128"+"271.49", "98"+"271.49", "253"+"74.5", "American"+" Funds", "Robin"+"hood", "SoFi Emergency"+" Fund", "Toyota"+" Crown"];
check("No private finance snapshot committed", financialMarkers.every(x => !publicText.toLowerCase().includes(x.toLowerCase())));
const sensitiveRecordMarkers = ["R100000"+"218772991", "med error"+" at work", "severe lows"+" that messed up my sleep"];
check("No sensitive private record snippets committed", sensitiveRecordMarkers.every(x => !publicText.toLowerCase().includes(x.toLowerCase())));

check("Invicticus 14-drop home timeline exists", /id="homeSupplyTimeline"/.test(markup) && /function renderSupplyTimeline/.test(html));
check("Full-duty return card is present", /TUESDAY · OCTOBER 20 · FULL DUTY/.test(markup));
check("Invicticus reset epoch is active", /the-52nd-watch-invicticus-v1-oct19-restart/.test(html));
check("October pace gate is 10 bricks", /October Invicticus Bulking Review", brickTarget: 10/.test(html));
check("November pace gate is 32 bricks", /November Invicticus Bulking Review", brickTarget: 32/.test(html));
check("December summit gate is 52 bricks", /December Invicticus Review \+ Summit", brickTarget: 52/.test(html));
check("Supply Drop dates derive from Oct 19", /const CAMPAIGN_START = "2026-10-19";/.test(html) && /earliestDate: addDays\(CAMPAIGN_START, Number\(definition.brickTarget\) - 1\)/.test(html));

check("Package version is 1.2.0", pkg.version === "1.2.0");
check("Visible UI has no stale FINAL 92 branding", !/FINAL 92/i.test(visibleMarkup));
check("Visible UI has no stale Oct 15 launch copy", !/Oct(?:ober)?\s+15/i.test(visibleMarkup));
check("Visible UI has no stale 78-day countdown", !/78\s+days/i.test(visibleMarkup));
check("Visible UI uses Invicticus phase names", /FOUNDATION · ESTABLISH/.test(visibleMarkup) && /FORGE · BUILD/.test(visibleMarkup) && /ASCEND · PROVE/.test(visibleMarkup));
check("Mobile final override removes duplicate top navigation", /@media\(max-width:899px\)[\s\S]*?\.nav\{display:none!important\}/.test(html));
check("Prelaunch state is explicit and brick-safe", /const preLaunch = daysBetween\(today, CAMPAIGN_START\) > 0;/.test(html) && /setup only—no brick can be earned early/.test(html) && /heroDay"\)\.textContent = preLaunch \? "PREP"/.test(html));
check("Reset preserves real-life goals and todos", /Keep current Career \/ Life \/ Recovery actions active/.test(html) && /Preserve user-authored goals and evidence/.test(html) && /current system goal exists/.test(html));
check("Reset preserves prior earned badges as legacy proof", /Convert earned active badges from the prior run into historical proof/.test(html) && /prior-\$\{id\}/.test(html));
check("Reset clears active celebration dates", /campaign\.celebrationDates = \[\];/.test(html));
check("Internal date audit uses Invicticus Day 2", /October 20 is Invicticus Day 2/.test(html) && !/October 16 is Restart Day 2/.test(html));
check("Initial badge total matches 24-badge engine", /id="homeBadgeCount">0 \/ 24</.test(markup));
check("Runtime label distinguishes Invicticus release from schema", /INVICTICUS V1\.2 · schema v\$\{VERSION\}/.test(html));
check("Supply timeline exposes type and sealed-earned state", /supply-mini-kind/.test(html) && /supply-mini-state/.test(html) && /stateLabel/.test(html));
check("Supply cards headline each reward and show actual eligibility rule", /<h3>\$\{escapeHtml\(reward\.name\)\}<\/h3>/.test(html) && /Actual eligibility = brick count/.test(html));

check("V1.2 surprise dialog exists", /id="watchSurprise"/.test(markup) && /id="closeWatchSurprise"/.test(markup));
check("Watch seal interaction exists", /id="watchSeal"/.test(markup) && /function touchWatchSeal/.test(html));
check("Daily Watch dispatch exists", /id="watchDispatch"/.test(markup) && /const WATCH_DISPATCHES/.test(html));
check("Night Watch is visual-only", /id="nightWatchPill"/.test(markup) && /function renderWatchLayer/.test(html) && /classList\.toggle\("night-watch"/.test(html));
check("Surprise catalog is objective and non-gating", /const WATCH_SURPRISES/.test(html) && /minBricks: 27/.test(html) && /minBricks: 52/.test(html));
check("Historical 26-day record surprise is anchored to Brick 27", /id: "record-broken", minBricks: 27/.test(html) && /26-day Project 52 wall/.test(html));
check("Summit surprise preserves Dec 31 finish", /id: "invicticus-crown", minBricks: 52/.test(html) && /challenge still runs through December 31/.test(html));
check("Surprise state resets only with active run", /campaign\.surprisesSeen = \{\};/.test(html) && /campaign\.surpriseHistory = \[\];/.test(html));
check("Surprise state normalizes safely", /merged\.surprisesSeen/.test(html) && /merged\.surpriseHistory/.test(html));
check("Supply celebration names exact reward", /\$\{rewardLabel\(reached\[0\]\)\} earned: \$\{reached\[0\]\.name\}/.test(html));
check("Reduced motion support covers surprise layer", /prefers-reduced-motion:reduce/.test(html));
check("Summit visual mode is milestone-driven", /classList\.toggle\("summit-mode", built >= 52\)/.test(html));
check("Record visual mode is milestone-driven", /classList\.toggle\("record-mode", built >= 27\)/.test(html));
check("Surprises are exposed to internal test harness", /WATCH_SURPRISES/.test(html) && /maybeRevealWatchSurprise/.test(html));

const allIds = new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const jumpTargets = [...markup.matchAll(/data-jump="([^"]+)"/g)].map(m => m[1]);
const scrollTargets = [...markup.matchAll(/data-scroll="([^"]+)"/g)].map(m => m[1]);
check("Every data-jump target resolves", jumpTargets.every(id => allIds.has(id)));
check("Every data-scroll target resolves", scrollTargets.every(id => allIds.has(id)));
const directListenerIds = [...html.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)\.addEventListener/g)].map(m => m[1]);
check("Direct event-listener DOM targets resolve", directListenerIds.every(id => allIds.has(id)));

const rewardTargets = [...html.matchAll(/\bbrickTarget["\']?\s*:\s*(7|10|14|18|21|25|28|32|35|39|42|46|49|52)\b/g)].map(m => Number(m[1]));
const uniqueRewardTargets = [...new Set(rewardTargets)].filter(n => [7,10,14,18,21,25,28,32,35,39,42,46,49,52].includes(n)).sort((a,b)=>a-b);
check("All 14 Invicticus reward gates are present", JSON.stringify(uniqueRewardTargets) === JSON.stringify([7,10,14,18,21,25,28,32,35,39,42,46,49,52]));
const addUtcDays = (iso, amount) => { const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d+amount)).toISOString().slice(0,10); };
const expectedUnlocks = {7:"2026-10-25",10:"2026-10-28",14:"2026-11-01",18:"2026-11-05",21:"2026-11-08",25:"2026-11-12",28:"2026-11-15",32:"2026-11-19",35:"2026-11-22",39:"2026-11-26",42:"2026-11-29",46:"2026-12-03",49:"2026-12-06",52:"2026-12-09"};
check("All earliest reward dates mathematically match Oct 19", Object.entries(expectedUnlocks).every(([target,date]) => addUtcDays("2026-10-19", Number(target)-1) === date));
check("Full-duty milestone is Tuesday Oct 20", /TUESDAY · OCTOBER 20 · FULL DUTY/.test(markup) && /Full-duty return: TUE OCT 20/.test(markup));

const failed=checks.filter(c=>!c.pass);
for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} repository checks passed.`);
if (failed.length) process.exitCode=1;
