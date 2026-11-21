export type ItemCategory = 'Ruang' | 'Peralatan';
export type BookingStatus = 'Menunggu' | 'Diluluskan' | 'Ditolak';

export interface BookingRecord {
  id: string;
  nama_pemohon: string;
  item_tempahan: string;
  tarikh: string;
  slot_masa: string;
  status: BookingStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const ITEM_CATEGORIES: Record<string, ItemCategory> = {
  'Bilik Perbincangan 1': 'Ruang',
  'Bilik Perbincangan 2': 'Ruang',
  'Makmal Komputer 1': 'Ruang',
  'Makmal Komputer 2': 'Ruang',
  'Kamera DSLR': 'Peralatan',
  'Tripod': 'Peralatan',
  'Bola Futsal': 'Peralatan',
  'Raket Badminton': 'Peralatan',
};

export const VALID_ITEMS = Object.keys(ITEM_CATEGORIES);

export const ROOM_ITEMS = VALID_ITEMS.filter((item) => ITEM_CATEGORIES[item] === 'Ruang');
export const EQUIPMENT_ITEMS = VALID_ITEMS.filter((item) => ITEM_CATEGORIES[item] === 'Peralatan');

export const VALID_SLOTS = [
  '8:00-10:00',
  '10:00-12:00',
  '14:00-16:00',
  '16:00-18:00',
] as const;

export const VALID_STATUSES: BookingStatus[] = ['Menunggu', 'Diluluskan', 'Ditolak'];

export function getOffsetISODate(offsetDays = 0, timeZone = 'Asia/Kuala_Lumpur'): string {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(target);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate || '-';
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function isValidStatus(status: string): status is BookingStatus {
  return VALID_STATUSES.includes(status as BookingStatus);
}
