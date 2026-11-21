import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasSlotConflict, listBookings } from '@/lib/bookings-service';
import { VALID_ITEMS, VALID_SLOTS, isValidStatus } from '@/lib/booking-constants';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(id || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'ID tempahan tidak sah.' }, { status: 400 });
    }

    const existing = await prisma.tempahan.findUnique({
      where: { id: cleanId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: `Rekod dengan ID "${cleanId}" tidak ditemui.` },
        { status: 404 }
      );
    }

    const body = await request.json();

    const nama_pemohon =
      body?.nama_pemohon !== undefined
        ? String(body.nama_pemohon).trim()
        : existing.nama_pemohon;
    const item_tempahan =
      body?.item_tempahan !== undefined
        ? String(body.item_tempahan).trim()
        : existing.item_tempahan;
    const tarikh =
      body?.tarikh !== undefined ? String(body.tarikh).trim() : existing.tarikh;
    const slot_masa =
      body?.slot_masa !== undefined
        ? String(body.slot_masa).trim()
        : existing.slot_masa;
    const status =
      body?.status !== undefined ? String(body.status).trim() : existing.status;

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
    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: 'Status tempahan tidak sah.' },
        { status: 400 }
      );
    }

    if (status !== 'Ditolak') {
      const conflict = await hasSlotConflict(item_tempahan, tarikh, slot_masa, cleanId);
      if (conflict) {
        return NextResponse.json(
          {
            error:
              'Slot masa ini telah mempunyai tempahan aktif lain untuk item dan tarikh tersebut.',
          },
          { status: 409 }
        );
      }
    }

    await prisma.tempahan.update({
      where: { id: cleanId },
      data: {
        nama_pemohon,
        item_tempahan,
        tarikh,
        slot_masa,
        status,
      },
    });

    const data = await listBookings();
    return NextResponse.json({
      updatedId: cleanId,
      newStatus: status,
      bookings: data.bookings,
      today: data.today,
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      { error: 'Gagal mengemas kini rekod tempahan.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = decodeURIComponent(id || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'ID tempahan tidak sah.' }, { status: 400 });
    }

    const existing = await prisma.tempahan.findUnique({
      where: { id: cleanId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: `Rekod dengan ID "${cleanId}" tidak ditemui.` },
        { status: 404 }
      );
    }

    await prisma.tempahan.delete({
      where: { id: cleanId },
    });

    const data = await listBookings();
    return NextResponse.json({
      deletedId: cleanId,
      bookings: data.bookings,
      today: data.today,
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      { error: 'Gagal memadam rekod tempahan.' },
      { status: 500 }
    );
  }
}
