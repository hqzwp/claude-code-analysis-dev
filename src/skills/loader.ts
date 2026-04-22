import fs from 'node:fs';
import path from 'node:path';
import type { SkillFileDefinition } from './types.js';

const DEFAULT_SKILLS_DIR = path.resolve(process.cwd(), 'skills');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readSkillFile(filePath: string): SkillFileDefinition {
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in skill file: ${path.basename(filePath)}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Invalid skill file shape: ${path.basename(filePath)}`);
  }

  const { name, description, usage, promptTemplate } = parsed;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Missing skill name in: ${path.basename(filePath)}`);
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    throw new Error(`Missing skill description in: ${path.basename(filePath)}`);
  }
  if (typeof promptTemplate !== 'string' || promptTemplate.trim().length === 0) {
    throw new Error(`Missing skill promptTemplate in: ${path.basename(filePath)}`);
  }
  if (usage !== undefined && typeof usage !== 'string') {
    throw new Error(`Invalid skill usage in: ${path.basename(filePath)}`);
  }

  return {
    name: name.trim(),
    description: description.trim(),
    usage: typeof usage === 'string' && usage.trim().length > 0 ? usage.trim() : undefined,
    promptTemplate: promptTemplate.trim(),
  };
}

export function loadFileSkillDefinitions(skillsDir: string = DEFAULT_SKILLS_DIR): SkillFileDefinition[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
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
