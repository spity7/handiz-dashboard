const MAX_ABOUT_COURSE_SECTIONS = 10;
const MAX_ITEMS_PER_SECTION = 15;
const MAX_TITLE_LENGTH = 120;
const MAX_ITEM_LENGTH = 280;

const trimString = (value) => String(value ?? "").trim();

const normalizeItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return { items: [] };

  const items = [];
  for (const raw of rawItems) {
    const text = trimString(raw);
    if (!text) continue;
    if (text.length > MAX_ITEM_LENGTH) {
      return {
        error: `Each list item must be at most ${MAX_ITEM_LENGTH} characters.`,
      };
    }
    items.push(text);
    if (items.length > MAX_ITEMS_PER_SECTION) {
      return {
        error: `Each section can have at most ${MAX_ITEMS_PER_SECTION} items.`,
      };
    }
  }
  return { items };
};

const resolveSection = (raw, index) => {
  const title = trimString(raw?.title);
  const itemsResult = normalizeItems(raw?.items);

  if (itemsResult.error) return itemsResult;

  const items = itemsResult.items;
  if (!title && !items.length) return null;

  if (!title) {
    return { error: "Each section needs a title when it has list items." };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return {
      error: `Section titles must be at most ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  return {
    title,
    items,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index,
  };
};

const normalizeAboutCourseSectionsInput = (value) => {
  let items = value;

  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return {
        error: "About course sections must be valid JSON.",
        sections: [],
      };
    }
  }

  if (!Array.isArray(items)) {
    return { error: "About course sections must be an array.", sections: [] };
  }

  if (items.length > MAX_ABOUT_COURSE_SECTIONS) {
    return {
      error: `You can add at most ${MAX_ABOUT_COURSE_SECTIONS} sections.`,
      sections: [],
    };
  }

  const sections = [];
  for (let i = 0; i < items.length; i += 1) {
    const resolved = resolveSection(items[i], i);
    if (resolved?.error) {
      return { error: resolved.error, sections: [] };
    }
    if (resolved) sections.push(resolved);
  }

  sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sections.forEach((section, order) => {
    section.order = order;
  });

  return { sections };
};

module.exports = {
  MAX_ABOUT_COURSE_SECTIONS,
  MAX_ITEMS_PER_SECTION,
  normalizeAboutCourseSectionsInput,
};
