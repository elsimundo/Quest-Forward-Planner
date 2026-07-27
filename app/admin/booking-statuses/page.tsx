import { listBookingStatusesForAdmin } from "@/lib/db/admin-queries";
import { BookingStatusesPanel } from "@/components/admin/booking-statuses-panel";

export const dynamic = "force-dynamic";

export default async function BookingStatusesPage() {
  const statuses = await listBookingStatusesForAdmin();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#333333]">Booking statuses</h1>
      <p className="mt-1 max-w-[640px] text-[13px] text-[#757575]">
        The colour key schedulers pick from on the grid. Add your own statuses, recolour or
        rename them, reorder how they appear, and retire ones you no longer use. Weekend and
        bank-holiday statuses are assigned automatically from the calendar, so they can be
        restyled but not removed.
      </p>

      <BookingStatusesPanel statuses={statuses} />
    </div>
  );
}
