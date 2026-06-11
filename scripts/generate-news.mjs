import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, "config", "sources.json");
const DATA_PATH = path.join(ROOT, "public", "news-data.json");
const LOG_PATH = path.join(ROOT, "dist-news-log.json");
const TIMEZONE = "Australia/Sydney";
const DEFAULT_LOOKBACK_HOURS = 24;
const ARCHIVE_DAYS_TO_KEEP = 3;

const impactTerms = new Set([
  "ai",
  "artificial",
  "intelligence",
  "model",
  "models",
  "chip",
  "chips",
  "nvidia",
  "openai",
  "anthropic",
  "google",
  "apple",
  "microsoft",
  "meta",
  "amazon",
  "security",
  "cyber",
  "breach",
  "hack",
  "regulation",
  "regulator",
  "policy",
  "court",
  "lawsuit",
  "tariff",
  "inflation",
  "rates",
  "rba",
  "fed",
  "market",
  "markets",
  "stocks",
  "bond",
  "oil",
  "climate",
  "war",
  "ukraine",
  "russia",
  "china",
  "israel",
  "gaza",
  "iran",
  "election",
  "diplomacy",
  "bitcoin",
  "crypto",
  "ethereum",
  "stablecoin",
  "platform",
  "startup",
  "merger",
  "acquisition",
  "earnings"
]);

const lowSignalPatterns = [
  /\bcoupon(s)?\b/i,
  /\bpromo code(s)?\b/i,
  /\bdeal(s)?\b/i,
  /\bbest\b.*\b(to buy|sale|discount)\b/i,
  /\bshopping\b/i,
  /\bgift guide\b/i,
  /\bhow to\b/i,
  /\breview\b/i,
  /\btrailer\b/i,
  /\bcelebrity\b/i,
  /\bhoroscope\b/i,
  /\bsponsored\b/i,
  /\bpress release\b/i,
  /\bpartner content\b/i
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false
});

async function main() {
  const startedAt = new Date();
  const config = JSON.parse(await fs.readFile(SOURCES_PATH, "utf8"));
  const log = {
    startedAt: startedAt.toISOString(),
    timezone: TIMEZONE,
    feedsSucceeded: [],
    feedsFailed: [],
    articlesFoundPerCategory: {},
    eventClustersAfterDedupe: {},
    warnings: [],
    archiveEntriesKept: 0,
    archiveEntriesRemoved: 0,
    outputGeneratedSuccessfully: false
  };

  const sections = [];
  const seenGlobal = [];

  for (const category of config.categories) {
    const fetched = [];

    for (const source of category.sources) {
      try {
        const articles = await fetchFeed(source, category);
        fetched.push(...articles);
        log.feedsSucceeded.push({
          category: category.label,
          source: source.name,
          count: articles.length
        });
      } catch (error) {
        log.feedsFailed.push({
          category: category.label,
          source: source.name,
          url: source.url,
          reason: error.message
        });
      }
    }

    const recent = filterUsefulWithinWindow(fetched, DEFAULT_LOOKBACK_HOURS, category.id);
    const minimum = category.minimumUsefulItems || 0;
    const fallbackHours = category.fallbackLookbackHours || DEFAULT_LOOKBACK_HOURS;
    const useful =
      recent.length < minimum ? filterUsefulWithinWindow(fetched, fallbackHours, category.id) : recent;

    if (recent.length < minimum && useful.length > recent.length) {
      log.warnings.push(
        `${category.label} widened from ${DEFAULT_LOOKBACK_HOURS}h to ${fallbackHours}h to reach useful items.`
      );
    }

    log.articlesFoundPerCategory[category.label] = useful.length;

    const clusters = dedupeIntoEvents(useful);
    const uniqueCategoryStories = clusters
      .map((cluster) => selectBestStory(cluster, category.id))
      .filter((story) => !isDuplicateAcrossCategories(story, seenGlobal));

    uniqueCategoryStories.forEach((story) => seenGlobal.push(story));
    const ranked = uniqueCategoryStories.sort((a, b) => b.score - a.score);

    log.eventClustersAfterDedupe[category.label] = clusters.length;

    sections.push({
      id: category.id,
      label: category.label,
      accent: category.accent,
      status: getSectionStatus(category, ranked, log.feedsFailed),
      leadStories: ranked.slice(0, 4).map(publicStory),
      moreHeadlines: ranked.slice(4, 14).map(publicStory)
    });
  }

  const todayBriefing = {
    title: "First Light",
    dateKey: formatSydneyDateKey(startedAt),
    dateLabel: formatSydneyDate(startedAt),
    relativeLabel: "Today",
    generatedAt: startedAt.toISOString(),
    timezone: TIMEZONE,
    sections
  };

  const previousArchive = await readPreviousArchive();
  const archiveBeforeMerge = previousArchive.length;
  const archive = mergeRollingArchive(previousArchive, todayBriefing);
  const keptDateKeys = new Set(archive.map((briefing) => briefing.dateKey));
  log.archiveEntriesKept = archive.length;
  log.archiveEntriesRemoved = previousArchive.filter(
    (briefing) => briefing?.dateKey !== todayBriefing.dateKey && !keptDateKeys.has(briefing?.dateKey)
  ).length;

  const output = {
    ...todayBriefing,
    archive
  };

  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`);
  log.outputGeneratedSuccessfully = true;
  log.completedAt = new Date().toISOString();
  await fs.writeFile(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`);

  printLog(log);
}

async function fetchFeed(source, category) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "FirstLightBriefing/1.0 (+https://github.com/)",
        accept: "application/rss+xml, application/xml, text/xml, */*"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.text();
    const parsed = parser.parse(sanitizeXml(raw));
    return extractItems(parsed).map((item) => normalizeItem(item, source, category)).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeXml(raw) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, "&amp;");
}

function extractItems(parsed) {
  const channel = parsed?.rss?.channel;
  const rssItems = Array.isArray(channel?.item) ? channel.item : channel?.item ? [channel.item] : [];
  const atomEntries = parsed?.feed?.entry
    ? Array.isArray(parsed.feed.entry)
      ? parsed.feed.entry
      : [parsed.feed.entry]
    : [];
  return [...rssItems, ...atomEntries];
}

function normalizeItem(item, source, category) {
  const title = cleanText(valueOf(item.title));
  const url = pickUrl(item);
  const publishedAt = pickDate(item);
  const description = cleanText(
    valueOf(item.description) || valueOf(item.summary) || valueOf(item.content) || valueOf(item["content:encoded"])
  );

  if (!title || !url || !publishedAt) return null;

  return {
    categoryId: category.id,
    categoryLabel: category.label,
    title,
    url,
    source: source.name,
    publishedAt,
    summary: summarize(description || title),
    tokens: tokenize(`${title} ${description}`)
  };
}

function valueOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value["#cdata"] || value["#text"] || "";
  return String(value);
}

function pickUrl(item) {
  const link = item.link;
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    const alternate = link.find((entry) => entry["@_rel"] === "alternate") || link[0];
    return alternate?.["@_href"] || valueOf(alternate);
  }
  if (typeof link === "object") return link["@_href"] || valueOf(link);
  return item.guid?.["#text"] || item.guid || "";
}

function pickDate(item) {
  const raw =
    item.pubDate ||
    item.published ||
    item.updated ||
    item["dc:date"] ||
    item["atom:updated"] ||
    item["media:date"];
  const date = new Date(valueOf(raw) || raw);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(text) {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  const firstSentence = cleaned.match(/^(.{80,260}?[.!?])\s/)?.[1] || cleaned;
  return firstSentence.length > 235 ? `${firstSentence.slice(0, 232).trim()}...` : firstSentence;
}

function tokenize(text) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "are",
    "you",
    "your",
    "has",
    "have",
    "will",
    "its",
    "into",
    "over",
    "after",
    "about",
    "more",
    "says",
    "new",
    "australia",
    "australian"
  ]);
  return new Set(
    cleanText(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stop.has(token))
  );
}

function filterUsefulWithinWindow(articles, hours, categoryId) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return articles.filter((article) => {
    const titleAndSummary = `${article.title} ${article.summary}`;
    const publishedMs = new Date(article.publishedAt).valueOf();
    if (publishedMs < cutoff) return false;
    if (lowSignalPatterns.some((pattern) => pattern.test(titleAndSummary))) return false;
    if (!isRelevantToCategory(article, categoryId)) return false;
    return true;
  });
}

function isRelevantToCategory(article, categoryId) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const tests = {
    tech: /\b(tech|technology|software|hardware|platform|device|app|apple|google|meta|microsoft|amazon|tesla|ev|startup|chip|semiconductor|security|cyber|space|science|robot|quantum)\b/,
    ai: /\b(ai|artificial intelligence|model|models|llm|openai|anthropic|gemini|deepmind|machine learning|neural|agent|agents|chip|nvidia|training|inference)\b/,
    finance: /\b(stock|stocks|market|markets|asx|wall street|ftse|nasdaq|s&p|dow|inflation|rate|rates|rba|fed|central bank|bond|bonds|yield|oil|gold|earnings|revenue|profit|tariff|gdp|economy|economic|investor|trader|bank|finance|financial)\b/,
    crypto: /\b(bitcoin|btc|ether|ethereum|crypto|cryptocurrency|blockchain|stablecoin|token|tokens|defi|nft|coinbase|binance|coindesk|cointelegraph|decrypt|solana|xrp|dogecoin|on-chain|wallet)\b/,
    world: /\b(war|conflict|trump|china|russia|ukraine|iran|israel|gaza|europe|united states|us |u.s.|un |nato|election|president|prime minister|minister|diplomacy|climate|court|sanction|tariff|border|military|strike|attack|peace|summit|government)\b/,
    australia: /\b(australia|australian|sydney|melbourne|brisbane|perth|adelaide|canberra|tasmania|queensland|victoria|nsw|act|federal|albanese|parliament|rba|reserve bank|asx|labor|coalition|greens|one nation|pacific)\b/
  };
  return tests[categoryId]?.test(text) ?? true;
}

function dedupeIntoEvents(articles) {
  const clusters = [];

  for (const article of articles) {
    const match = clusters.find((cluster) => isSameEvent(article, cluster[0]));
    if (match) {
      match.push(article);
    } else {
      clusters.push([article]);
    }
  }

  return clusters;
}

function isSameEvent(a, b) {
  const similarity = jaccard(a.tokens, b.tokens);
  const titleA = normalizeHeadline(a.title);
  const titleB = normalizeHeadline(b.title);
  return similarity >= 0.42 || titleA.includes(titleB) || titleB.includes(titleA);
}

function normalizeHeadline(title) {
  return cleanText(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function selectBestStory(cluster, categoryId) {
  const ranked = cluster
    .map((article) => ({ ...article, score: scoreArticle(article, categoryId, cluster.length) }))
    .sort((a, b) => b.score - a.score);
  const primary = ranked[0];

  return {
    ...primary,
    secondarySources: ranked
      .slice(1, 4)
      .filter((story) => story.source !== primary.source)
      .map((story) => ({ name: story.source, url: story.url }))
  };
}

function scoreArticle(article, categoryId, clusterSize) {
  const ageHours = (Date.now() - new Date(article.publishedAt).valueOf()) / 36e5;
  const recency = Math.max(0, 24 - ageHours) * 1.5;
  const sourceBoost = sourceWeight(article.source);
  const impact = [...article.tokens].filter((token) => impactTerms.has(token)).length * 5;
  const clusterBoost = Math.min(clusterSize, 4) * 8;
  const australiaPenalty =
    categoryId === "australia" && !hasNationalSignal(article) ? -12 : 0;
  return recency + sourceBoost + impact + clusterBoost + australiaPenalty;
}

function sourceWeight(source) {
  const weights = {
    "BBC": 16,
    "Financial Times": 16,
    "NY Times": 15,
    "The Guardian World": 14,
    "ABC News": 14,
    "MIT Tech Review": 13,
    "Ars Technica": 12,
    "The Verge": 12,
    "CNBC": 12,
    "Reserve Bank of Australia": 12,
    "CoinDesk": 11,
    "TechCrunch": 10,
    "Wired": 10
  };
  return weights[source] || 8;
}

function hasNationalSignal(article) {
  const signal = `${article.title} ${article.summary}`.toLowerCase();
  return /\b(federal|national|rba|reserve bank|albanese|parliament|high court|asx|interest rate|defence|china|pacific|climate|budget|election)\b/.test(
    signal
  );
}

function isDuplicateAcrossCategories(story, seen) {
  return seen.some((existing) => isSameEvent(story, existing));
}

function publicStory(story) {
  return {
    title: story.title,
    source: story.source,
    summary: story.summary,
    url: story.url,
    publishedAt: story.publishedAt,
    secondarySources: story.secondarySources || []
  };
}

function getSectionStatus(category, rankedStories, feedFailures) {
  const failedSources = feedFailures.filter((failure) => failure.category === category.label).length;
  const totalSources = category.sources.length;

  if (failedSources === totalSources) {
    return {
      level: "error",
      title: "This section did not update",
      message: "All feeds for this section failed during the latest generation run."
    };
  }

  if (rankedStories.length === 0) {
    return {
      level: "warning",
      title: "No strong stories found",
      message: "The generator could not find enough relevant, fresh items for this section."
    };
  }

  if (failedSources > 0) {
    return {
      level: "warning",
      title: "Reduced source coverage",
      message: "Some feeds failed, so this section may be missing a few stories."
    };
  }

  return { level: "ok" };
}

function formatSydneyDate(date) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatSydneyDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function readPreviousArchive() {
  try {
    const existing = JSON.parse(await fs.readFile(DATA_PATH, "utf8"));
    if (Array.isArray(existing.archive)) return existing.archive;
    if (existing.dateKey && Array.isArray(existing.sections)) return [stripArchive(existing)];
  } catch {
    return [];
  }
  return [];
}

function mergeRollingArchive(previousArchive, todayBriefing) {
  const byDate = new Map();
  byDate.set(todayBriefing.dateKey, stripArchive(todayBriefing));

  for (const briefing of previousArchive) {
    if (!briefing?.dateKey || !Array.isArray(briefing.sections)) continue;
    if (!byDate.has(briefing.dateKey)) byDate.set(briefing.dateKey, stripArchive(briefing));
  }

  return [...byDate.values()]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, ARCHIVE_DAYS_TO_KEEP)
    .map((briefing, index) => ({
      ...briefing,
      relativeLabel: index === 0 ? "Today" : index === 1 ? "Yesterday" : "Two days ago"
    }));
}

function stripArchive(briefing) {
  const { archive, ...rest } = briefing;
  return rest;
}

function printLog(log) {
  console.log("First Light generation log");
  console.log(`Feeds succeeded: ${log.feedsSucceeded.length}`);
  console.log(`Feeds failed: ${log.feedsFailed.length}`);
  for (const failure of log.feedsFailed) {
    console.log(`- FAILED ${failure.category} / ${failure.source}: ${failure.reason}`);
  }
  console.log("Articles found per category:");
  for (const [category, count] of Object.entries(log.articlesFoundPerCategory)) {
    console.log(`- ${category}: ${count}`);
  }
  console.log("Event clusters after dedupe:");
  for (const [category, count] of Object.entries(log.eventClustersAfterDedupe)) {
    console.log(`- ${category}: ${count}`);
  }
  console.log(`Archive entries kept: ${log.archiveEntriesKept}`);
  console.log(`Archive entries removed: ${log.archiveEntriesRemoved}`);
  for (const warning of log.warnings) console.log(`Warning: ${warning}`);
  console.log(`Output generated successfully: ${log.outputGeneratedSuccessfully}`);
  console.log(`Log artifact: ${LOG_PATH}`);
}

main().catch(async (error) => {
  const failedLog = {
    completedAt: new Date().toISOString(),
    outputGeneratedSuccessfully: false,
    error: error.stack || error.message
  };
  await fs.writeFile(LOG_PATH, `${JSON.stringify(failedLog, null, 2)}\n`).catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
