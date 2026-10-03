-- Swish receipt screenshots uploaded by buyers. Kept out of the bookings table so that
-- listing bookings never loads image data; receipt_uploaded_at lets lists show that one exists.
ALTER TABLE bookings ADD COLUMN receipt_uploaded_at TIMESTAMP;

CREATE TABLE booking_receipts (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    image_data BYTEA NOT NULL,
    uploaded_at TIMESTAMP NOT NULL
);
