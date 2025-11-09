-- Initial schema for TicketBroker application
-- Consolidated migration: includes all tables with final structure

-- Create shows table (date is DATE type, not VARCHAR)
CREATE TABLE shows (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    total_tickets INTEGER NOT NULL DEFAULT 100,
    available_tickets INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    show_id BIGINT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    booking_reference VARCHAR(10) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    adult_tickets INTEGER NOT NULL DEFAULT 0,
    student_tickets INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved',
    buyer_confirmed_payment BOOLEAN NOT NULL DEFAULT FALSE,
    swish_payment_initiated BOOLEAN NOT NULL DEFAULT FALSE,
    swish_payment_initiated_at TIMESTAMP,
    gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Create buyers table
CREATE TABLE buyers (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create tickets table
CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_reference VARCHAR(20) NOT NULL UNIQUE,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    show_id BIGINT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    buyer_id BIGINT NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    ticket_type VARCHAR(10) NOT NULL,
    ticket_number INTEGER NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    checked_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_bookings_show_id ON bookings(show_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_email ON bookings(email);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_tickets_show_id ON tickets(show_id);
CREATE INDEX idx_tickets_reference ON tickets(ticket_reference);

-- Note: concert_date setting is not created here as dates are managed via the shows table
-- If any existing database has this setting, it should be removed manually or via a separate migration
