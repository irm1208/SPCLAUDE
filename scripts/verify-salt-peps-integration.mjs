import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

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

function checkMark(source, relativePath, size) {
  check(
    new RegExp(
      `<SaltPepsMark(?=[\\s\\S]*?size=\\{${size}\\})[\\s\\S]*?\\/>`,
    ).test(source),
    `${relativePath}: render a ${size}px favicon-backed SaltPepsMark`,
  );
}

const componentPath = `${appRoot}/src/components/SaltPepsMark.tsx`;
const component = read(componentPath);
check(
  /ImgHTMLAttributes<HTMLImageElement>/.test(component),
  `${componentPath}: extend normal image props`,
);
check(
  /Omit<ImgHTMLAttributes<HTMLImageElement>,\s*["']src["']\s*\|\s*["']width["']\s*\|\s*["']height["']\s*>/.test(
    component,
  ),
  `${componentPath}: keep the favicon source and dimensions controlled`,
);
check(
  /size\?:\s*number\s*\|\s*string/.test(component),
  `${componentPath}: expose size?: number | string`,
);
check(
  /src=["']\/favicon\.svg["']/.test(component),
  `${componentPath}: render the approved favicon asset`,
);
check(
  /alt=\{resolvedAlt\}/.test(component) && /title=\{title\}/.test(component),
  `${componentPath}: preserve image title and alt semantics`,
);
check(/size\s*=\s*32/.test(component), `${componentPath}: default size to 32`);
check(
  /style=\{\{ display:\s*["']block["']/.test(component),
  `${componentPath}: keep the favicon image block-level`,
);
check(
  !/AMPERSAND_PATH|FULL_DETAIL_PATH|SMALL_DETAIL_PATH|SVGProps|useId|variant\??:|detail\??:|<svg\b/.test(
    component,
  ),
  `${componentPath}: remove the retired inline peptide mark implementation`,
);
check(
  /ariaHidden\s*\?\?\s*\(hasAccessibleName\s*\?\s*undefined\s*:\s*true\)/.test(
    component,
  ),
  `${componentPath}: hide nameless favicon marks by default`,
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
  !/variant=|detail=/.test(brandMark),
  `${pageLayoutPath}: use the shared favicon-backed mark without legacy variants`,
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
  /alt=["']Salt&Peps["']/.test(dashboard),
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
check(
  /import\s+\{\s*SaltPepsMark\s*\}\s+from\s+["']@\/components\/SaltPepsMark["'];/.test(
    bottomNav,
  ),
  `${bottomNavPath}: use the shared S&P favicon-backed mark`,
);
check(
  /<SaltPepsMark(?=[\s\S]*?size=\{26\})[\s\S]*?\/>/.test(
    bottomNav,
  ),
  `${bottomNavPath}: render the larger 26px S&P mark in the TAP ME button`,
);
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
  /@keyframes hbn-ring/.test(bottomNav) && /className=["']hbn-ring/.test(bottomNav),
  `${bottomNavPath}: retain the original animated outline ring`,
);
const centerButton =
  bottomNav.match(/<button[\s\S]*?aria-label=\{open \?[\s\S]*?<\/button>/)?.[0] ?? "";
check(
  /background:\s*["']#1B3164["']/.test(centerButton),
  `${bottomNavPath}: match the TAP ME button to the favicon background`,
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
checkMark(prototype, prototypePath, 22);
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
check(
  /<a[\s\S]*?aria-label=["']Salt & Peps home["'][\s\S]*?href=["']\/prototypehome["']/.test(
    prototype,
  ),
  `${prototypePath}: give the logo-only home link an accessible name`,
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
  /<img\s+class=["']brand-mark["']\s+src=["']\.\.\/favicon\.svg["']\s+width=["']18["']\s+height=["']18["']\s+alt=["']["']\s+aria-hidden=["']true["']\s*\/>/.test(
    explorer,
  ),
  `${explorerPath}: use the relative 18px favicon asset`,
);
check(
  /<meta\s+name=["']theme-color["']\s+content=["']#1B3164["']\s*\/>/.test(
    explorer,
  ) && /rel=["']icon["'][^>]*href=["']\.\.\/favicon\.svg["']/.test(explorer),
  `${explorerPath}: use the favicon in browser chrome as well as the titlebar`,
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
  `${faviconPath}: use the Deep Navy 180px rounded-square background`,
);
for (const path of ["M39.14 137.13", "M109.32 137.30", "M182.38 136"]) {
  check(
    favicon.includes(path),
    `${faviconPath}: include the approved type-derived glyph path fragment ${path}`,
  );
}
check(
  /transform=["']translate\(9 24\) scale\(\.70\)["']/.test(favicon),
  `${faviconPath}: use the centered 01 favicon fit transform`,
);
check(
  (favicon.match(/fill=["']#FFFFFF["']/g) ?? []).length >= 3,
  `${faviconPath}: render all three monogram glyphs in white`,
);
check(
  !favicon.includes("M 49 44 L 43 51 L 36 56"),
  `${faviconPath}: remove the previous peptide-bond path`,
);
for (const size of [16, 32]) {
  try {
    const raster = PNG.sync.read(
      new Resvg(favicon, {
        fitTo: { mode: "width", value: size },
        background: "#1B3164",
      })
        .render()
        .asPng(),
    );
    let whitePixels = 0;
    let minX = size;
    let minY = size;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const red = raster.data[offset];
        const green = raster.data[offset + 1];
        const blue = raster.data[offset + 2];
        const alpha = raster.data[offset + 3];
        if (red > 240 && green > 240 && blue > 240 && alpha > 0) {
          whitePixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    check(
      whitePixels > 0 && minX >= 1 && minY >= 1 && maxX <= size - 2 && maxY <= size - 2,
      `${faviconPath}: keep white glyphs inside the ${size}px tile (bounds ${minX},${minY}..${maxX},${maxY})`,
    );
  } catch (error) {
    check(
      false,
      `${faviconPath}: render the ${size}px glyph bounds (${error instanceof Error ? error.message : "unknown error"})`,
    );
  }
}
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
  /rel=["']apple-touch-icon["'][^>]*href=["']\/brand\/salt-peps-apple-touch-180\.png["']/.test(
    index,
  ),
  `${indexPath}: use the generated opaque 180px Apple touch icon`,
);

const appAbsoluteRoot = resolve(root, appRoot);
const appNodeModules = resolve(appAbsoluteRoot, "node_modules");
const [{ createElement }, { renderToStaticMarkup }, { createServer }] =
  await Promise.all([
    import(pathToFileURL(resolve(appNodeModules, "react/index.js"))),
    import(pathToFileURL(resolve(appNodeModules, "react-dom/server.node.js"))),
    import(pathToFileURL(resolve(appNodeModules, "vite/dist/node/index.js"))),
  ]);
const viteServer = await createServer({
  root: appAbsoluteRoot,
  configFile: false,
  esbuild: { jsx: "automatic" },
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { SaltPepsMark } = await viteServer.ssrLoadModule(
    "/src/components/SaltPepsMark.tsx",
  );
  const renderMark = (props) =>
    renderToStaticMarkup(createElement(SaltPepsMark, props));

  const decorativeMark = renderMark({});
  check(
    /src="\/favicon\.svg"/.test(decorativeMark) &&
      /alt=""/.test(decorativeMark) &&
      /aria-hidden="true"/.test(decorativeMark) &&
      !/\srole=/.test(decorativeMark) &&
      !/aria-label(?:ledby)?=/.test(decorativeMark),
    `${componentPath}: render and hide a nameless favicon mark by default`,
  );

  const titledMark = renderMark({ title: "Salt & Peps peptide mark" });
  check(
    /alt="Salt &amp; Peps peptide mark"/.test(titledMark) &&
      /title="Salt &amp; Peps peptide mark"/.test(titledMark) &&
      /\srole="img"/.test(titledMark) &&
      !/aria-hidden=/.test(titledMark),
    `${componentPath}: expose an optional image title as its accessible name`,
  );

  const ariaLabelMark = renderMark({ "aria-label": "Salt & Peps" });
  check(
    /aria-label="Salt &amp; Peps"/.test(ariaLabelMark) &&
      /\srole="img"/.test(ariaLabelMark) &&
      !/aria-hidden=/.test(ariaLabelMark),
    `${componentPath}: respect aria-label as an accessible name`,
  );

  const ariaLabelWithTitleMark = renderMark({
    "aria-label": "Caller-provided brand label",
    title: "Fallback SVG title",
  });
  check(
    /aria-label="Caller-provided brand label"/.test(ariaLabelWithTitleMark) &&
      !/aria-labelledby=/.test(ariaLabelWithTitleMark),
    `${componentPath}: let a caller aria-label take precedence over the title fallback`,
  );

  const labelledByMark = renderMark({ "aria-labelledby": "brand-name" });
  check(
    /aria-labelledby="brand-name"/.test(labelledByMark) &&
      /\srole="img"/.test(labelledByMark) &&
      !/aria-hidden=/.test(labelledByMark),
    `${componentPath}: respect a caller-provided aria-labelledby`,
  );

  const explicitlyVisibleMark = renderMark({ "aria-hidden": false });
  check(
    /aria-hidden="false"/.test(explicitlyVisibleMark),
    `${componentPath}: preserve an explicit aria-hidden=false`,
  );

  const explicitlyHiddenMark = renderMark({
    title: "Hidden brand mark",
    "aria-hidden": true,
  });
  check(
    /aria-hidden="true"/.test(explicitlyHiddenMark),
    `${componentPath}: preserve an explicit aria-hidden=true`,
  );

  const callerRoleMark = renderMark({
    "aria-label": "Salt & Peps",
    role: "presentation",
  });
  check(
    /\srole="presentation"/.test(callerRoleMark),
    `${componentPath}: preserve a caller-provided role`,
  );
} catch (error) {
  check(false, `${componentPath}: SSR accessibility checks failed: ${error}`);
} finally {
  await viteServer.close();
}

if (failures.length > 0) {
  console.error(`FAIL (${failures.length} of ${checks} checks failed)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS (${checks} integration checks)`);
}
