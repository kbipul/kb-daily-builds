import { useMemo } from "react";
import type { VNode } from "../lib/types";
import { FILESYSTEM } from "../data/fixtures";

/** The checkout, with every doomed path struck through. Seeing the tree burn is the point. */
export function FileTree({ doomed }: { doomed: Set<string> }) {
  const root = useMemo(() => findCheckout(FILESYSTEM), []);
  if (!root) return null;
  return (
    <section className="panel">
      <h2>
        The machine <span className="count">virtual — nothing on your disk is touched</span>
      </h2>
      <div className="tree" role="tree" aria-label="Simulated filesystem">
        <Branch node={root} path="/home/dev/checkout" doomed={doomed} depth={0} />
      </div>
    </section>
  );
}

function findCheckout(root: VNode): VNode | null {
  const home = root.children?.find((c) => c.name === "home");
  const dev = home?.children?.find((c) => c.name === "dev");
  return dev?.children?.find((c) => c.name === "checkout") ?? null;
}

function Branch({
  node,
  path,
  doomed,
  depth,
}: {
  node: VNode;
  path: string;
  doomed: Set<string>;
  depth: number;
}) {
  const hit = doomed.has(path);
  const children = node.children ?? [];
  return (
    <>
      <div
        className={`tree__row${hit ? " tree__row--doomed" : ""}`}
        style={{ paddingLeft: `${depth * 14}px` }}
        role="treeitem"
        aria-selected={hit}
      >
        <span className="tree__icon">{node.type === "dir" ? "▸" : "·"}</span>
        <span className="tree__name">{node.name || "/"}</span>
        {node.secret && <span className="tree__badge tree__badge--secret">secret</span>}
        {node.regenerable && <span className="tree__badge">rebuildable</span>}
        {node.modified && <span className="tree__badge tree__badge--dirty">uncommitted</span>}
        {!node.gitTracked && !node.gitIgnored && !node.regenerable && node.type === "file" && (
          <span className="tree__badge tree__badge--untracked">untracked</span>
        )}
      </div>
      {/* Collapse node_modules: 40k files is noise, and the point is made by the folder. */}
      {node.name !== "node_modules" &&
        children.map((child) => (
          <Branch
            key={child.name}
            node={child}
            path={`${path}/${child.name}`}
            doomed={doomed}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
