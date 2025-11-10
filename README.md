# TicketBroker - Java/Spring Boot + React

Modern ticket booking system built with Spring Boot (Java) backend and React (TypeScript) frontend.

## Architecture

- **Backend**: Spring Boot 3.2 with PostgreSQL
- **Frontend**: React 18 with TypeScript and Vite
- **Database**: PostgreSQL 15
- **Logging**: Loki + Grafana
- **Containerization**: Docker Compose

## Prerequisites

- Java 21+
- Node.js 20+
- Docker and Docker Compose
- Maven 3.9+

## Quick Start

### 1. Start all services with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Spring Boot API (port 8080)
- Loki (port 3100)
- Grafana (port 3000)
- Promtail (log collector)

### 2. Start React frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

### 3. Access services

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:8080
- **Grafana**: http://localhost:3000 (admin/admin)
- **PostgreSQL**: localhost:5432

## Development

### Backend Development

```bash
cd backend
mvn spring-boot:run
```

### Frontend Development

```bash
cd frontend
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
POSTGRES_PASSWORD=your_secure_password
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
ADMIN_PASSWORD=your_admin_password
GRAFANA_PASSWORD=your_grafana_password
```

## Database Migrations

Database migrations are handled by Flyway. Migrations are located in:
`backend/src/main/resources/db/migration/`

## API Endpoints

### Public API

- `GET /api/public/shows` - Get all shows
- `GET /api/public/shows/{id}/availability` - Check show availability
- `POST /api/public/bookings` - Create booking
- `GET /api/public/bookings/{reference}` - Get booking by reference
- `POST /api/public/bookings/{reference}/initiate-payment` - Initiate Swish payment
- `POST /api/public/bookings/{reference}/confirm-payment` - Confirm payment
- `POST /api/public/tickets/validate` - Validate ticket
- `GET /api/public/settings` - Get public settings

### Admin API

- `GET /api/admin/bookings` - Get all bookings
- `POST /api/admin/bookings/{id}/confirm-payment` - Admin confirm payment
- `DELETE /api/admin/bookings/{id}` - Delete booking
- `GET /api/admin/tickets` - Get all tickets
- `POST /api/admin/tickets/{id}/toggle-state` - Toggle ticket state
- `DELETE /api/admin/tickets/{id}` - Delete ticket
- `GET /api/admin/export/excel` - Export bookings to Excel
- `GET /api/admin/audit` - Get audit logs
- `GET /api/admin/settings` - Get admin settings
- `POST /api/admin/settings` - Update settings

## Logging

Logs are collected by Promtail and sent to Loki. View logs in Grafana:

1. Open Grafana at http://localhost:3000
2. Login with admin/admin (or your configured password)
3. Go to Explore
4. Select Loki datasource
5. Query: `{job="ticketbroker"}`

## Building for Production

### Backend

```bash
cd backend
mvn clean package
docker build -t ticketbroker-api .
```

### Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## Project Structure

```
.
├── backend/                 # Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/ticketbroker/
│   │   │   │   ├── model/          # JPA entities
│   │   │   │   ├── repository/     # Data repositories
│   │   │   │   ├── service/         # Business logic
│   │   │   │   ├── controller/      # REST controllers
│   │   │   │   └── config/          # Configuration
│   │   │   └── resources/
│   │   │       ├── db/migration/    # Flyway migrations
│   │   │       └── application.properties
│   └── Dockerfile
├── frontend/                # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   └── package.json
├── docker-compose.yml       # Docker Compose configuration
├── loki-config.yml          # Loki configuration
└── promtail-config.yml      # Promtail configuration
```

## Features

- ✅ Booking management
- ✅ Ticket generation with QR codes
- ✅ PDF ticket generation
- ✅ Email notifications
- ✅ Excel export
- ✅ Audit logging
- ✅ Admin panel
- ✅ Swish payment integration
- ✅ Log aggregation with Loki/Grafana

## License

This project is created for educational purposes.

