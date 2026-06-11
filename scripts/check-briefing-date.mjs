import fs from "node:fs";

const DATA_PATH = "public/news-data.json";
const TIMEZONE = "Australia/Sydney";

const currentKey = getSydneyDateKey(new Date());
let existingKey = "";

try {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  existingKey = data.dateKey || data.archive?.[0]?.dateKey || "";
} catch {
  existingKey = "";
}

const fresh = existingKey === currentKey;

console.log(`today=${currentKey}`);
console.log(`existing=${existingKey || "none"}`);
console.log(`fresh=${fresh ? "true" : "false"}`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `today=${currentKey}\nexisting=${existingKey}\nfresh=${fresh ? "true" : "false"}\n`
  );
}

function getSydneyDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}
