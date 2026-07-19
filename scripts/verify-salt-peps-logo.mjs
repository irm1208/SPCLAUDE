#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { optimize } from "svgo";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brandDirectory = resolve(
  repositoryRoot,
  "artifacts/peps-anonymous/public/brand",
);

const assetContracts = [
  ["salt-peps-logo.svg", "0 0 360 80"],
  ["salt-peps-logo-reverse.svg", "0 0 360 80"],
  ["salt-peps-logo-mono.svg", "0 0 360 80"],
  ["salt-peps-icon.svg", "0 0 64 64"],
  ["salt-peps-icon-reverse.svg", "0 0 64 64"],
  ["salt-peps-icon-reverse-small.svg", "0 0 64 64"],
  ["salt-peps-icon-mono.svg", "0 0 64 64"],
  ["salt-peps-icon-small.svg", "0 0 64 64"],
  ["salt-peps-social.svg", "0 0 180 180"],
  ["salt-peps-logo-proof.svg", "0 0 1200 900"],
];

const expectedColorsByFile = new Map([
  ["salt-peps-logo.svg", ["#0F1F38", "#1B3A7A", "#2D6BCC"]],
  ["salt-peps-logo-reverse.svg", ["#FFFFFF"]],
  ["salt-peps-logo-mono.svg", ["#0F1F38"]],
  ["salt-peps-icon.svg", ["#1B3A7A", "#2D6BCC"]],
  ["salt-peps-icon-reverse.svg", ["#FFFFFF"]],
  ["salt-peps-icon-reverse-small.svg", ["#FFFFFF"]],
  ["salt-peps-icon-mono.svg", ["#0F1F38"]],
  ["salt-peps-icon-small.svg", ["#1B3A7A", "#2D6BCC"]],
  ["salt-peps-social.svg", ["#1B3164", "#FFFFFF"]],
  [
    "salt-peps-logo-proof.svg",
    [
      "#0F1F38",
      "#1B3164",
      "#1B3A7A",
      "#2D6BCC",
      "#D0DAE4",
      "#F8FAFC",
      "#FFFFFF",
    ],
  ],
]);

const allowedElements = new Set(["svg", "title", "desc", "g", "path"]);
const allowedAttributesByElement = new Map([
  ["svg", new Set(["xmlns", "aria-label", "role", "viewBox"])],
  ["title", new Set()],
  ["desc", new Set()],
  ["g", new Set(["transform"])],
  [
    "path",
    new Set([
      "d",
      "fill",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
    ]),
  ],
]);
const allowedChildrenByElement = new Map([
  ["svg", new Set(["title", "desc", "g", "path"])],
  ["title", new Set()],
  ["desc", new Set()],
  ["g", new Set(["g", "path"])],
  ["path", new Set()],
]);

const exactHexColorPattern = /^#[0-9A-F]{6}$/;
const numberPatternSource = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const exactNumberPattern = new RegExp(`^${numberPatternSource}$`);
const transformArgumentPattern = new RegExp(
  `^\\s*(${numberPatternSource})(?:(?:\\s*,\\s*|\\s+)(${numberPatternSource}))?\\s*$`,
);
const resourceReferencePattern =
  /(?:\b(?:data|https?|file|ftp|javascript):|url\s*\(|^\s*\/\/)/i;

function displayPath(filePath) {
  return relative(repositoryRoot, filePath).split("\\").join("/");
}

function addFailure(failures, message) {
  if (!failures.includes(message)) failures.push(message);
}

function parseXmlAst(source, failures) {
  if (/<!DOCTYPE\b/i.test(source)) {
    addFailure(failures, "must not contain a document type declaration");
    return null;
  }

  let document;

  try {
    optimize(source, {
      multipass: false,
      plugins: [
        {
          name: "capture-salt-peps-contract-ast",
          fn(root) {
            document = root;
            return null;
          },
        },
      ],
    });
  } catch (error) {
    const reason = String(error?.reason ?? error?.message ?? "parse error")
      .replace(/\s+/g, " ")
      .trim();
    addFailure(failures, `is not well-formed XML (${reason})`);
    return null;
  }

  if (!document) {
    addFailure(
      failures,
      "is not well-formed XML (parser returned no document)",
    );
    return null;
  }

  return document;
}

function isSupportedTransform(value) {
  const functions = [];
  const functionPattern = /(translate|scale)\(([^()]*)\)/y;
  let cursor = 0;

  while (cursor < value.length) {
    const whitespace = value.slice(cursor).match(/^\s*/)[0];
    if (functions.length > 0 && whitespace.length === 0) return false;
    cursor += whitespace.length;
    if (cursor === value.length) break;

    functionPattern.lastIndex = cursor;
    const functionMatch = functionPattern.exec(value);
    if (!functionMatch) return false;

    const argumentMatch = functionMatch[2].match(transformArgumentPattern);
    if (!argumentMatch) return false;

    const args = argumentMatch
      .slice(1)
      .filter((argument) => argument !== undefined)
      .map(Number);
    if (args.some((argument) => !Number.isFinite(argument))) return false;
    if (
      functionMatch[1] === "scale" &&
      args.some((argument) => argument <= 0)
    ) {
      return false;
    }

    functions.push(functionMatch[1]);
    cursor = functionPattern.lastIndex;
  }

  if (functions.length === 1) return true;
  return (
    functions.length === 2 &&
    functions[0] === "translate" &&
    functions[1] === "scale"
  );
}

function collectText(node) {
  return (node.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => child.value)
    .join("");
}

function inspectDocument(document, failures) {
  const elements = [];
  const pathEntries = [];
  const topLevelElements = document.children.filter(
    (child) => child.type === "element",
  );

  if (topLevelElements.length !== 1) {
    addFailure(failures, "must contain exactly one top-level <svg> element");
  }

  const root = topLevelElements[0] ?? null;
  if (root && root.name !== "svg") {
    addFailure(failures, `top-level root must be <svg>, found <${root.name}>`);
  }

  function visit(node, parentName, ancestorTransforms = []) {
    if (node.type === "comment") return;

    if (node.type === "text") {
      if (
        parentName !== "title" &&
        parentName !== "desc" &&
        node.value.trim() !== ""
      ) {
        addFailure(
          failures,
          parentName
            ? `contains non-whitespace text inside <${parentName}>`
            : "contains non-whitespace text outside the root element",
        );
      }
      return;
    }

    if (node.type !== "element") {
      addFailure(failures, `contains unsupported ${node.type} node`);
      return;
    }

    elements.push(node);
    if (node.name === "path") {
      pathEntries.push({ node, transforms: ancestorTransforms });
    }
    if (!allowedElements.has(node.name)) {
      addFailure(failures, `contains disallowed element <${node.name}>`);
    }

    if (parentName !== null) {
      const allowedChildren = allowedChildrenByElement.get(parentName);
      if (!allowedChildren?.has(node.name)) {
        addFailure(
          failures,
          `element <${node.name}> is not allowed inside <${parentName}>`,
        );
      }
    }

    const allowedAttributes =
      allowedAttributesByElement.get(node.name) ?? new Set();
    for (const [attributeName, attributeValue] of Object.entries(
      node.attributes,
    )) {
      if (!allowedAttributes.has(attributeName)) {
        addFailure(
          failures,
          `attribute "${attributeName}" is not allowed on <${node.name}>`,
        );
      }
      if (
        attributeName !== "xmlns" &&
        resourceReferencePattern.test(attributeValue)
      ) {
        addFailure(failures, "must not reference external or data resources");
      }
    }

    if (
      node.name === "g" &&
      node.attributes.transform !== undefined &&
      !isSupportedTransform(node.attributes.transform)
    ) {
      addFailure(
        failures,
        `transform "${node.attributes.transform}" uses unsupported syntax`,
      );
    }

    const childTransforms =
      node.name === "g" && node.attributes.transform !== undefined
        ? [...ancestorTransforms, node.attributes.transform]
        : ancestorTransforms;
    for (const child of node.children) {
      visit(child, node.name, childTransforms);
    }
  }

  for (const child of document.children) visit(child, null);
  return {
    elements,
    pathEntries,
    root: root?.name === "svg" ? root : null,
  };
}

function validatePaint(path, attributeName, usedColors, failures) {
  const value = path.attributes[attributeName];
  if (value === undefined || value === "none") return;

  if (!exactHexColorPattern.test(value)) {
    addFailure(
      failures,
      `<path> ${attributeName} must be "none" or an uppercase six-digit hex color`,
    );
    return;
  }

  usedColors.add(value);
}

function validatePath(path, usedColors, failures) {
  const attributes = path.attributes;

  if (typeof attributes.d !== "string" || attributes.d.trim() === "") {
    addFailure(failures, "every <path> must declare non-empty d geometry");
  }
  if (attributes.fill === undefined) {
    addFailure(failures, 'every <path> must declare an explicit "fill"');
  }

  validatePaint(path, "fill", usedColors, failures);
  validatePaint(path, "stroke", usedColors, failures);

  if (
    attributes["stroke-linecap"] !== undefined &&
    attributes["stroke-linecap"] !== "round"
  ) {
    addFailure(failures, '<path> stroke-linecap must be "round"');
  }
  if (
    attributes["stroke-linejoin"] !== undefined &&
    attributes["stroke-linejoin"] !== "round"
  ) {
    addFailure(failures, '<path> stroke-linejoin must be "round"');
  }

  const strokeWidth = attributes["stroke-width"];
  if (
    strokeWidth !== undefined &&
    (!exactNumberPattern.test(strokeWidth) || Number(strokeWidth) <= 0)
  ) {
    addFailure(failures, "<path> stroke-width must be a positive number");
  }
  if (
    attributes.stroke !== undefined &&
    attributes.stroke !== "none" &&
    strokeWidth === undefined
  ) {
    addFailure(failures, "stroked <path> elements must declare stroke-width");
  }
  if (
    attributes.stroke === undefined &&
    ["stroke-linecap", "stroke-linejoin", "stroke-width"].some(
      (attributeName) => attributes[attributeName] !== undefined,
    )
  ) {
    addFailure(
      failures,
      "stroke-specific attributes require an explicit <path> stroke",
    );
  }

  const hasVisibleFill =
    attributes.fill !== undefined && attributes.fill !== "none";
  const hasVisibleStroke =
    attributes.stroke !== undefined &&
    attributes.stroke !== "none" &&
    strokeWidth !== undefined &&
    exactNumberPattern.test(strokeWidth) &&
    Number(strokeWidth) > 0;
  if (!hasVisibleFill && !hasVisibleStroke) {
    addFailure(failures, "every <path> must have a visible fill or stroke");
  }
}

function validateExactColors(fileName, usedColors, failures) {
  const expectedColors = expectedColorsByFile.get(fileName);
  if (!expectedColors) {
    addFailure(failures, `has no exact color contract for ${fileName}`);
    return;
  }

  const actual = [...usedColors].sort();
  const expected = [...expectedColors].sort();
  if (
    actual.length !== expected.length ||
    actual.some((color, index) => color !== expected[index])
  ) {
    addFailure(
      failures,
      `must use exact color set ${expected.join(", ")}; found ${actual.length === 0 ? "none" : actual.join(", ")}`,
    );
  }
}

function inspectVisibleGeometry(source, expectedViewBox) {
  const [minX, minY, width, height] = expectedViewBox.split(" ").map(Number);

  try {
    const renderer = new Resvg(source, {
      fitTo: {
        mode: "width",
        value: Math.min(256, Math.max(1, Math.ceil(width))),
      },
      font: { loadSystemFonts: false },
      logLevel: "off",
    });
    const bounds = renderer.getBBox();
    const intersectsViewBox =
      bounds !== undefined &&
      [bounds.x, bounds.y, bounds.width, bounds.height].every(
        Number.isFinite,
      ) &&
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.x < minX + width &&
      bounds.x + bounds.width > minX &&
      bounds.y < minY + height &&
      bounds.y + bounds.height > minY;

    const pixels = renderer.render().pixels;
    let hasVisiblePixel = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) {
        hasVisiblePixel = true;
        break;
      }
    }

    return { visible: intersectsViewBox && hasVisiblePixel };
  } catch (error) {
    const reason = String(error?.message ?? "render error")
      .replace(/\s+/g, " ")
      .trim();
    return { error: reason, visible: false };
  }
}

function escapeXmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderPathFixture(pathEntry, expectedViewBox) {
  const openingGroups = pathEntry.transforms
    .map((transform) => `<g transform="${escapeXmlAttribute(transform)}">`)
    .join("");
  const closingGroups = "</g>".repeat(pathEntry.transforms.length);
  const attributes = Object.entries(pathEntry.node.attributes)
    .map(([name, value]) => `${name}="${escapeXmlAttribute(value)}"`)
    .join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${expectedViewBox}">${openingGroups}<path ${attributes}/>${closingGroups}</svg>`;
}

function validateVisibleGeometry(
  source,
  expectedViewBox,
  pathEntries,
  failures,
) {
  const documentGeometry = inspectVisibleGeometry(source, expectedViewBox);
  if (documentGeometry.error) {
    addFailure(
      failures,
      `could not validate visible path geometry (${documentGeometry.error})`,
    );
    return;
  }
  if (!documentGeometry.visible) {
    addFailure(failures, "visible path geometry must intersect the viewBox");
    return;
  }

  for (const pathEntry of pathEntries) {
    const pathGeometry = inspectVisibleGeometry(
      renderPathFixture(pathEntry, expectedViewBox),
      expectedViewBox,
    );
    if (!pathGeometry.visible) {
      addFailure(
        failures,
        "every path must render visible geometry inside the viewBox",
      );
      return;
    }
  }
}

function validateSvg(fileName, expectedViewBox, source) {
  const failures = [];
  const document = parseXmlAst(source, failures);
  if (!document) return failures;

  const { elements, pathEntries, root } = inspectDocument(document, failures);
  if (!root) return failures;

  if (root.attributes.xmlns !== "http://www.w3.org/2000/svg") {
    addFailure(failures, 'root xmlns must be "http://www.w3.org/2000/svg"');
  }
  if (root.attributes.viewBox !== expectedViewBox) {
    addFailure(
      failures,
      `root viewBox must be "${expectedViewBox}"; found "${root.attributes.viewBox ?? "missing"}"`,
    );
  }
  if (root.attributes.role !== "img") {
    addFailure(failures, 'root role must be "img"');
  }
  if (
    typeof root.attributes["aria-label"] !== "string" ||
    root.attributes["aria-label"].trim() === ""
  ) {
    addFailure(failures, "root aria-label must be non-empty");
  }

  const directTitles = root.children.filter(
    (child) => child.type === "element" && child.name === "title",
  );
  const directDescriptions = root.children.filter(
    (child) => child.type === "element" && child.name === "desc",
  );
  const allTitles = elements.filter((element) => element.name === "title");
  const allDescriptions = elements.filter((element) => element.name === "desc");

  if (directTitles.length !== 1 || allTitles.length !== 1) {
    addFailure(failures, "must contain exactly one direct <title>");
  } else if (collectText(directTitles[0]).trim() === "") {
    addFailure(failures, "<title> must contain non-empty text");
  }
  if (directDescriptions.length !== 1 || allDescriptions.length !== 1) {
    addFailure(failures, "must contain exactly one direct <desc>");
  } else if (collectText(directDescriptions[0]).trim() === "") {
    addFailure(failures, "<desc> must contain non-empty text");
  }

  const paths = elements.filter((element) => element.name === "path");
  if (paths.length === 0) {
    addFailure(failures, "must contain at least one <path> element");
  }

  const usedColors = new Set();
  for (const path of paths) validatePath(path, usedColors, failures);
  validateExactColors(fileName, usedColors, failures);

  if (failures.length === 0) {
    validateVisibleGeometry(source, expectedViewBox, pathEntries, failures);
  }

  return failures;
}

const selfTestBaseSvg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  aria-label="SALT&amp;PEPS icon"
  role="img"
  viewBox="0 0 64 64"
>
  <title>SALT&amp;PEPS icon</title>
  <desc>A test fixture for the approved icon contract.</desc>
  <g>
    <path
      fill="none"
      stroke="#1B3A7A"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8 8 L56 56"
    />
    <path fill="#2D6BCC" d="M24 24 H40 V40 H24 Z" />
  </g>
</svg>`;

const negativeSelfTests = [
  {
    name: "external entity document type",
    source: `<!DOCTYPE svg [<!ENTITY payload SYSTEM "file:///etc/passwd">]>\n${selfTestBaseSvg}`,
    expectedFailure: "must not contain a document type declaration",
  },
  {
    name: "malformed XML",
    source: selfTestBaseSvg.replace("</g>", "</path></g>"),
    expectedFailure: "is not well-formed XML",
  },
  {
    name: "foreignObject element",
    source: selfTestBaseSvg.replace("</g>", "</g><foreignObject />"),
    expectedFailure: "contains disallowed element <foreignObject>",
  },
  {
    name: "style element",
    source: selfTestBaseSvg.replace("</g>", "</g><style />"),
    expectedFailure: "contains disallowed element <style>",
  },
  {
    name: "animation element",
    source: selfTestBaseSvg.replace("</g>", "</g><animate />"),
    expectedFailure: "contains disallowed element <animate>",
  },
  {
    name: "data resource attribute",
    source: selfTestBaseSvg.replace("<g>", '<g src="data:text/html,attack">'),
    expectedFailure: 'attribute "src" is not allowed on <g>',
  },
  {
    name: "external resource attribute",
    source: selfTestBaseSvg.replace(
      "<g>",
      '<g src="https://attacker.invalid/payload">',
    ),
    expectedFailure: 'attribute "src" is not allowed on <g>',
  },
  {
    name: "srcdoc attribute",
    source: selfTestBaseSvg.replace(
      "<g>",
      '<g srcdoc="&lt;script>attack&lt;/script>">',
    ),
    expectedFailure: 'attribute "srcdoc" is not allowed on <g>',
  },
  {
    name: "event handler attribute",
    source: selfTestBaseSvg.replace("<g>", '<g onload="attack()">'),
    expectedFailure: 'attribute "onload" is not allowed on <g>',
  },
  {
    name: "data URL paint",
    source: selfTestBaseSvg.replace(
      'fill="#2D6BCC"',
      'fill="url(data:image/svg+xml,attack)"',
    ),
    expectedFailure: "must not reference external or data resources",
  },
  {
    name: "opacity hiding",
    source: selfTestBaseSvg.replace("<g>", '<g opacity="0">'),
    expectedFailure: 'attribute "opacity" is not allowed on <g>',
  },
  {
    name: "display hiding",
    source: selfTestBaseSvg.replace(
      '<path fill="#2D6BCC"',
      '<path display="none" fill="#2D6BCC"',
    ),
    expectedFailure: 'attribute "display" is not allowed on <path>',
  },
  {
    name: "visibility hiding",
    source: selfTestBaseSvg.replace(
      '<path fill="#2D6BCC"',
      '<path visibility="hidden" fill="#2D6BCC"',
    ),
    expectedFailure: 'attribute "visibility" is not allowed on <path>',
  },
  {
    name: "unsupported transform",
    source: selfTestBaseSvg.replace("<g>", '<g transform="rotate(45)">'),
    expectedFailure: 'transform "rotate(45)" uses unsupported syntax',
  },
  {
    name: "missing role",
    source: selfTestBaseSvg.replace('  role="img"\n', ""),
    expectedFailure: 'root role must be "img"',
  },
  {
    name: "missing aria-label",
    source: selfTestBaseSvg.replace('  aria-label="SALT&amp;PEPS icon"\n', ""),
    expectedFailure: "root aria-label must be non-empty",
  },
  {
    name: "missing title",
    source: selfTestBaseSvg.replace(
      "  <title>SALT&amp;PEPS icon</title>\n",
      "",
    ),
    expectedFailure: "must contain exactly one direct <title>",
  },
  {
    name: "multiple descriptions",
    source: selfTestBaseSvg.replace(
      "  <desc>A test fixture for the approved icon contract.</desc>",
      "  <desc>First description.</desc>\n  <desc>Second description.</desc>",
    ),
    expectedFailure: "must contain exactly one direct <desc>",
  },
  {
    name: "wrong variant color set",
    source: selfTestBaseSvg.replaceAll("#2D6BCC", "#1B3A7A"),
    expectedFailure: "must use exact color set",
  },
  {
    name: "off-canvas placeholder geometry",
    source: selfTestBaseSvg
      .replace("M8 8 L56 56", "M108 108 L156 156")
      .replace("M24 24 H40 V40 H24 Z", "M124 124 H140 V140 H124 Z"),
    expectedFailure: "visible path geometry must intersect the viewBox",
  },
  {
    name: "one off-canvas path beside visible artwork",
    source: selfTestBaseSvg.replace("M8 8 L56 56", "M108 108 L156 156"),
    expectedFailure:
      "every path must render visible geometry inside the viewBox",
  },
];

function runContractSelfTests() {
  const testFailures = [];
  const baselineFailures = validateSvg(
    "salt-peps-icon.svg",
    "0 0 64 64",
    selfTestBaseSvg,
  );

  if (baselineFailures.length > 0) {
    testFailures.push(
      `approved baseline fixture failed validation: ${baselineFailures.join("; ")}`,
    );
  }

  for (const testCase of negativeSelfTests) {
    const actualFailures = validateSvg(
      "salt-peps-icon.svg",
      "0 0 64 64",
      testCase.source,
    );
    if (
      !actualFailures.some((failure) =>
        failure.includes(testCase.expectedFailure),
      )
    ) {
      testFailures.push(
        `${testCase.name}: expected rejection containing "${testCase.expectedFailure}"; got ${actualFailures.length === 0 ? "no violations" : actualFailures.join("; ")}`,
      );
    }
  }

  if (testFailures.length > 0) {
    console.error(
      `SALT&PEPS logo verifier self-test: FAIL (${testFailures.length} failed assertion${testFailures.length === 1 ? "" : "s"})`,
    );
    for (const failure of testFailures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      `SALT&PEPS logo verifier self-test: PASS (${negativeSelfTests.length} malicious fixtures rejected)`,
    );
  }
}

if (process.argv.includes("--self-test")) {
  runContractSelfTests();
} else {
  const failures = [];
  let validatedAssetCount = 0;

  for (const [fileName, expectedViewBox] of assetContracts) {
    const filePath = resolve(brandDirectory, fileName);
    const relativePath = displayPath(filePath);

    try {
      const source = await readFile(filePath, "utf8");
      const assetFailures = validateSvg(fileName, expectedViewBox, source);

      for (const failure of assetFailures) {
        failures.push(`${relativePath}: ${failure}`);
      }

      if (assetFailures.length === 0) {
        validatedAssetCount += 1;
      }
    } catch (error) {
      if (error?.code === "ENOENT") {
        failures.push(`${relativePath}: missing required file`);
      } else {
        failures.push(
          `${relativePath}: could not be read (${error?.code ?? "unknown error"})`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `SALT&PEPS logo asset contract: FAIL (${failures.length} violation${failures.length === 1 ? "" : "s"})`,
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `SALT&PEPS logo asset contract: PASS (${validatedAssetCount} assets validated)`,
    );
  }
}
