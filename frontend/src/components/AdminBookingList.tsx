import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookingResponse } from '../types/booking'
import './AdminBookingList.css'

type Category = 'review' | 'pending' | 'reserved' | 'confirmed'
type Filter = 'all' | Category

interface AdminBookingListProps {
  bookings: BookingResponse[]
  confirmingIds: Set<number>
  onConfirm: (bookingId: number) => void
  onResendConfirmation: (bookingId: number) => void
  onResendTickets: (bookingId: number) => void
  onDelete: (bookingId: number) => void
  onShowReceipt: (booking: BookingResponse) => void
}

interface ShowGroup {
  key: string
  time: string
  date: string
  sortKey: string
  bookings: BookingResponse[]
}

const ORDER: Record<Category, number> = { review: 0, pending: 1, reserved: 2, confirmed: 3 }

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'review', label: '🧾 Att granska' },
  { id: 'pending', label: 'Väntar' },
  { id: 'reserved', label: 'Reserverade' },
  { id: 'confirmed', label: 'Bekräftade' },
]

function categoryOf(booking: BookingResponse): Category {
  if (booking.status === 'confirmed') return 'confirmed'
  if (booking.receiptUploadedAt) return 'review'
  if (booking.buyerConfirmedPayment) return 'pending'
  return 'reserved'
}

function shortDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) : ''
}

function ticketSummary(booking: BookingResponse) {
  const parts = []
  if (booking.adultTickets) parts.push(`${booking.adultTickets} ord`)
  if (booking.studentTickets) parts.push(`${booking.studentTickets} stud`)
  return parts.join(' · ') || '0'
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function kr(amount: number) {
  return `${amount.toLocaleString('sv-SE')} kr`
}

function AdminBookingList({
  bookings,
  confirmingIds,
  onConfirm,
  onResendConfirmation,
  onResendTickets,
  onDelete,
  onShowReceipt,
}: AdminBookingListProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (openMenu === null) return
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: bookings.length, review: 0, pending: 0, reserved: 0, confirmed: 0 }
    bookings.forEach((b) => result[categoryOf(b)]++)
    return result
  }, [bookings])

  // Grouped by the actual show (date + time): two shows at the same time on different days
  // must not be merged
  const groups = useMemo(() => {
    const byShow = new Map<string, ShowGroup>()
    bookings.forEach((booking) => {
      const show = booking.show
      const key = show?.id != null ? String(show.id) : 'unknown'
      if (!byShow.has(key)) {
        byShow.set(key, {
          key,
          time: show ? `${show.startTime}–${show.endTime}` : 'Okänd föreställning',
          date: shortDate(show?.date),
          sortKey: show ? `${show.date ?? ''} ${show.startTime}` : '~',
          bookings: [],
        })
      }
      byShow.get(key)!.bookings.push(booking)
    })
    return [...byShow.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [bookings])

  const needle = query.trim().toLowerCase()
  const matches = (booking: BookingResponse) =>
    (filter === 'all' || categoryOf(booking) === filter) &&
    (!needle ||
      [booking.bookingReference, `${booking.firstName} ${booking.lastName}`, booking.email, booking.phone].some(
        (value) => value?.toLowerCase().includes(needle)
      ))

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const primaryAction = (booking: BookingResponse) => {
    const category = categoryOf(booking)
    const id = booking.id!
    if (category === 'review') {
      return (
        <button type="button" className="abl-btn abl-btn-receipt" onClick={() => onShowReceipt(booking)}>
          <span aria-hidden="true">🧾 </span>Granska kvitto
        </button>
      )
    }
    if (category === 'confirmed') {
      return (
        <button type="button" className="abl-btn abl-btn-ghost" onClick={() => onResendTickets(id)}>
          <span aria-hidden="true">✉️ </span>Skicka om biljetter
        </button>
      )
    }
    const confirming = confirmingIds.has(id)
    return (
      <button
        type="button"
        className={`abl-btn ${category === 'pending' ? 'abl-btn-confirm' : 'abl-btn-ghost'}`}
        onClick={() => onConfirm(id)}
        disabled={confirming}
        aria-busy={confirming}
      >
        {confirming ? (
          'Bekräftar…'
        ) : (
          <>
            {/* "betalning" is only visible on mobile but always part of the accessible name */}
            <span aria-hidden="true">✓ </span>Bekräfta<span className="abl-label-extra"> betalning</span>
          </>
        )}
      </button>
    )
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      rows: group.bookings
        .filter(matches)
        .sort(
          (a, b) =>
            ORDER[categoryOf(a)] - ORDER[categoryOf(b)] ||
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        ),
    }))
    .filter((group) => group.rows.length > 0 || (filter === 'all' && !needle))

  return (
    <div className="abl">
      <div className="abl-toolbar">
        <div className="abl-chips" role="group" aria-label="Filtrera bokningar">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`abl-chip abl-chip-${id} ${filter === id ? 'active' : ''}`}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label} <b>{counts[id]}</b>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="abl-search"
          placeholder="🔍 Sök namn, referens eller e-post…"
          aria-label="Sök bokningar"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visibleGroups.length === 0 && <p className="abl-empty">Inga bokningar matchar.</p>}

      {visibleGroups.map((group) => {
        const isCollapsed = collapsed.has(group.key)
        const toReview = group.bookings.filter((b) => categoryOf(b) === 'review').length
        const tickets = group.bookings.reduce((sum, b) => sum + (b.adultTickets || 0) + (b.studentTickets || 0), 0)
        const amount = group.bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
        return (
          <section key={group.key} className="abl-show">
            <button
              type="button"
              className="abl-show-head"
              aria-expanded={!isCollapsed}
              onClick={() => setCollapsed(toggle(collapsed, group.key))}
            >
              <h4>{group.time}</h4>
              {toReview > 0 && (
                <span className="abl-flag">
                  {toReview} <span className="abl-desktop-only">{toReview === 1 ? 'kvitto ' : 'kvitton '}</span>att granska
                </span>
              )}
              <span className="abl-meta">
                {group.date && `${group.date} · `}
                {count(group.bookings.length, 'bokning', 'bokningar')}
                <span className="abl-desktop-only"> · {count(tickets, 'biljett', 'biljetter')}</span> · {kr(amount)}
              </span>
              <span className="abl-caret" aria-hidden="true">
                {isCollapsed ? '▸' : '▾'}
              </span>
            </button>

            {isCollapsed ? (
              <p className="abl-collapsed">Ihopfälld – visa {count(group.bookings.length, 'bokning', 'bokningar')}</p>
            ) : (
              <div className="abl-rows" role="table" aria-label={`Bokningar ${group.time}`}>
                <div className="abl-row abl-head" role="row">
                  <span role="columnheader">Ref</span>
                  <span role="columnheader">Bokat av</span>
                  <span role="columnheader">Biljetter</span>
                  <span role="columnheader">Belopp</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader" className="abl-right">
                    Åtgärd
                  </span>
                </div>
                {group.rows.map((booking) => {
                  const category = categoryOf(booking)
                  const id = booking.id!
                  const isExpanded = expanded.has(id)
                  return (
                    <div key={id} role="row" className={`abl-row abl-${category} ${category === 'review' ? 'need' : ''}`}>
                      <span role="cell" className="abl-ref">
                        {booking.bookingReference}
                      </span>
                      <span role="cell" className="abl-who">
                        <button
                          type="button"
                          className="abl-name"
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded(toggle(expanded, id))}
                        >
                          {booking.firstName} {booking.lastName}
                          <span className="abl-mobile-only abl-expand" aria-hidden="true">
                            {isExpanded ? ' ▴' : ' ▾'}
                          </span>
                        </button>
                        <span className="abl-contact abl-desktop-only">
                          {booking.email} · {booking.phone}
                        </span>
                      </span>
                      <span role="cell" className="abl-tickets">
                        {ticketSummary(booking)}
                      </span>
                      <span role="cell" className="abl-amount">
                        {kr(booking.totalAmount)}
                      </span>
                      <span role="cell" className="abl-status">
                        {category === 'review' && <span className="abl-st abl-st-review">🧾 Kvitto inskickat</span>}
                        {category === 'pending' && (
                          <span className="abl-st abl-st-pending">
                            Väntar<span className="abl-desktop-only"> på bekräftelse</span>
                          </span>
                        )}
                        {category === 'reserved' && <span className="abl-st abl-st-reserved">Reserverad</span>}
                        {category === 'confirmed' && <span className="abl-st abl-st-confirmed">✓ Bekräftad</span>}
                      </span>
                      {isExpanded && (
                        <span role="cell" className="abl-details abl-mobile-only">
                          <span>
                            <small>E-post</small>
                            <a href={`mailto:${booking.email}`}>{booking.email}</a>
                          </span>
                          <span>
                            <small>Telefon</small>
                            <a href={`tel:${booking.phone}`}>📞 {booking.phone}</a>
                          </span>
                          <span>
                            <small>Bokad</small>
                            {shortDate(booking.createdAt)}
                          </span>
                        </span>
                      )}
                      <span role="cell" className="abl-actions">
                        {primaryAction(booking)}
                        <div className="abl-more" ref={openMenu === id ? menuRef : undefined}>
                          <button
                            type="button"
                            className="abl-more-btn"
                            aria-label={`Fler åtgärder för ${booking.bookingReference}`}
                            aria-haspopup="menu"
                            aria-expanded={openMenu === id}
                            onClick={() => setOpenMenu(openMenu === id ? null : id)}
                          >
                            ⋯
                          </button>
                          {openMenu === id && (
                            <div className="abl-menu" role="menu">
                              {category !== 'confirmed' && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onResendConfirmation(id)
                                  }}
                                >
                                  ✉️ Skicka om bekräftelse
                                </button>
                              )}
                              {category === 'confirmed' && booking.receiptUploadedAt && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onShowReceipt(booking)
                                  }}
                                >
                                  🧾 Visa kvitto
                                </button>
                              )}
                              <Link role="menuitem" to={`/admin/bookings/${id}/edit`}>
                                ✏️ Redigera
                              </Link>
                              <button
                                type="button"
                                role="menuitem"
                                className="abl-danger"
                                onClick={() => {
                                  setOpenMenu(null)
                                  onDelete(id)
                                }}
                              >
                                🗑 Radera
                              </button>
                            </div>
                          )}
                        </div>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default AdminBookingList
