#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  ["salt-peps-icon-mono.svg", "0 0 64 64"],
  ["salt-peps-icon-small.svg", "0 0 64 64"],
  ["salt-peps-social.svg", "0 0 180 180"],
  ["salt-peps-logo-proof.svg", "0 0 1200 900"],
];

const brandColors = new Set([
  "#0F1F38",
  "#1B3A7A",
  "#2D6BCC",
  "#1B3164",
  "#FFFFFF",
]);
const proofOnlyColors = new Set(["#F8FAFC", "#D0DAE4", "#6B7280"]);
const allowedNamespaceUrls = new Set([
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
]);

const forbiddenFeatures = [
  ["text elements", /<\s*(?:[A-Za-z_][\w.-]*:)?text\b/i],
  ["image elements", /<\s*(?:[A-Za-z_][\w.-]*:)?image\b/i],
  [
    "gradients",
    /<\s*(?:[A-Za-z_][\w.-]*:)?(?:linearGradient|radialGradient|gradient)\b|(?:linear|radial)-gradient\s*\(/i,
  ],
  ["filters", /<\s*(?:[A-Za-z_][\w.-]*:)?filter\b|\bfilter\s*(?:=|:)/i],
  ["masks", /<\s*(?:[A-Za-z_][\w.-]*:)?mask\b|\bmask\s*(?:=|:)/i],
  ["patterns", /<\s*(?:[A-Za-z_][\w.-]*:)?pattern\b/i],
  [
    "scripts or event handlers",
    /<\s*(?:[A-Za-z_][\w.-]*:)?script\b|\son[A-Za-z]+\s*=/i,
  ],
  ["URL-based paint or effects", /\burl\s*\(/i],
];

const hexColorPattern =
  /#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})(?![0-9A-Fa-f])/g;
const exactHexColorPattern =
  /^#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})$/;
const paintAttributePattern =
  /\s(?:fill|stroke|color|stop-color|flood-color|lighting-color)\s*=\s*(["'])(.*?)\1/gi;
const paintDeclarationPattern =
  /\b(?:fill|stroke|color|stop-color|flood-color|lighting-color)\s*:\s*([^;}]+)/gi;

function displayPath(filePath) {
  return relative(repositoryRoot, filePath).split("\\").join("/");
}

function documentBody(source) {
  return source
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^<\?xml[\s\S]*?\?>\s*/, "")
    .replace(/^(?:<!--[\s\S]*?-->\s*)*/, "");
}

function stripXmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, "");
}

function findTagEnd(source, start) {
  let quote = null;

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }

  return -1;
}

function parseOpeningTag(tag) {
  const elementMatch = tag.match(/^<([A-Za-z_][\w:.-]*)/);
  if (!elementMatch) return { failure: `contains malformed markup: ${tag}` };

  const attributes = [];
  const attributeNames = new Set();
  let index = elementMatch[0].length;

  while (index < tag.length) {
    while (/\s/.test(tag[index])) index += 1;

    if (tag.startsWith("/>", index)) {
      return {
        attributes,
        elementName: elementMatch[1],
        selfClosing: true,
      };
    }
    if (tag[index] === ">") {
      return {
        attributes,
        elementName: elementMatch[1],
        selfClosing: false,
      };
    }

    const attributeMatch = tag.slice(index).match(/^([A-Za-z_][\w:.-]*)/);
    if (!attributeMatch) {
      return { failure: `contains malformed attribute syntax in ${tag}` };
    }

    const attributeName = attributeMatch[1];
    if (attributeNames.has(attributeName)) {
      return { failure: `contains duplicate attribute ${attributeName}` };
    }
    attributeNames.add(attributeName);
    index += attributeName.length;

    while (/\s/.test(tag[index])) index += 1;
    if (tag[index] !== "=") {
      return { failure: `attribute ${attributeName} must be followed by =` };
    }
    index += 1;

    while (/\s/.test(tag[index])) index += 1;
    const quote = tag[index];
    if (quote !== '"' && quote !== "'") {
      return { failure: `attribute ${attributeName} must have a quoted value` };
    }

    const valueEnd = tag.indexOf(quote, index + 1);
    if (valueEnd === -1) {
      return { failure: `attribute ${attributeName} has no closing quote` };
    }

    const value = tag.slice(index + 1, valueEnd);
    if (value.includes("<")) {
      return { failure: `attribute ${attributeName} contains an invalid <` };
    }
    attributes.push({ name: attributeName, value });
    index = valueEnd + 1;

    if (
      !/\s/.test(tag[index]) &&
      tag[index] !== ">" &&
      !tag.startsWith("/>", index)
    ) {
      return {
        failure: `attribute ${attributeName} must be followed by whitespace or the tag end`,
      };
    }
  }

  return { failure: `contains unterminated opening tag ${tag}` };
}

function scanSvgStructure(source) {
  const failures = [];
  const hrefValues = [];
  const stack = [];
  let topLevelElementCount = 0;
  let index = 0;

  const addFailure = (message) => {
    if (!failures.includes(message)) failures.push(message);
  };

  while (index < source.length) {
    if (source[index] !== "<") {
      const nextTag = source.indexOf("<", index);
      const textEnd = nextTag === -1 ? source.length : nextTag;
      if (stack.length === 0 && source.slice(index, textEnd).trim() !== "") {
        addFailure("contains non-whitespace content outside the root element");
      }
      index = textEnd;
      continue;
    }

    if (source.startsWith("<![CDATA[", index)) {
      const cdataEnd = source.indexOf("]]>", index + 9);
      if (cdataEnd === -1) {
        addFailure("contains an unterminated CDATA section");
        break;
      }
      if (stack.length === 0) {
        addFailure("contains CDATA outside the root element");
      }
      index = cdataEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(source, index);
    if (tagEnd === -1) {
      addFailure("contains an unterminated element tag");
      break;
    }

    const tag = source.slice(index, tagEnd + 1);
    const closingMatch = tag.match(/^<\/([A-Za-z_][\w:.-]*)\s*>$/);
    const openingTag = closingMatch ? null : parseOpeningTag(tag);

    if (closingMatch) {
      const elementName = closingMatch[1];
      const expectedName = stack.at(-1);
      if (!expectedName) {
        addFailure(`contains unexpected closing tag </${elementName}>`);
      } else if (elementName !== expectedName) {
        addFailure(
          `closing tag </${elementName}> does not match <${expectedName}>`,
        );
      } else {
        stack.pop();
      }
    } else if (!openingTag.failure) {
      const { attributes, elementName, selfClosing } = openingTag;
      hrefValues.push(
        ...attributes
          .filter(
            (attribute) =>
              attribute.name.toLowerCase().split(":").at(-1) === "href",
          )
          .map((attribute) => attribute.value),
      );

      if (stack.length === 0) {
        topLevelElementCount += 1;
        if (topLevelElementCount === 1 && elementName !== "svg") {
          addFailure(`top-level root must be <svg>, found <${elementName}>`);
        } else if (topLevelElementCount > 1) {
          addFailure("contains more than one top-level element");
        }
      }

      if (!selfClosing) stack.push(elementName);
    } else {
      addFailure(openingTag.failure);
    }

    index = tagEnd + 1;
  }

  if (topLevelElementCount === 0) {
    addFailure("must contain one top-level <svg> root");
  }
  if (stack.length > 0) {
    addFailure(`contains unclosed element tag <${stack.at(-1)}>`);
  }

  return { failures, hrefValues };
}

function collectPaintValues(source) {
  const values = [];

  for (const match of source.matchAll(paintAttributePattern)) {
    values.push(match[2].trim());
  }

  for (const match of source.matchAll(paintDeclarationPattern)) {
    values.push(match[1].trim());
  }

  return [...new Set(values)];
}

function validateSvg(fileName, expectedViewBox, source) {
  const failures = [];
  const sourceWithoutComments = stripXmlComments(source);
  const body = documentBody(sourceWithoutComments);
  const rootOpening = body.match(/^<svg\b([^>]*)>/);
  const structure = scanSvgStructure(body);

  for (const failure of structure.failures) {
    failures.push(`has invalid SVG structure: ${failure}`);
  }

  if (!rootOpening) {
    failures.push("must begin with an <svg> root element");
  }

  if (!/<\/svg>\s*$/.test(body)) {
    failures.push("must end with a closing </svg> root tag");
  }

  if (rootOpening) {
    const viewBoxes = [
      ...rootOpening[1].matchAll(/(?:^|\s)viewBox\s*=\s*(["'])(.*?)\1/g),
    ];

    if (viewBoxes.length !== 1) {
      failures.push(`must declare one viewBox="${expectedViewBox}"`);
    } else if (viewBoxes[0][2] !== expectedViewBox) {
      failures.push(
        `has viewBox="${viewBoxes[0][2]}"; expected "${expectedViewBox}"`,
      );
    }
  }

  const pathCount = (
    sourceWithoutComments.match(/<\s*(?:[A-Za-z_][\w.-]*:)?path\b/g) ?? []
  ).length;
  if (pathCount === 0) {
    failures.push("must contain at least one <path> element");
  }

  for (const [description, pattern] of forbiddenFeatures) {
    if (pattern.test(sourceWithoutComments)) {
      failures.push(`must not contain ${description}`);
    }
  }

  if (
    structure.hrefValues.some(
      (value) => typeof value !== "string" || !/^#[^\s]+$/.test(value),
    )
  ) {
    failures.push(
      "href and xlink:href values must be internal fragment references beginning with #",
    );
  }

  const externalUrls = [
    ...new Set(sourceWithoutComments.match(/https?:\/\/[^\s"'<>)]*/gi) ?? []),
  ].filter((url) => !allowedNamespaceUrls.has(url));
  if (externalUrls.length > 0) {
    failures.push(`contains external URL(s): ${externalUrls.join(", ")}`);
  }

  const allowedColors = new Set(brandColors);
  if (fileName === "salt-peps-logo-proof.svg") {
    for (const color of proofOnlyColors) {
      allowedColors.add(color);
    }
  }

  const colors = [
    ...new Set(
      (
        sourceWithoutComments
          .replace(
            /(\s(?:[A-Za-z_][\w.-]*:)?href\s*=\s*)(["'])(.*?)\2/gi,
            (_match, prefix, quote) => `${prefix}${quote}${quote}`,
          )
          .match(hexColorPattern) ?? []
      ).map((color) => color.toUpperCase()),
    ),
  ];
  const unapprovedColors = colors.filter((color) => !allowedColors.has(color));
  if (unapprovedColors.length > 0) {
    failures.push(
      `uses unapproved hex color(s): ${unapprovedColors.join(", ")}`,
    );
  }

  if (!colors.some((color) => allowedColors.has(color))) {
    failures.push("must contain at least one approved hex palette color");
  }

  const nonHexPaintValues = collectPaintValues(sourceWithoutComments).filter(
    (value) =>
      value.toLowerCase() !== "none" && !exactHexColorPattern.test(value),
  );
  if (nonHexPaintValues.length > 0) {
    failures.push(
      `uses non-hex paint value(s): ${nonHexPaintValues.join(", ")}`,
    );
  }

  return failures;
}

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
