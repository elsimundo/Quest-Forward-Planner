export function SelectionBar({
  count,
  publishableCount,
  canPublish,
  onPublish,
  onClear,
}: {
  count: number;
  publishableCount: number;
  canPublish: boolean;
  onPublish: () => void;
  onClear: () => void;
}) {
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
      {canPublish && (
        <button
          onClick={onPublish}
          disabled={publishableCount === 0}
          title={
            publishableCount === 0
              ? "All selected bookings are already published"
              : `Publish ${publishableCount} booking${publishableCount > 1 ? "s" : ""} to TMS`
          }
          className="rounded-full border border-white bg-white px-3.5 py-1.5 text-xs font-medium text-[#1a3d69] transition-opacity enabled:hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
        >
          🔒 Publish selected
        </button>
      )}
      <button
        onClick={onClear}
        className="rounded-full border border-white/40 px-3.5 py-1.5 text-xs text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e88f8f]"
      >
        Clear selection (Esc)
      </button>
    </div>
  );
}
