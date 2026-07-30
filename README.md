# Photo Studio Manager (PHStud)

A zero-cost, multi-tenant photo studio management application for client scheduling, event management, invoicing, and reminders.

## Features

- **Multi-tenant architecture** — One deployment, many photo studio instances
- **Super Admin panel** — Onboard studios, assign licenses, activate/deactivate accounts
- **Client management** — Store client details, contact info, and history
- **Event scheduling** — Pre-Wedding, Before Wedding, Weddings, Birthdays, Custom events
- **Custom packages** — Create and manage service packages with pricing
- **Invoicing & payments** — Advance, partial, full, and EMI installment payments
- **Photographer assignment** — Assign team members to events
- **Location tracking** — Store event venue/location details
- **Reminders** — Pre-event and post-event reminders (configurable days)
- **Custom branding** — Per-studio color palette customization
- **PWA ready** — Installable as a mobile/desktop app

## Tech Stack (100% Free/Open Source)

| Layer | Technology | Cost |
|-------|-----------|------|
| Framework | Next.js 14 (App Router) | Free |
| Database | SQLite (dev) / PostgreSQL via Neon (prod) | Free tier |
| ORM | Prisma | Free |
| Styling | Tailwind CSS | Free |
| Auth | JWT (jose + bcryptjs) | Free |
| Hosting | Vercel / Railway / Render | Free tier |

## Quick Start

```bash
cd photo-studio-manager

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Create database and seed demo data
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@phstud.local | Admin@123 |
| Studio Admin | admin@demo-studio.com | Demo@123 |

## Project Structure

```
photo-studio-manager/
├── prisma/
│   ├── schema.prisma      # Database models
│   └── seed.ts            # Demo data seeder
├── src/
│   ├── app/
│   │   ├── api/           # REST API routes
│   │   ├── admin/         # Super admin panel
│   │   ├── dashboard/     # Studio dashboard
│   │   ├── clients/       # Client management
│   │   ├── events/        # Event scheduling
│   │   ├── packages/      # Service packages
│   │   ├── invoices/      # Invoicing & payments
│   │   ├── photographers/ # Team management
│   │   ├── reminders/     # Notification queue
│   │   └── settings/      # Studio settings & theming
│   ├── components/        # UI components
│   └── lib/               # Auth, prisma, utilities
├── public/
│   └── manifest.json      # PWA manifest
├── DEPLOYMENT.md          # Full deployment guide
└── README.md
```

## License Tiers

| Tier | Clients | Events | Staff |
|------|---------|--------|-------|
| Trial | 10 | 5 | 2 |
| Basic | 50 | 30 | 3 |
| Professional | 200 | 100 | 10 |
| Enterprise | Unlimited | Unlimited | 50 |

## Onboarding a New Studio

1. Log in as Super Admin
2. Go to **Admin → Onboard Studio**
3. Fill studio details, admin credentials, license tier, and brand colors
4. Share the login URL and admin credentials with the studio owner
5. Studio owner can customize settings, add packages, clients, and start scheduling

## Customization

Each studio can customize:
- Primary and accent colors (Settings → Brand Colors)
- Reminder timing (days before/after events)
- Service packages and pricing
- Photographer team

## Security Notes

- Change `JWT_SECRET` in production to a long random string
- Change default admin passwords immediately
- Use HTTPS in production (automatic on Vercel)
- Source code stays with you — studios only get login access

## Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Hosting options with lowest pricing
- Database setup (SQLite → PostgreSQL migration)
- PWA installation guide
- SMS/Email integration for automated reminders
- Custom domain setup
- Backup strategies
