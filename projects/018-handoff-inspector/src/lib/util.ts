// Small deterministic helpers shared by parser and analyzer.

/**
 * Canonical JSON: object keys sorted recursively so two structurally-equal
 * values stringify identically. Used to compare tool-call arguments for the
 * duplicated-work detector. Honest by construction — it compares VALUES, and
 * never claims two different payloads are "semantically" the same.
 */
export function canonical(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Stable sort by numeric timestep, preserving original order on ties. */
export function sortByTime<T extends { t: number }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.t - b.item.t) || (a.index - b.index))
    .map(({ item }) => item);
}

/** Directed-cycle detection. Returns a cycle path (node ids) or null. */
export function findCycle(
  nodes: string[],
  edges: Array<[string, string]>
): string[] | null {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node, []);
  for (const [from, to] of edges) {
    if (!adjacency.has(from)) adjacency.set(from, []);
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(from)!.push(to);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of adjacency.keys()) color.set(node, WHITE);
  const stack: string[] = [];

  function visit(node: string): string[] | null {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (color.get(next) === GRAY) {
        // Found a back edge — slice the cycle out of the current stack.
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      if (color.get(next) === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    color.set(node, BLACK);
    stack.pop();
    return null;
  }

  for (const node of adjacency.keys()) {
    if (color.get(node) === WHITE) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return null;
}
