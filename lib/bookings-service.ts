import { prisma } from '@/lib/prisma';
import {
  BookingRecord,
  BookingStatus,
  VALID_SLOTS,
  getOffsetISODate,
  isValidStatus,
} from '@/lib/booking-constants';

function serializeBooking(row: {
  id: string;
  nama_pemohon: string;
  item_tempahan: string;
  tarikh: string;
  slot_masa: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): BookingRecord {
  return {
    id: row.id,
    nama_pemohon: row.nama_pemohon,
    item_tempahan: row.item_tempahan,
    tarikh: row.tarikh,
    slot_masa: row.slot_masa,
    status: isValidStatus(row.status) ? (row.status as BookingStatus) : 'Menunggu',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBookings(): Promise<{ bookings: BookingRecord[]; today: string }> {
  const rows = await prisma.tempahan.findMany({
    orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
  });

  const bookings = rows.map(serializeBooking).sort((a, b) => {
    if (a.tarikh !== b.tarikh) {
      return b.tarikh.localeCompare(a.tarikh);
    }
    const slotA = VALID_SLOTS.indexOf(a.slot_masa as (typeof VALID_SLOTS)[number]);
    const slotB = VALID_SLOTS.indexOf(b.slot_masa as (typeof VALID_SLOTS)[number]);
    return slotA - slotB;
  });

  return {
    bookings,
    today: getOffsetISODate(0),
  };
}

export async function hasSlotConflict(
  item_tempahan: string,
  tarikh: string,
  slot_masa: string,
  excludeId?: string
): Promise<boolean> {
  const conflict = await prisma.tempahan.findFirst({
    where: {
      item_tempahan,
      tarikh,
      slot_masa,
      status: { not: 'Ditolak' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(conflict);
}
