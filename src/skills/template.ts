export function renderSkillTemplate(template: string, args: string[]): string {
  const joinedArgs = args.join(' ').trim();
  const firstArg = args[0] ?? '';
  return template
    .split('{{args}}').join(joinedArgs)
    .split('{{target}}').join(joinedArgs || firstArg)
    .trim();
}
