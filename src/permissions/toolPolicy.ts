/**
 * Tool permission checker signature
 */
export type CanUseTool = (name: string) => boolean;

/**
 * Default tool policy - allowlist based
 */
export function createDefaultToolPolicy(): CanUseTool {
  // For now, allow all registered tools. This can be extended to support
  // deny rules, MCP server prefixes, etc. in future iterations.
  const allowedTools = new Set<string>();
  const useAllowlist = allowedTools.size > 0;

  return (name: string): boolean => {
    if (useAllowlist) {
      return allowedTools.has(name);
    }
    // No allowlist = allow all by default
    return true;
  };
}
