import { buildSkillPrompt, listSkills } from './registry.js';

const ROUTE_KEYWORDS: Array<{ keywords: RegExp; skillName: string }> = [
  { keywords: /\b(explain|explain\s+this|what does this|how does this)\b/i, skillName: 'explain-code' },
  { keywords: /\b(test|tests|testing|spec)\b/i, skillName: 'write-tests' },
  { keywords: /\b(refactor|refactoring|cleanup|simplify)\b/i, skillName: 'refactor-plan' },
];

function findRoutableSkill(input: string): string | null {
  const normalized = input.trim();
  if (normalized.length === 0 || normalized.startsWith('/')) {
    return null;
  }

  const availableNames = new Set(listSkills().map((skill) => skill.name));
  for (const route of ROUTE_KEYWORDS) {
    if (route.keywords.test(normalized) && availableNames.has(route.skillName)) {
      return route.skillName;
    }
  }

  return null;
}

export function routeInputToSkillPrompt(input: string): string | null {
  const skillName = findRoutableSkill(input);
  if (!skillName) {
    return null;
  }

  return buildSkillPrompt(skillName, [input]);
}
