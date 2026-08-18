"use client";

import { createContext, useContext, useMemo } from "react";

// Which TMS `booking_tags.id` values an admin has designated as "generator" tags
// (docs/DECISIONS.md — tag categories). A plain Set, not a catalogue-with-fallback like
// status/tags: there's no separate label/colour of our own to fall back to — a generator
// tag's name/colour always come from the live tag catalogue (useTagCatalog), this context
// only answers "is this tag id one of them".
const GeneratorTagIdsContext = createContext<Set<number> | null>(null);

export function GeneratorTagIdsProvider({
  tagIds,
  children,
}: {
  tagIds: number[];
  children: React.ReactNode;
}) {
  const set = useMemo(() => new Set(tagIds), [tagIds]);
  return <GeneratorTagIdsContext.Provider value={set}>{children}</GeneratorTagIdsContext.Provider>;
}

export function useGeneratorTagIds(): Set<number> {
  const ctx = useContext(GeneratorTagIdsContext);
  if (!ctx) throw new Error("useGeneratorTagIds must be used within a GeneratorTagIdsProvider");
  return ctx;
}
