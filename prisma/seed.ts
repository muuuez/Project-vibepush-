import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getOffsetISODate(offsetDays = 0): string {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(target);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

async function main() {
  const today = getOffsetISODate(0);
  const tomorrow = getOffsetISODate(1);
  const dayPlusTwo = getOffsetISODate(2);
  const yesterday = getOffsetISODate(-1);

  const seedRows = [
    {
      id: 'TMP-1001A1B2',
      nama_pemohon: 'Ahmad Faiz bin Ismail',
      item_tempahan: 'Bilik Perbincangan 1',
      tarikh: today,
      slot_masa: '8:00-10:00',
      status: 'Diluluskan',
    },
    {
      id: 'TMP-1002C3D4',
      nama_pemohon: 'Nurul Aina binti Zulkifli',
      item_tempahan: 'Makmal Komputer 1',
      tarikh: today,
      slot_masa: '10:00-12:00',
      status: 'Menunggu',
    },
    {
      id: 'TMP-1003E5F6',
      nama_pemohon: 'Muhammad Haziq bin Razak',
      item_tempahan: 'Kamera DSLR',
      tarikh: today,
      slot_masa: '14:00-16:00',
      status: 'Menunggu',
    },
    {
      id: 'TMP-1004G7H8',
      nama_pemohon: 'Tan Wei Ming',
      item_tempahan: 'Bola Futsal',
      tarikh: today,
      slot_masa: '16:00-18:00',
      status: 'Diluluskan',
    },
    {
      id: 'TMP-1005J9K0',
      nama_pemohon: 'Kavitha a/p Subramaniam',
      item_tempahan: 'Bilik Perbincangan 2',
      tarikh: tomorrow,
      slot_masa: '8:00-10:00',
      status: 'Menunggu',
    },
    {
      id: 'TMP-1006L1M2',
      nama_pemohon: 'Siti Nurhaliza binti Roslan',
      item_tempahan: 'Tripod',
      tarikh: tomorrow,
      slot_masa: '10:00-12:00',
      status: 'Diluluskan',
    },
    {
      id: 'TMP-1007N3P4',
      nama_pemohon: 'Amirul Hakim bin Yusof',
      item_tempahan: 'Makmal Komputer 2',
      tarikh: dayPlusTwo,
      slot_masa: '14:00-16:00',
      status: 'Ditolak',
    },
    {
      id: 'TMP-1008Q5R6',
      nama_pemohon: 'Lim Jia Yi',
      item_tempahan: 'Raket Badminton',
      tarikh: dayPlusTwo,
      slot_masa: '16:00-18:00',
      status: 'Menunggu',
    },
    {
      id: 'TMP-1009S7T8',
      nama_pemohon: 'Farah Nadia binti Azman',
      item_tempahan: 'Bilik Perbincangan 1',
      tarikh: yesterday,
      slot_masa: '10:00-12:00',
      status: 'Diluluskan',
    },
  ];

  for (const row of seedRows) {
    await prisma.tempahan.upsert({
      where: { id: row.id },
      update: {},
      create: row,
    });
  }

  console.log(`Seeded ${seedRows.length} Tempahan records.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
