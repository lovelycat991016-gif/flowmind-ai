import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608210001_allow_aliyun_transcript_provider.sql",
);

function readMigration() {
  if (!existsSync(migrationPath)) return "";
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

function allowedProviders(migration: string) {
  const constraint = migration.match(
    /add\s+constraint\s+transcripts_provider_valid\s+check\s*\(\s*provider\s+in\s*\(([^)]*)\)\s*\)/,
  );

  return Array.from(
    constraint?.[1].matchAll(/'([^']+)'/g) ?? [],
    (match) => match[1],
  );
}

describe("Aliyun transcript provider migration", () => {
  it("replaces the existing provider constraint without renaming it", () => {
    const migration = readMigration();

    expect(migration).toContain("alter table public.transcripts");
    expect(migration).toMatch(/drop\s+constraint\s+transcripts_provider_valid/);
    expect(migration).toMatch(/add\s+constraint\s+transcripts_provider_valid/);
    expect(migration.match(/\btranscripts_provider_valid\b/g)).toHaveLength(2);
  });

  it.each(["openai", "aliyun"])("allows the %s provider", (provider) => {
    expect(allowedProviders(readMigration())).toContain(provider);
  });

  it("rejects every provider outside the explicit allowlist", () => {
    expect(allowedProviders(readMigration())).toEqual(["openai", "aliyun"]);
  });

  it("contains no destructive or data-changing statements", () => {
    const migration = readMigration();
    const forbiddenStatements = [
      /\bdrop\s+table\b/,
      /\balter\s+column\b/,
      /\badd\s+column\b/,
      /\bdelete\b/,
      /\bupdate\b/,
      /\btruncate\b/,
    ];

    for (const statement of forbiddenStatements) {
      expect(migration).not.toMatch(statement);
    }
  });
});
