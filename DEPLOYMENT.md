# PHStud Deployment Guide

Complete guide to deploy Photo Studio Manager with zero or minimal cost.

---

## Table of Contents

1. [Hosting Options (Lowest Cost)](#hosting-options)
2. [Recommended Setup](#recommended-setup)
3. [Step-by-Step: Vercel + Neon (Free)](#vercel--neon-free)
4. [Step-by-Step: Self-Hosted (VPS)](#self-hosted-vps)
5. [Database Migration (SQLite → PostgreSQL)](#database-migration)
6. [Environment Variables](#environment-variables)
7. [PWA / App Installation](#pwa-installation)
8. [Custom Domain](#custom-domain)
9. [Automated Reminders (SMS/Email)](#automated-reminders)
10. [Assigning Studios to Clients](#assigning-studios)
11. [Backup & Maintenance](#backup--maintenance)

---

## Hosting Options

### Tier 1: Completely Free (Recommended to Start)

| Service | Purpose | Free Tier Limits | URL |
|---------|---------|-----------------|-----|
| **Vercel** | App hosting | 100GB bandwidth, serverless | [vercel.com](https://vercel.com) |
| **Neon** | PostgreSQL database | 0.5GB storage, 1 project | [neon.tech](https://neon.tech) |
| **Cloudflare** | DNS + CDN | Unlimited | [cloudflare.com](https://cloudflare.com) |

**Total monthly cost: ₹0**

### Tier 2: Low Cost Production (~₹300-500/month)

| Service | Purpose | Cost | URL |
|---------|---------|------|-----|
| **Hostinger VPS** | Full control hosting | ~₹299/mo | [hostinger.in](https://hostinger.in) |
| **Railway** | App + DB hosting | $5/mo credit | [railway.app](https://railway.app) |
| **Render** | App hosting | Free tier + $7/mo DB | [render.com](https://render.com) |

### Tier 3: Indian Hosting (Good for .in domains)

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| **Hostinger India** | KVM 1 VPS | ₹299/mo | Full Node.js support |
| **DigitalOcean** | Basic Droplet | $6/mo (~₹500) | Reliable, Mumbai region |
| **AWS Lightsail** | 512MB instance | $3.5/mo | Mumbai region available |

---

## Recommended Setup

For your use case (you own source code, studios get login access):

```
┌─────────────────────────────────────────────┐
│  Your Domain: phstud.yourdomain.com         │
│  Hosted on: Vercel (Free)                   │
│  Database: Neon PostgreSQL (Free)           │
│  DNS: Cloudflare (Free)                     │
│                                             │
│  Super Admin: You manage all studios        │
│  Studio Users: Login at same URL            │
│  PWA: Studios install as phone app          │
└─────────────────────────────────────────────┘
```

---

## Vercel + Neon (Free)

### Step 1: Prepare Database on Neon

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project (e.g., `phstud-prod`)
3. Copy the connection string:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/phstud?sslmode=require
   ```

### Step 2: Update Prisma for PostgreSQL

In `prisma/schema.prisma`, change the datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 3: Push Schema to Neon

```bash
# Set your Neon connection string
export DATABASE_URL="postgresql://..."

npx prisma db push
npm run db:seed
```

### Step 4: Deploy to Vercel

1. Push code to GitHub (private repo — only you have access)
2. Sign up at [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set environment variables in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `SUPER_ADMIN_EMAIL` | Your email |
| `SUPER_ADMIN_PASSWORD` | Strong password |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |

5. Click **Deploy**

### Step 5: Verify

- Visit your Vercel URL
- Login as Super Admin
- Onboard a test studio
- Test all features

---

## Self-Hosted (VPS)

For full control on a ₹299/month Hostinger VPS:

### Step 1: Server Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Install PM2 (process manager)
npm install -g pm2

# Clone your repo (private)
git clone https://github.com/yourusername/phstud.git
cd phstud/photo-studio-manager
```

### Step 2: Configure & Build

```bash
cp .env.example .env
nano .env  # Edit with production values

npm install
npx prisma db push
npm run db:seed
npm run build
```

### Step 3: Run with PM2

```bash
pm2 start npm --name "phstud" -- start
pm2 save
pm2 startup
```

### Step 4: Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/phstud
server {
    listen 80;
    server_name phstud.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/phstud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Free SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d phstud.yourdomain.com
```

---

## Database Migration

### SQLite (Development) → PostgreSQL (Production)

1. Change `provider` in `schema.prisma` from `sqlite` to `postgresql`
2. Some SQLite-specific types auto-map in Prisma
3. Run `npx prisma db push` against PostgreSQL URL
4. Re-run seed: `npm run db:seed`

### Backup SQLite Database

```bash
# Copy the database file
cp prisma/dev.db prisma/dev.db.backup

# Or export data
npx prisma db pull
```

### Backup PostgreSQL (Neon)

Neon provides automatic backups on paid plans. For free tier:

```bash
pg_dump $DATABASE_URL > backup.sql
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `JWT_SECRET` | Yes | Min 32 char random string for session tokens |
| `SUPER_ADMIN_EMAIL` | Yes | Your super admin login email |
| `SUPER_ADMIN_PASSWORD` | Yes | Super admin password (change after first login) |
| `NEXT_PUBLIC_APP_NAME` | No | Display name (default: Photo Studio Manager) |
| `NEXT_PUBLIC_APP_URL` | Yes | Full URL of deployed app |

Generate a secure JWT secret:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## PWA Installation

Studios can install PHStud as a phone/desktop app:

### Android
1. Open the app URL in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. App icon appears on home screen

### iPhone/iPad
1. Open the app URL in Safari
2. Tap Share → "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Open the app URL
2. Click install icon in address bar
3. App opens in its own window

### Custom App Icons

Replace placeholder icons in `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Use a tool like [realfavicongenerator.net](https://realfavicongenerator.net) to generate from your logo.

---

## Custom Domain

### On Vercel (Free)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `phstud.yourdomain.com`
3. Update DNS at your registrar:
   ```
   Type: CNAME
   Name: phstud
   Value: cname.vercel-dns.com
   ```
4. SSL is automatic

### Domain Pricing (India)

| Registrar | .com | .in | Notes |
|-----------|------|-----|-------|
| GoDaddy India | ~₹199/yr (1st yr) | ~₹149/yr | Frequent sales |
| Namecheap | ~$9/yr | N/A | Good renewal prices |
| Cloudflare | ~$10/yr | N/A | At-cost pricing |

---

## Automated Reminders

The app queues reminders; you mark them as sent after contacting clients. For full automation:

### Option A: WhatsApp Business API (Recommended for India)

Use [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) (free tier: 1000 conversations/month):

```typescript
// Example integration in src/lib/notifications.ts
export async function sendWhatsApp(phone: string, message: string) {
  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    }),
  });
}
```

### Option B: Email via Resend (Free: 3000 emails/month)

1. Sign up at [resend.com](https://resend.com)
2. Add API key to environment: `RESEND_API_KEY`
3. Integrate in reminder processing

### Option C: SMS via Twilio

Pay-per-SMS (~₹0.50/SMS in India). Good for critical reminders.

### Cron Job for Auto-Sending

On Vercel, add a cron job in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 9 * * *"
  }]
}
```

Create `/api/cron/reminders/route.ts` to process and send pending reminders.

---

## Assigning Studios to Clients

### Workflow

1. **You (Super Admin)** log in at `https://phstud.yourdomain.com`
2. Click **Onboard Studio**
3. Fill in:
   - Studio name, email, phone
   - License tier (Trial/Basic/Professional/Enterprise)
   - License duration in days
   - Admin name, email, password
   - Brand colors
4. Click **Create Studio**
5. Share with studio owner:
   - URL: `https://phstud.yourdomain.com`
   - Their admin email and password
   - Instructions to change password in Settings

### License Management

| Action | How |
|--------|-----|
| Extend license | Admin panel → Edit studio → Update expiry date |
| Upgrade tier | Admin panel → Change license tier |
| Suspend studio | Admin panel → Deactivate |
| Reactivate | Admin panel → Activate |

### White-Label Option (Per Studio Subdomain)

For premium studios, set up subdomains:
- `studio1.phstud.com` → Same app, studio identified by subdomain
- Requires middleware update to detect subdomain and apply branding
- DNS: Wildcard CNAME `*.phstud.com` → Vercel

---

## Backup & Maintenance

### Daily Backup Script (VPS)

```bash
#!/bin/bash
# /root/backup-phstud.sh
DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL > /backups/phstud-$DATE.sql
find /backups -mtime +7 -delete
```

Add to crontab: `0 2 * * * /root/backup-phstud.sh`

### Updates

```bash
cd /path/to/photo-studio-manager
git pull origin main
npm install
npx prisma db push
npm run build
pm2 restart phstud
```

### Monitoring (Free)

- **Uptime**: [UptimeRobot](https://uptimerobot.com) — free, 50 monitors
- **Errors**: Vercel Analytics (built-in) or [Sentry](https://sentry.io) free tier
- **Logs**: `pm2 logs phstud` on VPS, Vercel dashboard on cloud

---

## Cost Summary

| Setup | Monthly Cost | Best For |
|-------|-------------|----------|
| Vercel + Neon + Cloudflare | **₹0** | Starting out, up to 10 studios |
| Hostinger VPS | **₹299** | Full control, unlimited studios |
| Vercel Pro + Neon Scale | **~₹1700** | High traffic, 50+ studios |

**Recommendation**: Start with the completely free Vercel + Neon setup. Move to VPS only when you need more control or exceed free tier limits.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on Vercel | Ensure `prisma generate` runs (check `postinstall` script) |
| Database connection error | Verify `DATABASE_URL` has `?sslmode=require` for Neon |
| Login not working | Check `JWT_SECRET` is set in production env |
| PWA not installing | Ensure HTTPS and valid `manifest.json` |
| Reminders not showing | Create an event — reminders auto-schedule on event creation |

For support, refer to the source code or contact the developer (you).
