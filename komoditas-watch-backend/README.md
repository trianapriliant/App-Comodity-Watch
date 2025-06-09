# Komoditas Watch Backend API

Backend API foundation untuk Platform Monitoring Komoditas Indonesia dengan integrasi web scraping untuk data sources Indonesia.

## 🏗 Arsitektur

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL dengan Prisma ORM
- **Cache**: Redis untuk session management dan caching
- **Authentication**: JWT dengan refresh token mechanism
- **Web Scraping**: Panel Harga Pangan, BPS, BMKG
- **Documentation**: Swagger/OpenAPI

## 🛠 Tech Stack

- **Framework**: Express.js dengan TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi
- **Rate Limiting**: rate-limiter-flexible
- **Web Scraping**: Cheerio + Puppeteer
- **Logging**: Winston
- **Testing**: Jest
- **API Documentation**: Swagger

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- npm atau yarn

### Development Setup

1. **Clone dan setup project**
   ```bash
   cd komoditas-watch-backend
   cp .env.example .env
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start services dengan Docker**
   ```bash
   # Start PostgreSQL dan Redis
   docker-compose up -d postgres redis
   
   # Wait for services to be ready
   docker-compose logs -f postgres redis
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database
   npm run prisma:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access aplikasi**
   - API Server: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - Health Check: http://localhost:3000/api/v1/health

### Full Docker Development

Untuk menjalankan seluruh stack dengan Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📁 Struktur Project

```
src/
├── config/           # Database, Redis, Logger configuration
├── controllers/      # Request handlers
├── middleware/       # Authentication, validation, error handling
├── models/          # Prisma models (auto-generated)
├── routes/          # API route definitions
├── scrapers/        # Web scraping modules
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migrations
└── seed.ts         # Database seeding

docker/
├── postgres/        # PostgreSQL configuration
└── redis/          # Redis configuration
```

## 🔑 Environment Variables

Lihat `.env.example` untuk konfigurasi lengkap. Variabel penting:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/komoditas_watch

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# API Keys untuk data sources
BPS_API_KEY=your-bps-api-key
BMKG_API_KEY=your-bmkg-api-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🗃 Database Schema

### Entitas Utama

- **Users**: Multi-role (Admin, Regulator, Distributor, Petani, Consumer)
- **Commodities**: 12 komoditas strategis Indonesia
- **Regions**: 34 provinsi dengan data geografis
- **Prices**: Time-series data harga dengan indexing
- **Weather**: Data cuaca BMKG untuk agricultural regions
- **Alerts**: Sistem notifikasi otomatis
- **Reports**: Analytics dan export functionality

### Migrasi Database

```bash
# Create migration
npm run prisma:migrate -- --name migration_name

# Deploy migrations
npm run prisma:deploy

# Reset database (development only)
npx prisma migrate reset
```

## 🕷 Web Scraping

### Data Sources

1. **Panel Harga Pangan Kemendag**
   - URL: pihps.kemendag.go.id
   - Frekuensi: Setiap 6 jam
   - Data: Harga konsumen per region

2. **BPS (Badan Pusat Statistik)**
   - URL: webapi.bps.go.id
   - Frekuensi: Setiap 2 hari
   - Data: Harga konsumen dan produsen

3. **BMKG**
   - URL: data.bmkg.go.id
   - Frekuensi: Setiap 3 jam
   - Data: Cuaca untuk agricultural correlation

### Menjalankan Scraper Manual

```bash
# Run semua scrapers
npm run scraper:run

# Via API (requires admin auth)
POST /api/v1/scrapers/panel-harga/run
POST /api/v1/scrapers/bmkg-weather/run
POST /api/v1/scrapers/bps-statistics/run
```

## 🔐 Authentication

### User Roles

- **ADMIN**: Full system access
- **REGULATOR**: Government officials, data validation
- **DISTRIBUTOR**: Price input, regional data
- **PETANI**: Farm-level data input
- **CONSUMER**: Read-only access

### API Authentication

```bash
# Register
POST /api/v1/auth/register

# Login
POST /api/v1/auth/login

# Refresh token
POST /api/v1/auth/refresh

# Protected endpoints require Bearer token
Authorization: Bearer <your-jwt-token>
```

### Test Credentials (Development)

```
Admin: admin@komoditaswatch.id / admin123
Regulator: regulator@kemendag.go.id / regulator123
```

## 📊 API Endpoints

### Core Resources

```
GET    /api/v1/commodities     # List komoditas
GET    /api/v1/commodities/:id # Detail komoditas
GET    /api/v1/prices          # Data harga dengan filter
GET    /api/v1/regions         # List region/provinsi
GET    /api/v1/weather         # Data cuaca
GET    /api/v1/alerts          # Notifikasi dan alerts
GET    /api/v1/predictions     # ML predictions
POST   /api/v1/data-input      # Input data manual
GET    /api/v1/reports         # Generate reports
```

### Sistem dan Monitoring

```
GET    /api/v1/health          # Health check
GET    /api/v1/scrapers        # Status scrapers
POST   /api/v1/scrapers/:name/run # Run scraper manually
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📈 Monitoring & Logging

### Logs

- **Location**: `logs/` directory
- **Levels**: error, warn, info, debug
- **Format**: JSON dengan timestamp dan metadata

### Health Checks

```bash
# Overall health
GET /api/v1/health

# Database health
GET /api/v1/health/database

# Redis health
GET /api/v1/health/redis
```

### Performance Monitoring

- Rate limiting per user role
- Request/response time tracking
- Database query monitoring
- Scraper performance metrics

## 🚀 Deployment

### Production Build

```bash
# Build aplikasi
npm run build

# Start production server
npm start
```

### Docker Production

```bash
# Build production image
docker build --target production -t komoditas-backend .

# Run container
docker run -p 3000:3000 komoditas-backend
```

## 📝 Development Guidelines

### Code Standards

- TypeScript strict mode
- ESLint + Prettier formatting
- Conventional commit messages
- 80%+ test coverage target

### Database Guidelines

- Gunakan Prisma migrations untuk schema changes
- Index pada columns yang sering di-query
- Soft delete untuk data penting
- Timestamp semua records

### API Design

- RESTful conventions
- Consistent response format
- Proper HTTP status codes
- Comprehensive error handling
- Request validation dengan Joi

## 🔧 Scripts

```json
{
  "dev": "Jalankan development server",
  "build": "Build aplikasi untuk production",
  "start": "Start production server",
  "test": "Run unit tests",
  "lint": "Run ESLint",
  "format": "Format code dengan Prettier",
  "prisma:generate": "Generate Prisma client",
  "prisma:migrate": "Run database migrations",
  "prisma:seed": "Seed database dengan data awal",
  "prisma:studio": "Open Prisma Studio",
  "scraper:run": "Run all scrapers manually"
}
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Implement changes dengan tests
4. Run linting dan tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- Documentation: http://localhost:3000/api/docs
- Issues: GitHub Issues
- Email: support@komoditaswatch.id
