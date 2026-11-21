'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  BookingRecord,
  BookingStatus,
  EQUIPMENT_ITEMS,
  ITEM_CATEGORIES,
  ROOM_ITEMS,
  VALID_ITEMS,
  VALID_SLOTS,
  VALID_STATUSES,
  formatDisplayDate,
} from '@/lib/booking-constants';

interface BookingDashboardProps {
  initialBookings: BookingRecord[];
  initialToday: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

export function BookingDashboard({
  initialBookings,
  initialToday,
}: BookingDashboardProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [today, setToday] = useState<string>(initialToday);
  const [filterType, setFilterType] = useState<'Semua' | 'Ruang' | 'Peralatan'>('Semua');
  const [filterItem, setFilterItem] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [formNama, setFormNama] = useState<string>('');
  const [formItem, setFormItem] = useState<string>('');
  const [formTarikh, setFormTarikh] = useState<string>(initialToday);
  const [formSlot, setFormSlot] = useState<string>('');
  const [formStatus, setFormStatus] = useState<BookingStatus>('Menunggu');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<BookingRecord | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastSeqRef = useRef<number>(0);

  const pushToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    toastSeqRef.current += 1;
    const id = `toast-${toastSeqRef.current}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const availableFilterItems = useMemo(() => {
    if (filterType === 'Semua') return VALID_ITEMS;
    return VALID_ITEMS.filter((item) => ITEM_CATEGORIES[item] === filterType);
  }, [filterType]);

  const handleTypeChange = (nextType: 'Semua' | 'Ruang' | 'Peralatan') => {
    setFilterType(nextType);
    if (nextType !== 'Semua' && filterItem !== 'Semua') {
      if (ITEM_CATEGORIES[filterItem] !== nextType) {
        setFilterItem('Semua');
      }
    }
  };

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return bookings.filter((booking) => {
      const category = ITEM_CATEGORIES[booking.item_tempahan];
      if (filterType !== 'Semua' && category !== filterType) {
        return false;
      }
      if (filterItem !== 'Semua' && booking.item_tempahan !== filterItem) {
        return false;
      }
      if (query) {
        const matchesName = booking.nama_pemohon.toLowerCase().includes(query);
        const matchesId = booking.id.toLowerCase().includes(query);
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [bookings, filterType, filterItem, searchTerm]);

  const summary = useMemo(() => {
    const todayCount = bookings.filter((b) => b.tarikh === today).length;
    const pendingCount = bookings.filter((b) => b.status === 'Menunggu').length;
    const approvedCount = bookings.filter((b) => b.status === 'Diluluskan').length;
    return { todayCount, pendingCount, approvedCount };
  }, [bookings, today]);

  const hasActiveFilters =
    filterType !== 'Semua' || filterItem !== 'Semua' || searchTerm.trim() !== '';

  const resetFilters = () => {
    setFilterType('Semua');
    setFilterItem('Semua');
    setSearchTerm('');
  };

  const refreshBookings = async (silent = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/bookings', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuatkan data tempahan.');
      }
      setBookings(data.bookings);
      setToday(data.today);
      if (!silent) {
        pushToast('Senarai tempahan berjaya dikemas kini.');
      }
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Gagal memuatkan data tempahan.',
        'error'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openCreateModal = () => {
    setEditingBooking(null);
    setFormNama('');
    setFormItem('');
    setFormTarikh(today);
    setFormSlot('');
    setFormStatus('Menunggu');
    setIsModalOpen(true);
  };

  const openEditModal = (booking: BookingRecord) => {
    setEditingBooking(booking);
    setFormNama(booking.nama_pemohon);
    setFormItem(booking.item_tempahan);
    setFormTarikh(booking.tarikh);
    setFormSlot(booking.slot_masa);
    setFormStatus(booking.status);
    setIsModalOpen(true);
  };

  const handleSaveBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingBooking);
      const endpoint = isEdit
        ? `/api/bookings/${encodeURIComponent(editingBooking!.id)}`
        : '/api/bookings';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_pemohon: formNama.trim(),
          item_tempahan: formItem,
          tarikh: formTarikh,
          slot_masa: formSlot,
          ...(isEdit ? { status: formStatus } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan tempahan.');
      }

      setBookings(data.bookings);
      setToday(data.today);
      setIsModalOpen(false);
      pushToast(
        isEdit
          ? `Tempahan ${data.updatedId} berjaya dikemas kini.`
          : `Tempahan baharu (${data.createdId}) berjaya ditambah.`
      );
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Gagal menyimpan tempahan.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatus = async (id: string, nextStatus: 'Diluluskan' | 'Ditolak') => {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menukar status tempahan.');
      }

      setBookings(data.bookings);
      setToday(data.today);
      pushToast(`Tempahan ${id} telah ditetapkan kepada "${nextStatus}".`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Gagal menukar status tempahan.',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memadam rekod.');
      }

      setBookings(data.bookings);
      setToday(data.today);
      pushToast(`Tempahan ${data.deletedId} berjaya dipadam.`);
      setDeleteTarget(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Gagal memadam rekod.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status: BookingStatus) => {
    if (status === 'Diluluskan') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Diluluskan
        </span>
      );
    }
    if (status === 'Ditolak') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Menunggu
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg whitespace-nowrap shrink-0">
            Sistem Tempahan Ruang &amp; Peralatan
          </span>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {(['Semua', 'Ruang', 'Peralatan'] as const).map((tab) => {
              const active = filterType === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTypeChange(tab)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'border-teal-700 text-slate-900 font-semibold'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  {tab === 'Semua' ? 'Semua Tempahan' : tab}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Tempahan Baharu</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Page Heading */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
              Pengurusan Tempahan Kampus
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Tempahan bilik perbincangan, makmal komputer serta peralatan studio dan sukan.
            </p>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <section
          aria-label="Ringkasan Tempahan"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-600">Tempahan Hari Ini</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary.todayCount}
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
              Tarikh: {formatDisplayDate(today)}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-600">Permohonan Menunggu</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-amber-700 tabular-nums">
              {summary.pendingCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Menunggu semakan kelulusan admin
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-600">Tempahan Diluluskan</div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {summary.approvedCount}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              Daripada {bookings.length} jumlah rekod
            </div>
          </article>
        </section>

        {/* Main Panel: Filters + Table */}
        <section
          aria-label="Senarai Tempahan"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {/* Filter Toolbar */}
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-3">
                <label
                  htmlFor="filter-type"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Jenis Item
                </label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) =>
                    handleTypeChange(e.target.value as 'Semua' | 'Ruang' | 'Peralatan')
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                >
                  <option value="Semua">Semua Jenis (Ruang &amp; Peralatan)</option>
                  <option value="Ruang">Ruang</option>
                  <option value="Peralatan">Peralatan</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="filter-item"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Item Spesifik
                </label>
                <select
                  id="filter-item"
                  value={filterItem}
                  onChange={(e) => setFilterItem(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                >
                  <option value="Semua">Semua Item</option>
                  {availableFilterItems.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-4">
                <label
                  htmlFor="filter-search"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Carian Nama atau ID
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="filter-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama pemohon atau ID..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 lg:col-span-2 lg:justify-end">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Set Semula
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => refreshBookings(false)}
                  disabled={isRefreshing}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                  title="Muat semula data"
                >
                  <RefreshCw
                    className={`h-4 w-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Segar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Count Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:px-5">
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              {filteredBookings.length} daripada {bookings.length} rekod dipaparkan
            </span>
          </div>

          {/* Loading Skeleton */}
          {isRefreshing && bookings.length === 0 ? (
            <div className="space-y-3 p-5" role="status" aria-live="polite">
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-12 w-full animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-semibold text-slate-900">
                Tiada rekod tempahan ditemui
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Tiada rekod sepadan dengan penapis semasa. Cuba set semula penapis atau tambah tempahan baharu.
              </p>
              <div className="mt-5 flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Set Semula Penapis
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Tambah Tempahan Baharu</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-500">
                      <th className="px-5 py-3 whitespace-nowrap">ID</th>
                      <th className="px-4 py-3 whitespace-nowrap">Nama Pemohon</th>
                      <th className="px-4 py-3 whitespace-nowrap">Item Tempahan</th>
                      <th className="px-4 py-3 whitespace-nowrap">Tarikh</th>
                      <th className="px-4 py-3 whitespace-nowrap">Slot Masa</th>
                      <th className="px-4 py-3 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 whitespace-nowrap">Tindakan Admin</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Urus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredBookings.map((booking) => {
                      const category = ITEM_CATEGORIES[booking.item_tempahan] || '';
                      const isToday = booking.tarikh === today;
                      const isRowBusy = busyId === booking.id;
                      const isApproved = booking.status === 'Diluluskan';
                      const isRejected = booking.status === 'Ditolak';

                      return (
                        <tr
                          key={booking.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                            {booking.id}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            {booking.nama_pemohon}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-900">
                              {booking.item_tempahan}
                            </div>
                            <div className="text-xs text-slate-500">{category}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                            <span>{formatDisplayDate(booking.tarikh)}</span>
                            {isToday && (
                              <span className="ml-1.5 font-sans font-semibold text-teal-700">
                                · Hari ini
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                            {booking.slot_masa}
                          </td>
                          <td className="px-4 py-3.5">
                            {renderStatusBadge(booking.status)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isApproved || isRowBusy}
                                onClick={() =>
                                  handleQuickStatus(booking.id, 'Diluluskan')
                                }
                                className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
                              >
                                Lulus
                              </button>
                              <button
                                type="button"
                                disabled={isRejected || isRowBusy}
                                onClick={() =>
                                  handleQuickStatus(booking.id, 'Ditolak')
                                }
                                className="inline-flex h-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
                              >
                                Tolak
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(booking)}
                                title="Sunting tempahan"
                                aria-label={`Sunting ${booking.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(booking)}
                                title="Padam tempahan"
                                aria-label={`Padam ${booking.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="divide-y divide-slate-200 md:hidden">
                {filteredBookings.map((booking) => {
                  const category = ITEM_CATEGORIES[booking.item_tempahan] || '';
                  const isToday = booking.tarikh === today;
                  const isRowBusy = busyId === booking.id;
                  const isApproved = booking.status === 'Diluluskan';
                  const isRejected = booking.status === 'Ditolak';

                  return (
                    <article key={booking.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {booking.nama_pemohon}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-mono tabular-nums">{booking.id}</span>
                            <span aria-hidden="true">·</span>
                            <span>{category}</span>
                          </div>
                        </div>
                        {renderStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <div className="text-slate-400">Item</div>
                          <div className="font-medium text-slate-800">
                            {booking.item_tempahan}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Tarikh &amp; Slot</div>
                          <div className="font-mono font-medium text-slate-800 tabular-nums">
                            {formatDisplayDate(booking.tarikh)}
                            {isToday && (
                              <span className="ml-1 font-sans text-teal-700">
                                · Hari ini
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-slate-600 tabular-nums">
                            {booking.slot_masa}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isApproved || isRowBusy}
                            onClick={() => handleQuickStatus(booking.id, 'Diluluskan')}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-45 whitespace-nowrap shrink-0"
                          >
                            Lulus
                          </button>
                          <button
                            type="button"
                            disabled={isRejected || isRowBusy}
                            onClick={() => handleQuickStatus(booking.id, 'Ditolak')}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-45 whitespace-nowrap shrink-0"
                          >
                            Tolak
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(booking)}
                            aria-label={`Sunting ${booking.id}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(booking)}
                            aria-label={`Padam ${booking.id}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Add / Edit Booking Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 id="booking-modal-title" className="text-base font-bold text-slate-900">
                {editingBooking
                  ? `Sunting Tempahan (${editingBooking.id})`
                  : 'Tempahan Baharu'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup borang"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="field-nama"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Nama Pemohon <span className="text-rose-600">*</span>
                </label>
                <input
                  id="field-nama"
                  type="text"
                  required
                  minLength={2}
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Ahmad Faiz bin Ismail"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                />
              </div>

              <div>
                <label
                  htmlFor="field-item"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Item Tempahan <span className="text-rose-600">*</span>
                </label>
                <select
                  id="field-item"
                  required
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                >
                  <option value="" disabled>
                    -- Pilih Ruang atau Peralatan --
                  </option>
                  <optgroup label="Ruang">
                    {ROOM_ITEMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Peralatan">
                    {EQUIPMENT_ITEMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="field-tarikh"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Tarikh Tempahan <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="field-tarikh"
                    type="date"
                    required
                    value={formTarikh}
                    onChange={(e) => setFormTarikh(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 font-mono tabular-nums focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-slot"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Slot Masa <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="field-slot"
                    required
                    value={formSlot}
                    onChange={(e) => setFormSlot(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 font-mono focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  >
                    <option value="" disabled>
                      -- Pilih Slot --
                    </option>
                    {VALID_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editingBooking && (
                <div>
                  <label
                    htmlFor="field-status"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Status Tempahan
                  </label>
                  <select
                    id="field-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as BookingStatus)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                  >
                    {VALID_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingBooking
                      ? 'Kemas Kini Tempahan'
                      : 'Simpan Tempahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 id="delete-modal-title" className="text-base font-bold text-slate-900">
                Sahkan Pemadaman
              </h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup pengesahan"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-600">
                Adakah anda pasti mahu memadam rekod tempahan berikut? Tindakan ini tidak boleh diundur.
              </p>

              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">ID:</span>{' '}
                  <span className="font-mono text-slate-900">{deleteTarget.id}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Pemohon:</span>{' '}
                  {deleteTarget.nama_pemohon}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Item:</span>{' '}
                  {deleteTarget.item_tempahan}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Tarikh &amp; Slot:</span>{' '}
                  <span className="font-mono tabular-nums">
                    {formatDisplayDate(deleteTarget.tarikh)} ({deleteTarget.slot_masa})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDelete}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isSubmitting ? 'Memadam...' : 'Ya, Padam Rekod'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
        aria-live="assertive"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toast.type === 'error' ? 'bg-rose-800' : 'bg-emerald-800'
            }`}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }
              aria-label="Tutup notifikasi"
              className="rounded p-0.5 text-white/80 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
