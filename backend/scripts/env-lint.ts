import fs from "node:fs";
import path from "node:path";

type EnvIssue = {
  key: string;
  firstLine: number;
  duplicateLine: number;
};

const ENV_KEY_REGEX = /^([A-Z0-9_]+)=/;

const collectDuplicateKeys = (filePath: string): EnvIssue[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const seen = new Map<string, number>();
  const issues: EnvIssue[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const match = line.match(ENV_KEY_REGEX);
    if (!match) {
      continue;
    }
    const key = match[1];
    const lineNo = idx + 1;
    const first = seen.get(key);
    if (first) {
      issues.push({ key, firstLine: first, duplicateLine: lineNo });
      continue;
    }
    seen.set(key, lineNo);
  }

  return issues;
};

const filesToCheck = [".env.example", ".env"].map((name) => path.resolve(process.cwd(), name));
let hasError = false;

for (const filePath of filesToCheck) {
  const issues = collectDuplicateKeys(filePath);
  if (issues.length === 0) {
    continue;
  }
  hasError = true;
  const rel = path.relative(process.cwd(), filePath) || path.basename(filePath);
  console.error(`[env-lint] Duplicate env keys found in ${rel}:`);
  for (const issue of issues) {
    console.error(
      `  - ${issue.key} (first at line ${issue.firstLine}, duplicate at line ${issue.duplicateLine})`,
    );
  }
}

if (hasError) {
  process.exit(1);
}

console.log("[env-lint] OK");
