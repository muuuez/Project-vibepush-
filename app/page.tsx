import { listBookings } from '@/lib/bookings-service';
import { BookingDashboard } from '@/components/booking-dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { bookings, today } = await listBookings();

  return <BookingDashboard initialBookings={bookings} initialToday={today} />;
}
