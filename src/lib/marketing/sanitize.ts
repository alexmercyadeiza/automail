import sanitizeHtml from "sanitize-html";

const allowedTags = Array.from(
  new Set([
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "section",
    "article",
    "figure",
    "figcaption",
    "hr",
  ]),
);

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "target", "rel", "title", "style", "class", "data-type"],
  img: ["src", "alt", "title", "style", "width", "height"],
  "*": ["style", "class"],
};

function isIntentionalColor(color: string): boolean {
  const normalized = color.toLowerCase().replace(/\s/g, "");

  const intentionalColors = new Set([
    "#ff0000", "#f00", "red",
    "#00ff00", "#0f0", "green", "lime",
    "#0000ff", "#00f", "blue",
    "#ffffff", "#fff", "white",
    "#000000", "#000", "black",
    "#ff6600", "orange",
    "#800080", "purple",
    "#ffff00", "yellow",
    "#00ffff", "cyan",
    "#ff00ff", "magenta",
  ]);

  if (intentionalColors.has(normalized)) {
    return true;
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const r = Number.parseInt(hexMatch[1].slice(0, 2), 16);
    const g = Number.parseInt(hexMatch[1].slice(2, 4), 16);
    const b = Number.parseInt(hexMatch[1].slice(4, 6), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (saturation > 0.3) {
      return true;
    }
  }

  return false;
}

function stripColorStyles(html: string): string {
  return html.replace(/style="([^"]*)"/gi, (_match, styles: string) => {
    const cleanedStyles = styles
      .split(";")
      .filter((s) => {
        const [prop, value] = s.split(":").map((p) => p?.trim());
        const propLower = prop?.toLowerCase();

        if (propLower === "background-color") return true;
        if (propLower === "color" && value) {
          return isIntentionalColor(value);
        }
        return true;
      })
      .join(";")
      .trim();

    if (!cleanedStyles) {
      return "";
    }
    return `style="${cleanedStyles}"`;
  });
}

export function sanitizeMarketingHtml(html: string) {
  const sanitized = sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "data", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs["data-type"] === "email-button") {
          return { tagName, attribs };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            rel: "noopener",
            target: "_blank",
          },
        };
      },
    },
  });

  return stripColorStyles(sanitized);
}
