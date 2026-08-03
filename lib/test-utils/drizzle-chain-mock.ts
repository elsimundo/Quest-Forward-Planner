// Minimal stand-in for a Drizzle query-builder chain, for unit tests that mock "@/lib/db"
// entirely rather than hitting a real database. Every chain method (from/where/values/set)
// returns the same node, and the node itself is thenable so `await` resolves to `result`
// whether the call site terminates the chain with `.limit()`/`.returning()` or awaits the
// chain directly (e.g. `await db.update(...).set(...).where(...)`).
export function makeChain(result: unknown): Record<string, unknown> {
  const node: Record<string, unknown> = {
    from: () => node,
    where: () => node,
    values: () => node,
    set: () => node,
    limit: () => Promise.resolve(result),
    returning: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return node;
}
