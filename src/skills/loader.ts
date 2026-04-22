import fs from 'node:fs';
import path from 'node:path';
import type { SkillFileDefinition } from './types.js';

const DEFAULT_SKILLS_DIR = path.resolve(process.cwd(), '.claude/skills');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFrontmatterAndBody(source: string): { frontmatter: string; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Missing frontmatter.');
  }

  return {
    frontmatter: match[1],
    body: match[2],
  };
}

function parseFrontmatterValue(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid frontmatter line: ${trimmed}`);
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (!key) {
      throw new Error(`Invalid frontmatter line: ${trimmed}`);
    }
    result[key] = value;
  }

  return result;
}

function readSkillFile(filePath: string): SkillFileDefinition {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = parseFrontmatterAndBody(raw);
  const meta = parseFrontmatterValue(frontmatter);

  if (!isRecord(meta)) {
    throw new Error(`Invalid skill file shape: ${path.basename(filePath)}`);
  }

  const { name, description, usage } = meta;
  const promptTemplate = body.trim();
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Missing skill name in: ${path.basename(filePath)}`);
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new Error(`Missing skill description in: ${path.basename(filePath)}`);
  }
  if (promptTemplate.length === 0) {
    throw new Error(`Missing skill promptTemplate in: ${path.basename(filePath)}`);
  }
  if (usage !== undefined && typeof usage !== 'string') {
    throw new Error(`Invalid skill usage in: ${path.basename(filePath)}`);
  }

  return {
    name: name.trim(),
    description: description.trim(),
    usage: typeof usage === 'string' && usage.trim().length > 0 ? usage.trim() : undefined,
    promptTemplate,
  };
}

export function loadFileSkillDefinitions(skillsDir: string = DEFAULT_SKILLS_DIR): SkillFileDefinition[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const skills: SkillFileDefinition[] = [];
  const names = new Set<string>();

  for (const entry of entries) {
    const filePath = path.join(skillsDir, entry.name);
    const skill = readSkillFile(filePath);
    if (names.has(skill.name)) {
      throw new Error(`Duplicate skill name: ${skill.name}`);
    }
    names.add(skill.name);
    skills.push(skill);
  }

  return skills;
}
