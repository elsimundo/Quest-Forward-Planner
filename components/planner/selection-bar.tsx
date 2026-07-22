export function SelectionBar({ count, onClear }: { count: number; onClear: () => void }) {
  if (!count) return null;
  return (
    <div className="flex shrink-0 items-center gap-3.5 bg-[#1a3d69] px-6 py-2.5 text-[13px] text-white">
      <span className="font-bold">
        {count} booking{count > 1 ? "s" : ""} selected
      </span>
      <span className="font-light text-white/75">
        Drag to move the whole set — green means free; red means a clash and you&apos;ll be
        asked to swap or overwrite. Click a selected booking to unselect it.
      </span>
      <span className="flex-1" />
      {/* "Publish selected" lands with the publish/lock workflow (slice 6, SPEC.md §2b) */}
      <button
        onClick={onClear}
        className="rounded-full border border-white/40 px-3.5 py-1.5 text-xs text-white transition-colors hover:bg-white/10"
      >
        Clear selection (Esc)
      </button>
    </div>
  );
}
