/**
 * Basic DBML to Mermaid converter for rendering DBML diagrams as fallback.
 * This is a simple converter that generates an ER diagram in Mermaid syntax.
 */

export function dbmlToMermaid(dbml: string): string {
  const lines = dbml.split('\n');
  const mermaidLines: string[] = ['erDiagram'];

  let currentTable = '';
  const relationships: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Match Table definitions
    if (trimmed.startsWith('Table')) {
      const match = trimmed.match(/Table\s+(\w+)\s*{/);
      if (match) {
        currentTable = match[1];
      }
    }

    // Match fields with relationships
    if (trimmed.includes('[ref:')) {
      const refMatch = trimmed.match(/(\w+).*\[ref:\s*([><])\s*(\w+)\.(\w+)\]/);
      if (refMatch && currentTable) {
        const [, , direction, refTable] = refMatch;
        const relType =
          direction === '>' ? 'ZeroOrMany' : direction === '<' ? 'ManyToOne' : 'ManyToMany';
        relationships.push(`"${currentTable}" ${relType} "${refTable}" : has`);
      }
    }

    // End of table
    if (trimmed === '}' && currentTable) {
      mermaidLines.push(`  ${currentTable} {}`);
      currentTable = '';
    }
  }

  // Add relationships
  mermaidLines.push(...relationships);

  return mermaidLines.join('\n');
}

/**
 * Basic converter: DBML to Graphviz for alternative rendering.
 */
export function dbmlToGraphviz(dbml: string): string {
  const lines = dbml.split('\n');
  const nodes: string[] = [];
  const edges: string[] = [];

  let currentTable = '';
  const tables = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('Table')) {
      const match = trimmed.match(/Table\s+(\w+)/);
      if (match) {
        currentTable = match[1];
        tables.add(currentTable);
        nodes.push(`  "${currentTable}" [shape=box];`);
      }
    }

    if (trimmed.includes('[ref:')) {
      const refMatch = trimmed.match(/\[ref:\s*([><])\s*(\w+)\.(\w+)\]/);
      if (refMatch && currentTable) {
        const [, , refTable] = refMatch;
        if (refTable !== currentTable && tables.has(refTable)) {
          edges.push(`  "${currentTable}" -> "${refTable}";`);
        }
      }
    }

    if (trimmed === '}') {
      currentTable = '';
    }
  }

  return ['digraph {', '  rankdir=LR;', ...nodes, ...edges, '}'].join('\n');
}
