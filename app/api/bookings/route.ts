import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasSlotConflict, listBookings } from '@/lib/bookings-service';
import { VALID_ITEMS, VALID_SLOTS } from '@/lib/booking-constants';

export async function GET() {
  try {
    const data = await listBookings();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { error: 'Gagal memuatkan senarai tempahan.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nama_pemohon = String(body?.nama_pemohon ?? '').trim();
    const item_tempahan = String(body?.item_tempahan ?? '').trim();
    const tarikh = String(body?.tarikh ?? '').trim();
    const slot_masa = String(body?.slot_masa ?? '').trim();

    if (nama_pemohon.length < 2) {
      return NextResponse.json(
        { error: 'Sila masukkan nama pemohon yang sah (sekurang-kurangnya 2 aksara).' },
        { status: 400 }
      );
    }
    if (!VALID_ITEMS.includes(item_tempahan)) {
      return NextResponse.json(
        { error: 'Sila pilih item tempahan yang sah.' },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) {
      return NextResponse.json(
        { error: 'Sila pilih tarikh tempahan yang sah.' },
        { status: 400 }
      );
    }
    if (!VALID_SLOTS.includes(slot_masa as (typeof VALID_SLOTS)[number])) {
      return NextResponse.json(
        { error: 'Sila pilih slot masa yang sah.' },
        { status: 400 }
      );
    }

    const conflict = await hasSlotConflict(item_tempahan, tarikh, slot_masa);
    if (conflict) {
      return NextResponse.json(
        { error: 'Slot masa ini telah ditempah untuk item dan tarikh yang dipilih.' },
        { status: 409 }
      );
    }

    const id = `TMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await prisma.tempahan.create({
      data: {
        id,
        nama_pemohon,
        item_tempahan,
        tarikh,
        slot_masa,
        status: 'Menunggu',
      },
    });

    const data = await listBookings();
    return NextResponse.json(
      {
        createdId: id,
        bookings: data.bookings,
        today: data.today,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan tempahan baharu.' },
      { status: 500 }
    );
  }
}
