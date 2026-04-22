export type SkillSource = 'builtin' | 'file';

export type SkillDefinition = {
  name: string;
  description: string;
  usage?: string;
  source: SkillSource;
  buildPrompt: (args: string[]) => string;
};

export type SkillFileDefinition = {
  name: string;
  description: string;
  usage?: string;
  promptTemplate: string;
};
