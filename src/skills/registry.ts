import type { SkillDefinition, SkillFileDefinition } from './types.js';
import { loadFileSkillDefinitions } from './loader.js';
import { renderSkillTemplate } from './template.js';

const builtinSkills: SkillDefinition[] = [
  {
    name: 'explain-code',
    description: 'Explain a file or symbol in concise terms',
    usage: '/skill explain-code <path or topic>',
    source: 'builtin',
    buildPrompt: (args) => {
      const target = args.join(' ').trim();
      return target
        ? `Explain this code clearly and concisely: ${target}`
        : 'Explain a code file or symbol clearly and concisely.';
    },
  },
  {
    name: 'write-tests',
    description: 'Turn a task into test cases',
    usage: '/skill write-tests <feature or file>',
    source: 'builtin',
    buildPrompt: (args) => {
      const target = args.join(' ').trim();
      return target
        ? `Write focused tests for: ${target}`
        : 'Write focused tests for the current code change.';
    },
  },
  {
    name: 'refactor-plan',
    description: 'Draft a small refactor plan',
    usage: '/skill refactor-plan <scope>',
    source: 'builtin',
    buildPrompt: (args) => {
      const target = args.join(' ').trim();
      return target
        ? `Draft a minimal refactor plan for: ${target}`
        : 'Draft a minimal refactor plan for the current area.';
    },
  },
];

function toFileSkill(definition: SkillFileDefinition): SkillDefinition {
  return {
    name: definition.name,
    description: definition.description,
    usage: definition.usage,
    source: 'file',
    buildPrompt: (args) => renderSkillTemplate(definition.promptTemplate, args) || `Use ${definition.name} skill.`,
  };
}

function loadSkills(): SkillDefinition[] {
  const fileSkills = loadFileSkillDefinitions().map(toFileSkill);
  return [...builtinSkills, ...fileSkills];
}

const skills: SkillDefinition[] = loadSkills();

export function listSkills(): SkillDefinition[] {
  return skills.slice();
}

export function buildSkillPrompt(name: string, args: string[]): string | null {
  const skill = skills.find((entry) => entry.name === name);
  if (!skill) {
    return null;
  }
  return skill.buildPrompt(args);
}
