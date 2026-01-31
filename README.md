# LinkedIn SaaS Backend

A comprehensive NestJS backend for a LinkedIn SaaS application, featuring AI-powered post generation, multi-provider payment integration, and LinkedIn API connectivity.

## 🚀 Features

- **AI Post Generation**: Integration with Google Gemini AI for creating and improving LinkedIn content.
- **Payments**: Multi-provider support (Stripe for subscriptions and PayTech for local payments).
- **LinkedIn Integration**: OAuth 2.0 flow and automated post publishing.
- **Security**: 
  - JWT Authentication
  - Role-based and Subscription-based Access Control (CASL)
  - Rate Limiting (Throttler)
  - Security Headers (Helmet)
  - Input Validation & Sanitization
- **API Documentation**: Interactive Swagger UI at `/api/docs`.
- **Database**: PostgreSQL with Prisma ORM.

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (Neon/Supabase)
- **AI**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Payments**: [Stripe](https://stripe.com/) & [PayTech](https://paytech.sn/)
- **Auth**: Passport.js + JWT

## 📋 Prerequisites

- Node.js (v18+)
- pnpm (recommended) or npm/yarn
- PostgreSQL database

## ⚙️ Setup

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Configure Environment**
   Copy `.env.example` to `.env` and fill in your keys.
   ```bash
   cp .env.example .env
   ```
4. **Database Migration**
   ```bash
   npx prisma db push
   ```

## 🏃 Running the App

```bash
# Development mode
pnpm start:dev

# Production build
pnpm build
pnpm start:prod
```

## 📚 API Documentation

Once the app is running, visit:
`http://localhost:3000/api/docs`

## 🔒 Security & Performance

This application is production-ready with:
- **Rate Limiting**: 100 requests per minute per IP.
- **Helmet**: Protection against common web vulnerabilities.
- **Validation**: Strict validation of all incoming data.
- **Global Error Handling**: Consistent JSON error structures.

## 📜 License

This project is [UNLICENSED](LICENSE).
