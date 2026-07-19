import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = "artifacts/peps-anonymous";
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  check(existsSync(absolutePath), `${relativePath}: file is missing`);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function checkImport(source, relativePath) {
  check(
    /import\s+\{\s*SaltPepsMark\s*\}\s+from\s+["']@\/components\/SaltPepsMark["'];/.test(
      source,
    ),
    `${relativePath}: import SaltPepsMark from @/components/SaltPepsMark`,
  );
}

function checkMark(source, relativePath, size, detail) {
  check(
    new RegExp(
      `<SaltPepsMark(?=[\\s\\S]*?size=\\{${size}\\})(?=[\\s\\S]*?variant=["']reverse["'])${
        detail ? `(?=[\\s\\S]*?detail=["']${detail}["'])` : ""
      }[\\s\\S]*?\\/>`,
    ).test(source),
    `${relativePath}: render a ${size}px reverse SaltPepsMark${detail ? ` with ${detail} detail` : ""}`,
  );
}

const componentPath = `${appRoot}/src/components/SaltPepsMark.tsx`;
const component = read(componentPath);
const fullPaths = [
  "M 49 44 L 43 51 L 36 56 L 28 57 L 21 53 L 19 47 L 23 41 L 31 35 L 40 29 L 45 23 L 46 16 L 41 10 L 32 7 L 23 9 L 18 15 L 18 22 L 23 28 L 43 50 L 49 56",
  "M 43.8 21.4 55.5 13.5 M 45.7 24 57.2 16.2 M 23.2 40.6 8.4 44.8 M 24.1 43.4 9.2 47.6",
  "M57 10.75 60.75 14.5 57 18.25 53.25 14.5Z",
  "M7 43.25 10.75 47 7 50.75 3.25 47Z",
];
const smallPaths = [
  fullPaths[0],
  "M 44.5 22.6 56.5 14.5 M 23.5 42 7.5 46.5",
  "M57 9.75 61.75 14.5 57 19.25 52.25 14.5Z",
  "M6.5 41.5 11.5 46.5 6.5 51.5 1.5 46.5Z",
];

for (const path of new Set([...fullPaths, ...smallPaths])) {
  check(
    component.includes(path),
    `${componentPath}: hoist canonical path ${path}`,
  );
}
for (const width of ["7.25", "2.25", "8", "3.25"]) {
  check(
    component.includes(width),
    `${componentPath}: preserve canonical stroke width ${width}`,
  );
}
check(
  /SVGProps<SVGSVGElement>/.test(component),
  `${componentPath}: extend normal SVG props`,
);
check(
  /size\?:\s*number\s*\|\s*string/.test(component),
  `${componentPath}: expose size?: number | string`,
);
check(
  /variant\?:\s*["']primary["']\s*\|\s*["']reverse["']\s*\|\s*["']mono["']/.test(
    component,
  ),
  `${componentPath}: expose the primary, reverse, and mono variants`,
);
check(
  /detail\?:\s*["']auto["']\s*\|\s*["']full["']\s*\|\s*["']small["']/.test(
    component,
  ),
  `${componentPath}: expose the auto, full, and small detail modes`,
);
check(
  /title\?:\s*string/.test(component),
  `${componentPath}: expose an optional title`,
);
check(/size\s*=\s*32/.test(component), `${componentPath}: default size to 32`);
check(
  /variant\s*=\s*["']primary["']/.test(component),
  `${componentPath}: default variant to primary`,
);
check(
  /detail\s*=\s*["']auto["']/.test(component),
  `${componentPath}: default detail to auto`,
);
check(
  /typeof size\s*===\s*["']number["'][\s\S]*?size\s*<\s*24/.test(component),
  `${componentPath}: auto-select small detail below 24 numeric pixels`,
);
check(
  component.includes("#1B3A7A") && component.includes("#2D6BCC"),
  `${componentPath}: use the primary navy and blue colors`,
);
check(
  component.includes("#FFFFFF"),
  `${componentPath}: use white for the reverse variant`,
);
check(
  (component.match(/#0F1F38/g) ?? []).length >= 2,
  `${componentPath}: use mono navy for both mono channels`,
);
check(
  /\buseId\s*\(\s*\)/.test(component),
  `${componentPath}: use React useId for the optional title`,
);
check(
  /<title\s+id=\{titleId\}>\{title\}<\/title>/.test(component),
  `${componentPath}: bind the optional title to the generated id`,
);
check(
  /role=\{title\s*\?\s*["']img["']\s*:\s*undefined\}/.test(component),
  `${componentPath}: expose role=img only when titled`,
);
check(
  /aria-labelledby=\{title\s*\?\s*titleId\s*:\s*undefined\}/.test(component),
  `${componentPath}: label a titled icon by its unique title id`,
);
check(
  /aria-hidden=\{title\s*\?\s*undefined\s*:\s*true\}/.test(component),
  `${componentPath}: hide untitled icons from assistive technology`,
);
check(
  !/<text\b/i.test(component),
  `${componentPath}: do not use SVG text elements`,
);
check(
  !/https?:\/\//i.test(component),
  `${componentPath}: do not use network URLs`,
);

const pageLayoutPath = `${appRoot}/src/components/PageLayout.tsx`;
const pageLayout = read(pageLayoutPath);
checkImport(pageLayout, pageLayoutPath);
const brandMark =
  pageLayout.match(/function BrandMark[\s\S]*?\n}\n\n\/\//)?.[0] ?? "";
check(
  /const dim = size === ["']sm["'] \? 28 : 36/.test(brandMark),
  `${pageLayoutPath}: retain the 28px and 36px BrandMark tiles`,
);
check(
  /borderRadius:\s*["']8px["']/.test(brandMark) &&
    /background:\s*BRAND_NAVY/.test(brandMark),
  `${pageLayoutPath}: retain the 8px BRAND_NAVY tile`,
);
check(
  /size=\{size === ["']sm["'] \? 23 : 30\}/.test(brandMark),
  `${pageLayoutPath}: render 23px and 30px responsive marks`,
);
check(
  /variant=["']reverse["']/.test(brandMark) &&
    /detail=\{size === ["']sm["'] \? ["']small["'] : ["']full["']\}/.test(
      brandMark,
    ),
  `${pageLayoutPath}: use reverse marks and small detail for sm`,
);
check(
  !/>\s*S(?:&amp;|&)P\s*</.test(brandMark),
  `${pageLayoutPath}: remove the font-dependent S&P placeholder`,
);

const dashboardPath = `${appRoot}/src/components/DashboardShell.tsx`;
const dashboard = read(dashboardPath);
checkImport(dashboard, dashboardPath);
checkMark(dashboard, dashboardPath, 30);
check(
  !/S&amp;P/.test(dashboard),
  `${dashboardPath}: remove the S&P rail placeholder`,
);
check(
  /src=\{dark\s*\?\s*["']\/brand\/salt-peps-logo-reverse\.svg["']\s*:\s*["']\/brand\/salt-peps-logo\.svg["']\}/.test(
    dashboard,
  ),
  `${dashboardPath}: choose the horizontal wordmark from the current theme`,
);
check(
  /alt=["']Salt & Peps["']/.test(dashboard),
  `${dashboardPath}: give the horizontal wordmark an exact alt label`,
);
check(
  /width=\{162\}/.test(dashboard) && /height=\{36\}/.test(dashboard),
  `${dashboardPath}: size the horizontal wordmark at 162x36`,
);
check(
  /maxWidth:\s*162/.test(dashboard) &&
    /objectFit:\s*["']contain["']/.test(dashboard),
  `${dashboardPath}: constrain and contain the horizontal wordmark`,
);
check(
  /className=["']flex items-center px-4["'][^>]*style=\{\{ height:\s*72 \}\}/.test(
    dashboard,
  ),
  `${dashboardPath}: retain the 72px expanded brand header`,
);

const bottomNavPath = `${appRoot}/src/components/HubBottomNav.tsx`;
const bottomNav = read(bottomNavPath);
checkImport(bottomNav, bottomNavPath);
checkMark(bottomNav, bottomNavPath, 20, "small");
check(
  !/S&amp;P/.test(bottomNav),
  `${bottomNavPath}: remove the center S&P placeholder`,
);
check(bottomNav.includes("TAP ME"), `${bottomNavPath}: retain TAP ME`);
check(
  /width:\s*44,\s*height:\s*44/.test(bottomNav),
  `${bottomNavPath}: retain the 44px center button`,
);
check(
  /transform:\s*open\s*\?\s*["']scale\(0\.85\)["']\s*:\s*["']scale\(1\)["']/.test(
    bottomNav,
  ),
  `${bottomNavPath}: retain the center-mark transform animation`,
);
check(
  /aria-label=\{open \? ["']Close menu["'] : ["']Open menu["']\}/.test(
    bottomNav,
  ),
  `${bottomNavPath}: retain the center button accessible label`,
);

const sidebarPath = `${appRoot}/src/pages/organiser-v2/DashboardSidebar.tsx`;
const sidebar = read(sidebarPath);
checkImport(sidebar, sidebarPath);
checkMark(sidebar, sidebarPath, 28);
check(
  !/<div className=["']ov2-brand-mark["'][\s\S]*?>\s*S&amp;P\s*<\/div>/.test(
    sidebar,
  ),
  `${sidebarPath}: remove only the organiser S&P placeholder`,
);
check(
  /<strong>Salt &amp; Peps<\/strong>/.test(sidebar),
  `${sidebarPath}: retain the organiser brand copy`,
);

const prototypePath = `${appRoot}/src/pages/PrototypeHome.tsx`;
const prototype = read(prototypePath);
checkImport(prototype, prototypePath);
checkMark(prototype, prototypePath, 22, "small");
check(
  !/<text\b/i.test(prototype),
  `${prototypePath}: remove the font-dependent SVG text mark`,
);
check(
  !/DM Serif Display/.test(prototype),
  `${prototypePath}: remove the logo font dependency`,
);
check(
  /width:\s*44,\s*height:\s*44/.test(prototype),
  `${prototypePath}: retain the 44px outer logo link`,
);
check(
  /width:\s*28,\s*height:\s*28/.test(prototype) &&
    /background:\s*["']#1B3A7A["']/.test(prototype),
  `${prototypePath}: retain the 28px navy inner tile`,
);

const receiverPath = `${appRoot}/src/pages/JanoshikReceiver.tsx`;
const receiver = read(receiverPath);
checkImport(receiver, receiverPath);
checkMark(receiver, receiverPath, 26);
check(
  !/>S<\/div>/.test(receiver),
  `${receiverPath}: remove the receiver S tile`,
);
check(
  /width:\s*32/.test(receiver) && /height:\s*32/.test(receiver),
  `${receiverPath}: keep a 32px receiver tile`,
);
check(
  /background:\s*["']#1B3A7A["']/.test(receiver),
  `${receiverPath}: use brand navy for the receiver tile`,
);

const explorerPath = `${appRoot}/public/peptide-explorer/index.html`;
const explorer = read(explorerPath);
check(!explorer.includes("🧂"), `${explorerPath}: remove the salt emoji`);
check(
  /<img\s+class=["']brand-mark["']\s+src=["']\.\.\/brand\/salt-peps-icon-reverse\.svg["']\s+width=["']18["']\s+height=["']18["']\s+alt=["']["']\s+aria-hidden=["']true["']\s*\/>/.test(
    explorer,
  ),
  `${explorerPath}: use the relative 18px reverse icon asset`,
);
check(
  /Salt<span class=["']amp["']>&amp;<\/span>Peps/.test(explorer),
  `${explorerPath}: preserve the explorer title text`,
);

const faviconPath = `${appRoot}/public/favicon.svg`;
const favicon = read(faviconPath);
check(
  /<svg\b[^>]*viewBox=["']0 0 180 180["']/.test(favicon),
  `${faviconPath}: use the 180x180 viewBox`,
);
check(
  /<rect\b[^>]*width=["']180["'][^>]*height=["']180["'][^>]*fill=["']#1B3164["']/.test(
    favicon,
  ),
  `${faviconPath}: use the deep navy 180px rounded-square background`,
);
for (const path of new Set(smallPaths)) {
  check(
    favicon.includes(path),
    `${faviconPath}: include canonical small path ${path}`,
  );
}
check(
  /transform=["']translate\(18 18\) scale\(2\.25\)["']/.test(favicon),
  `${faviconPath}: use the enlarged small-size favicon treatment`,
);
check(
  (favicon.match(/#FFFFFF/g) ?? []).length >= 4,
  `${faviconPath}: render the reverse icon in white`,
);
const faviconWithoutNamespace = favicon.replace(
  'xmlns="http://www.w3.org/2000/svg"',
  "",
);
check(
  !/<text\b|https?:\/\/|@import|<style\b|font-family|<image\b|<linearGradient\b|<filter\b/i.test(
    faviconWithoutNamespace,
  ),
  `${faviconPath}: contain no text, external URL, font import, image, gradient, or filter`,
);

const indexPath = `${appRoot}/index.html`;
const index = read(indexPath);
check(
  /<meta\s+name=["']theme-color["']\s+content=["']#1B3164["']\s*\/>/.test(
    index,
  ),
  `${indexPath}: set the deep navy theme color`,
);
check(
  /href=["']\/favicon\.svg["']/.test(index),
  `${indexPath}: keep the favicon URL stable`,
);
check(
  /rel=["']apple-touch-icon["'][^>]*href=["']\/brand\/salt-peps-social-180\.png["']/.test(
    index,
  ),
  `${indexPath}: use the generated 180px social tile as the Apple touch icon`,
);

if (failures.length > 0) {
  console.error(`FAIL (${failures.length} of ${checks} checks failed)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS (${checks} integration checks)`);
}
