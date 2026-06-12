import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CaretDown,
  NewspaperClipping,
  ShareNetwork,
  SlidersHorizontal,
  X
} from "@phosphor-icons/react";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "@fontsource/geist-mono/latin-500.css";
import "@fontsource/newsreader/latin-600.css";
import "./styles.css";

const emptyBriefing = {
  title: "First Light",
  dateLabel: "Preparing the next briefing",
  sections: []
};

const sectionIntro = {
  tech: "Platforms, devices, science, software, security, and the next-order shifts behind the product cycle.",
  ai: "Models, regulation, research, chips, deployment, and the commercial pressure reshaping the field.",
  finance: "Markets, central banks, macro signals, companies, and the flows that matter before the open.",
  crypto: "Digital assets, regulation, exchanges, protocols, stablecoins, and the risk mood around the chain.",
  world: "Geopolitics, conflict, diplomacy, climate, power, and the global stories setting the day’s context.",
  australia: "Nationally significant Australian politics, policy, business, society, and regional developments."
};

const sectionOrderStorageKey = "daily-news-section-order-v1";

function App() {
  const reduceMotion = useReducedMotion();
  const [archive, setArchive] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [sectionOrder, setSectionOrder] = useState(readStoredSectionOrder);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [status, setStatus] = useState("loading");
  const customiseButtonRef = useRef(null);
  const briefing = archive.find((entry) => entry.dateKey === selectedDateKey) || archive[0] || emptyBriefing;
  const orderedSections = orderSections(briefing.sections || [], sectionOrder);

  useHashScroll(orderedSections.map((section) => section.id).join("|"), selectedDateKey, status);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}news-data.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Briefing unavailable: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const normalizedArchive = normalizeArchive(data);
        setArchive(normalizedArchive);
        setSelectedDateKey(normalizedArchive[0]?.dateKey || null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="page-shell">
      <div className="grain" aria-hidden="true" />
      <ScrollProgress />
      <Hero
        archive={archive}
        briefing={briefing}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        status={status}
      />
      <BriefingNotice status={status} briefing={briefing} />
      <SectionNav
        sections={orderedSections}
        onCustomize={() => setCustomizerOpen(true)}
        customiseButtonRef={customiseButtonRef}
      />
      <SectionCustomizer
        open={customizerOpen}
        sections={orderedSections}
        defaultSections={briefing.sections || []}
        onClose={() => {
          setCustomizerOpen(false);
          window.requestAnimationFrame(() => customiseButtonRef.current?.focus());
        }}
        onMove={(sectionId, direction) => {
          setSectionOrder((currentOrder) => {
            const nextOrder = moveSection(sectionId, direction, briefing.sections || [], currentOrder);
            storeSectionOrder(nextOrder);
            return nextOrder;
          });
        }}
        onReset={() => {
          const nextOrder = (briefing.sections || []).map((section) => section.id);
          storeSectionOrder(nextOrder);
          setSectionOrder(nextOrder);
        }}
      />
      <motion.div
        key={briefing.dateKey || "empty"}
        className="briefing-stack"
        aria-label="Daily briefing sections"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {orderedSections.map((section, index) => (
          <NewsSection key={section.id} section={section} index={index} />
        ))}
      </motion.div>
      <footer className="site-footer">
        <span>First Light</span>
        <span>Generated daily. Latest three briefings retained.</span>
      </footer>
      <BackToTopButton />
    </main>
  );
}

function useHashScroll(sectionSignature, selectedDateKey, status) {
  useEffect(() => {
    if (status !== "ready" || !sectionSignature) return undefined;

    const scrollToHash = () => {
      const targetId = window.location.hash.slice(1);
      if (!targetId) return;

      const target = document.getElementById(targetId);
      target?.scrollIntoView({ block: "start" });
    };

    window.requestAnimationFrame(scrollToHash);
    const settleTimer = window.setTimeout(scrollToHash, 350);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [sectionSignature, selectedDateKey, status]);
}

function readStoredSectionOrder() {
  try {
    const storedValue = window.localStorage.getItem(sectionOrderStorageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function storeSectionOrder(order) {
  try {
    window.localStorage.setItem(sectionOrderStorageKey, JSON.stringify(order));
  } catch {
    // Section ordering is a convenience preference, so storage failures can be ignored.
  }
}

function normalizeSectionOrder(sections, storedOrder = []) {
  const sectionIds = sections.map((section) => section.id);
  const orderedKnownIds = storedOrder.filter((sectionId) => sectionIds.includes(sectionId));
  const missingIds = sectionIds.filter((sectionId) => !orderedKnownIds.includes(sectionId));
  return [...orderedKnownIds, ...missingIds];
}

function orderSections(sections, storedOrder) {
  const normalizedOrder = normalizeSectionOrder(sections, storedOrder);
  return [...sections].sort((first, second) => (
    normalizedOrder.indexOf(first.id) - normalizedOrder.indexOf(second.id)
  ));
}

function moveSection(sectionId, direction, sections, storedOrder) {
  const nextOrder = normalizeSectionOrder(sections, storedOrder);
  const currentIndex = nextOrder.indexOf(sectionId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) {
    return nextOrder;
  }

  const [movedSection] = nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, movedSection);
  return nextOrder;
}

function displayText(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&ldquo;|&#8220;|&#x201c;/gi, "\"")
    .replace(/&rdquo;|&#8221;|&#x201d;/gi, "\"")
    .replace(/&lsquo;|&#8216;|&#x2018;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "'")
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "-")
    .replace(/&mdash;|&#8212;|&#x2014;/gi, "-")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([\da-f]+);/gi, (_, codePoint) => String.fromCodePoint(parseInt(codePoint, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function ScrollProgress() {
  const progressRef = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    const updateProgress = () => {
      if (rafId.current) return;

      rafId.current = window.requestAnimationFrame(() => {
        const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress = scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0;
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, nextProgress))})`;
        }
        rafId.current = null;
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span ref={progressRef} />
    </div>
  );
}

function BriefingNotice({ status, briefing }) {
  const reduceMotion = useReducedMotion();
  const sectionWarnings = (briefing.sections || []).filter(
    (section) => section.status?.level === "warning" || section.status?.level === "error"
  );
  const isLatestBriefing = briefing.relativeLabel === "Today";
  const isStale = status === "ready" && isLatestBriefing && briefing.dateKey && briefing.dateKey !== getSydneyDateKey();

  if (status !== "error" && !isStale && sectionWarnings.length === 0) return null;

  const title =
    status === "error"
      ? "Briefing failed to load"
      : isStale
        ? "Today’s briefing has not landed yet"
        : "Some sections may be incomplete";
  const message =
    status === "error"
      ? "The site could not load the latest briefing data. Try refreshing in a moment."
      : isStale
        ? `The newest available briefing is ${briefing.dateLabel}. The daily generator may still be running or may have failed.`
        : `${sectionWarnings.length} section${sectionWarnings.length === 1 ? "" : "s"} reported reduced coverage during the latest run.`;

  return (
    <motion.aside
      className="briefing-notice"
      role={status === "error" || isStale ? "alert" : "status"}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <span>Update status</span>
        <strong>{title}</strong>
      </div>
      <p>{message}</p>
    </motion.aside>
  );
}

function getSydneyDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function normalizeArchive(data) {
  const source = Array.isArray(data.archive) && data.archive.length > 0 ? data.archive : [data];
  return source
    .filter((entry) => Array.isArray(entry.sections))
    .map((entry, index) => ({
      ...entry,
      dateKey: entry.dateKey || entry.generatedAt || String(index),
      relativeLabel: entry.relativeLabel || (index === 0 ? "Today" : index === 1 ? "Yesterday" : "Two days ago")
    }))
    .sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)))
    .slice(0, 3)
    .map((entry, index) => ({
      ...entry,
      relativeLabel: index === 0 ? "Today" : index === 1 ? "Yesterday" : "Two days ago"
    }));
}

function Hero({ archive, briefing, selectedDateKey, onSelectDate, status }) {
  const reduceMotion = useReducedMotion();
  const hasArchive = archive.length > 1;

  return (
    <header className="masthead">
      <motion.div
        className="masthead-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="eyebrow">Morning intelligence</div>
        <h1>First Light</h1>
        <p>
          A daily briefing across technology, AI, markets, crypto, world affairs, and Australia.
        </p>
      </motion.div>

      <motion.aside
        className="briefing-plate"
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <DateDeck
          archive={archive}
          briefing={briefing}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          status={status}
        />
      </motion.aside>
      {hasArchive && (
        <motion.p
          className="date-deck-hint"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          Swipe or scroll the date card for the past two briefings.
        </motion.p>
      )}
    </header>
  );
}

function DateDeck({ archive, briefing, selectedDateKey, onSelectDate, status }) {
  const reduceMotion = useReducedMotion();
  const deckRef = useRef(null);
  const entries = archive.length > 0 ? archive : [briefing];
  const selectedIndex = Math.max(0, entries.findIndex((entry) => entry.dateKey === selectedDateKey));
  const hasMultipleDates = entries.length > 1;

  useEffect(() => {
    if (!hasMultipleDates) return undefined;
    const deck = deckRef.current;
    if (!deck) return undefined;

    const selectedCard = deck.querySelector(`[data-date-key="${selectedDateKey}"]`);
    selectedCard?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
    return undefined;
  }, [hasMultipleDates, selectedDateKey, reduceMotion]);

  useEffect(() => {
    if (!hasMultipleDates) return undefined;
    const deck = deckRef.current;
    if (!deck) return undefined;

    let settleTimer = null;
    const selectNearestCard = () => {
      const deckCenter = deck.getBoundingClientRect().left + deck.clientWidth / 2;
      const cards = [...deck.querySelectorAll(".date-deck-card")];
      const nearest = cards.reduce((best, card) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - deckCenter);
        return distance < best.distance ? { card, distance } : best;
      }, { card: null, distance: Infinity }).card;

      const nextDateKey = nearest?.dataset.dateKey;
      if (nextDateKey && nextDateKey !== selectedDateKey) onSelectDate(nextDateKey);
    };

    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(selectNearestCard, 120);
    };

    deck.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settleTimer);
      deck.removeEventListener("scroll", onScroll);
    };
  }, [hasMultipleDates, selectedDateKey, onSelectDate]);

  return (
    <div className={hasMultipleDates ? "date-deck" : "date-deck single"} aria-label="Briefing dates">
      <div className="date-deck-track" role={hasMultipleDates ? "list" : undefined} ref={deckRef}>
        {entries.map((entry, index) => {
          const selected = entry.dateKey ? entry.dateKey === selectedDateKey : index === 0;
          const distance = Math.abs(index - selectedIndex);
          const totalStories = getStoryCount(entry);

          return (
            <button
              key={entry.dateKey || "empty-briefing"}
              type="button"
              className="date-deck-card plate-inner"
              data-date-key={entry.dateKey || ""}
              aria-pressed={selected}
              onClick={() => entry.dateKey && onSelectDate(entry.dateKey)}
              disabled={!hasMultipleDates}
              style={{
                "--date-depth": distance,
                "--date-scale": selected ? 1 : 0.96,
                "--date-opacity": selected ? 1 : 0.7
              }}
            >
              <span className="plate-kicker">{entry.relativeLabel || "Today"}</span>
              <strong>{selected ? entry.dateLabel : compactDate(entry.dateLabel)}</strong>
              <span>{status === "ready" ? `${totalStories} stories scanned` : "Loading briefing"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getStoryCount(briefing) {
  return (briefing.sections || []).reduce(
    (count, section) => count + (section.leadStories?.length || 0) + (section.moreHeadlines?.length || 0),
    0
  );
}

function compactDate(dateLabel = "") {
  return dateLabel.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+/i, "");
}

function SectionNav({ sections, onCustomize, customiseButtonRef }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="section-nav-shell">
      <nav className="section-nav" aria-label="Briefing sections">
        {sections.map((section, index) => (
          <motion.a
            key={section.id}
            href={`#${section.id}`}
            style={{ "--accent": section.accent }}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span />
            {section.label}
          </motion.a>
        ))}
      </nav>
      <motion.button
        ref={customiseButtonRef}
        type="button"
        className="customize-sections-button"
        onClick={onCustomize}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 + sections.length * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        Customise
      </motion.button>
    </div>
  );
}

function SectionCustomizer({ open, sections, defaultSections, onClose, onMove, onReset }) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const focusFirstControl = () => {
      dialog?.querySelector(focusableSelector)?.focus();
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusableControls = [...dialog.querySelectorAll(focusableSelector)];
      if (focusableControls.length === 0) return;

      const firstControl = focusableControls[0];
      const lastControl = focusableControls[focusableControls.length - 1];

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    };

    window.requestAnimationFrame(focusFirstControl);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      className="section-customizer-backdrop"
      role="presentation"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        ref={dialogRef}
        className="section-customizer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-customizer-title"
        initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="customizer-header">
          <div>
            <span>Personal order</span>
            <h2 id="section-customizer-title">Customise sections</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close section customizer" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <ol className="section-order-list">
          {sections.map((section, index) => (
            <li key={section.id} style={{ "--accent": section.accent }}>
              <span className="order-marker" aria-hidden="true" />
              <span className="order-label">{section.label}</span>
              <div className="order-controls" aria-label={`Move ${section.label}`}>
                <button
                  type="button"
                  aria-label={`Move ${section.label} up`}
                  onClick={() => onMove(section.id, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${section.label} down`}
                  onClick={() => onMove(section.id, 1)}
                  disabled={index === sections.length - 1}
                >
                  <ArrowDown size={17} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="customizer-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={onReset}
            disabled={sections.map((section) => section.id).join("|") === defaultSections.map((section) => section.id).join("|")}
          >
            Reset
          </button>
          <button type="button" className="primary-action" onClick={onClose}>
            Done
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function NewsSection({ section, index }) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const leadStories = section.leadStories || [];
  const moreHeadlines = section.moreHeadlines || [];
  const previewHeadlines = moreHeadlines.slice(0, 1);

  return (
    <motion.section
      id={section.id}
      className="news-section"
      style={{ "--accent": section.accent }}
      initial={reduceMotion ? false : { opacity: 0, y: 54 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-heading">
        <div>
          <span className="section-count">{String(index + 1).padStart(2, "0")}</span>
          <h2>{section.label}</h2>
        </div>
        <p>{sectionIntro[section.id]}</p>
      </div>

      {(section.status?.level === "warning" || section.status?.level === "error") && (
        <div className="section-warning" role={section.status.level === "error" ? "alert" : "status"}>
          <strong>{section.status.title}</strong>
          <span>{section.status.message}</span>
        </div>
      )}

      {leadStories.length > 0 ? (
        <div className="lead-grid">
          {leadStories.map((story, storyIndex) => (
            <StoryCard
              key={`${story.url}-${storyIndex}`}
              story={story}
              featured={storyIndex === 0}
              index={storyIndex}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {moreHeadlines.length > 0 && (
        <div className="more-shell">
          <button
            type="button"
            className="more-toggle"
            aria-expanded={expanded}
            aria-controls={`${section.id}-more`}
            onClick={() => setExpanded((current) => !current)}
          >
            <span>
              More Headlines
              <small>Expand the rest of this section</small>
            </span>
            <span className="toggle-count">{moreHeadlines.length}</span>
            <CaretDown weight="bold" aria-hidden="true" />
          </button>

          {!expanded && previewHeadlines.length > 0 && (
            <ul className="more-preview" aria-label={`Preview headlines for ${section.label}`}>
              {previewHeadlines.map((story, previewIndex) => (
                <li key={`${story.url}-preview-${previewIndex}`}>
                  <a href={story.url} target="_blank" rel="noreferrer">
                    <span>{displayText(story.title)}</span>
                    <small>{displayText(story.source)}</small>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <motion.div
            id={`${section.id}-more`}
            className="more-list"
            initial={false}
            animate={expanded ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 }
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul>
              {moreHeadlines.map((story, moreIndex) => (
                <li key={`${story.url}-${moreIndex}`}>
                  <a href={story.url} target="_blank" rel="noreferrer">
                    <span>{displayText(story.title)}</span>
                    <small>{displayText(story.source)}</small>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}

function StoryCard({ story, featured, index }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className={featured ? "story-card featured" : "story-card"}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className="story-share"
        aria-label={`Share ${displayText(story.title)}`}
        onClick={() => shareStory(story)}
      >
        <ShareNetwork size={17} aria-hidden="true" />
      </button>
      <a href={story.url} target="_blank" rel="noreferrer" className="story-link">
        <div className="story-topline">
          <span className="story-source">{story.source}</span>
          <span className="story-freshness">{formatFreshness(story.publishedAt)}</span>
          <ArrowUpRight aria-hidden="true" />
        </div>
        <h3>{displayText(story.title)}</h3>
        <p>{displayText(story.summary)}</p>
        {story.secondarySources?.length > 0 && (
          <div className="secondary-sources">
            Also: {story.secondarySources.map((source) => displayText(source.name)).join(", ")}
          </div>
        )}
      </a>
    </motion.article>
  );
}

async function shareStory(story) {
  const shareData = {
    title: displayText(story.title),
    text: displayText(story.summary),
    url: story.url
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData) !== false) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }

  await navigator.clipboard?.writeText(story.url);
}

function formatFreshness(publishedAt) {
  if (!publishedAt) return "Recent";

  const published = new Date(publishedAt);
  if (Number.isNaN(published.valueOf())) return "Recent";

  const diffMinutes = Math.max(0, Math.round((Date.now() - published.valueOf()) / 60000));
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return published.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short"
  });
}

function EmptyState() {
  return (
    <div className="empty-state">
      <NewspaperClipping size={24} aria-hidden="true" />
      <span>No strong stories made the cut for this section yet.</span>
    </div>
  );
}

function BackToTopButton() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [wobble, setWobble] = useState(0);
  const lastWobbleAt = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafId.current) return;

      rafId.current = window.requestAnimationFrame(() => {
        const shouldShow = window.scrollY > 520;
        setVisible(shouldShow);

        const now = Date.now();
        if (shouldShow && !reduceMotion && now - lastWobbleAt.current > 260) {
          lastWobbleAt.current = now;
          setWobble((value) => value + 1);
        }

        rafId.current = null;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, [reduceMotion]);

  return (
    <motion.button
      type="button"
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
      initial={false}
      animate={
        reduceMotion
          ? { opacity: visible ? 1 : 0, y: visible ? 0 : 12, pointerEvents: visible ? "auto" : "none" }
          : {
              opacity: visible ? 1 : 0,
              y: visible ? 0 : 16,
              scale: visible ? [1, 1.06, 0.98, 1.03, 1] : 0.94,
              rotate: visible ? [0, -5, 4, -2, 0] : 0,
              pointerEvents: visible ? "auto" : "none"
            }
      }
      transition={
        reduceMotion
          ? { duration: 0.2 }
          : {
              opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              rotate: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
      }
      key={`back-to-top-${wobble}`}
      whileHover={reduceMotion ? undefined : { y: -7, scale: 1.04 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
    >
      <ArrowUp size={20} weight="bold" aria-hidden="true" />
    </motion.button>
  );
}

createRoot(document.getElementById("root")).render(<App />);
