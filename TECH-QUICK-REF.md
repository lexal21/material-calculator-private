# Technology Quick Reference

**Quick access to key technologies, patterns, and code snippets for the roofing SaaS development.**

---

## Next.js Patterns

### Middleware for Tenant Resolution

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Skip for main domain, www, and api
  if (['www', 'api', 'app'].includes(subdomain)) {
    return NextResponse.next();
  }

  // Look up tenant by subdomain
  const tenant = await db.tenant.findUnique({
    where: { slug: subdomain }
  });

  if (!tenant) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // Pass tenant context to downstream handlers
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|static|favicon.ico).*)',
  ],
};
```

### Server Component Data Fetching

```typescript
// app/[tenant]/dashboard/page.tsx
import { headers } from 'next/headers';

async function getTenantData() {
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id');
  
  return db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      estimates: {
        take: 10,
        orderBy: { created_at: 'desc' }
      },
      members: true,
    }
  });
}

export default async function DashboardPage() {
  const tenant = await getTenantData();
  
  return (
    <div>
      <h1>Welcome to {tenant.company_name}</h1>
      <EstimateList estimates={tenant.estimates} />
    </div>
  );
}
```

### API Route with Tenant Context

```typescript
// app/api/estimates/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const estimates = await db.estimate.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(estimates);
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  const data = await request.json();

  // Check plan limits
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { estimates: true } } }
  });

  if (tenant._count.estimates >= PLAN_LIMITS[tenant.plan].estimates) {
    return NextResponse.json(
      { error: 'Plan limit exceeded' },
      { status: 403 }
    );
  }

  const estimate = await db.estimate.create({
    data: {
      ...data,
      tenant_id: tenantId,
    },
  });

  return NextResponse.json(estimate);
}
```

---

## Database Patterns

### Prisma Schema for Multi-Tenant SaaS

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id           String   @id @default(uuid())
  slug         String   @unique // subdomain
  company_name String
  plan         String   @default("free") // free, pro, enterprise
  created_at   DateTime @default(now())
  
  // Relationships
  members      TenantMembership[]
  estimates    Estimate[]
  templates    PricingTemplate[]
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  name       String?
  created_at DateTime @default(now())
  
  // Relationships
  memberships TenantMembership[]
  estimates   Estimate[]
}

model TenantMembership {
  id         String   @id @default(uuid())
  user_id    String
  tenant_id  String
  role       String   // owner, admin, estimator, viewer
  created_at DateTime @default(now())
  
  user   User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@unique([user_id, tenant_id])
  @@index([tenant_id])
}

model PricingTemplate {
  id                String   @id @default(uuid())
  tenant_id         String
  name              String
  is_default        Boolean  @default(false)
  material_prices   Json     // Store all material prices
  created_at        DateTime @default(now())
  
  tenant    Tenant     @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  estimates Estimate[]
  
  @@index([tenant_id])
}

model Estimate {
  id             String   @id @default(uuid())
  tenant_id      String
  template_id    String?
  name           String
  pdf_url        String?
  parsed_data    Json?
  materials_data Json?
  labor_data     Json?
  total_cost     Decimal? @db.Decimal(10, 2)
  status         String   @default("draft") // draft, sent, approved, archived
  created_by     String
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  
  tenant   Tenant           @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  template PricingTemplate? @relation(fields: [template_id], references: [id])
  creator  User             @relation(fields: [created_by], references: [id])
  
  @@index([tenant_id, created_at(sort: Desc)])
  @@index([tenant_id, status])
  @@index([created_by])
}
```

### Row-Level Security (RLS) Setup

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE "Estimate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingTemplate" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation_estimate ON "Estimate"
  USING (tenant_id = current_setting('app.tenant_id', true)::text);

CREATE POLICY tenant_isolation_template ON "PricingTemplate"
  USING (tenant_id = current_setting('app.tenant_id', true)::text);
```

### Database Helper with RLS Context

```typescript
// lib/db/with-tenant-context.ts
import { PrismaClient } from '@prisma/client';

export async function withTenantContext<T>(
  tenantId: string,
  operation: (db: PrismaClient) => Promise<T>
): Promise<T> {
  const db = new PrismaClient();
  
  try {
    // Set tenant context for RLS
    await db.$executeRaw`SET app.tenant_id = ${tenantId}`;
    
    // Execute the operation
    const result = await operation(db);
    
    return result;
  } finally {
    await db.$disconnect();
  }
}

// Usage
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')!;
  
  return withTenantContext(tenantId, async (db) => {
    const estimates = await db.estimate.findMany();
    return NextResponse.json(estimates);
  });
}
```

---

## Authentication Patterns

### Clerk Setup (Recommended)

```bash
npm install @clerk/nextjs
```

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

```typescript
// app/api/estimates/route.ts
import { auth } from '@clerk/nextjs';

export async function GET(request: NextRequest) {
  const { userId, orgId } = auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use orgId as tenantId
  const estimates = await db.estimate.findMany({
    where: { tenant_id: orgId },
  });

  return NextResponse.json(estimates);
}
```

### Permission Helper

```typescript
// lib/auth/permissions.ts
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  ESTIMATOR: 'estimator',
  VIEWER: 'viewer',
} as const;

export const PERMISSIONS = {
  // Billing
  MANAGE_BILLING: [ROLES.OWNER],
  VIEW_INVOICES: [ROLES.OWNER, ROLES.ADMIN],
  
  // Users
  INVITE_USERS: [ROLES.OWNER, ROLES.ADMIN],
  REMOVE_USERS: [ROLES.OWNER],
  
  // Estimates
  CREATE_ESTIMATES: [ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR],
  EDIT_ESTIMATES: [ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR],
  DELETE_ESTIMATES: [ROLES.OWNER, ROLES.ADMIN],
  VIEW_ESTIMATES: [ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR, ROLES.VIEWER],
  
  // Templates
  CREATE_TEMPLATES: [ROLES.OWNER, ROLES.ADMIN],
  EDIT_PRICING: [ROLES.OWNER, ROLES.ADMIN],
} as const;

export function hasPermission(
  userRole: string,
  permission: keyof typeof PERMISSIONS
): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

export function requirePermission(
  userRole: string,
  permission: keyof typeof PERMISSIONS
) {
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
```

---

## State Management (Zustand)

```typescript
// lib/store/estimate-store.ts
import { create } from 'zustand';

interface Material {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface LaborItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

interface EstimateStore {
  materials: Material[];
  labor: LaborItem[];
  
  // Material actions
  addMaterial: (item: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  
  // Labor actions
  addLabor: (item: Omit<LaborItem, 'id'>) => void;
  updateLabor: (id: string, updates: Partial<LaborItem>) => void;
  removeLabor: (id: string) => void;
  
  // Computed values
  getTotalMaterialCost: () => number;
  getTotalLaborCost: () => number;
  getGrandTotal: () => number;
  
  // Reset
  reset: () => void;
}

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  materials: [],
  labor: [],
  
  addMaterial: (item) => set((state) => ({
    materials: [
      ...state.materials,
      { ...item, id: crypto.randomUUID() }
    ]
  })),
  
  updateMaterial: (id, updates) => set((state) => ({
    materials: state.materials.map((m) =>
      m.id === id ? { ...m, ...updates, total: (updates.quantity || m.quantity) * (updates.price || m.price) } : m
    )
  })),
  
  removeMaterial: (id) => set((state) => ({
    materials: state.materials.filter((m) => m.id !== id)
  })),
  
  addLabor: (item) => set((state) => ({
    labor: [
      ...state.labor,
      { ...item, id: crypto.randomUUID() }
    ]
  })),
  
  updateLabor: (id, updates) => set((state) => ({
    labor: state.labor.map((l) =>
      l.id === id ? { ...l, ...updates, total: (updates.hours || l.hours) * (updates.rate || l.rate) } : l
    )
  })),
  
  removeLabor: (id) => set((state) => ({
    labor: state.labor.filter((l) => l.id !== id)
  })),
  
  getTotalMaterialCost: () => {
    return get().materials.reduce((sum, m) => sum + m.total, 0);
  },
  
  getTotalLaborCost: () => {
    return get().labor.reduce((sum, l) => sum + l.total, 0);
  },
  
  getGrandTotal: () => {
    return get().getTotalMaterialCost() + get().getTotalLaborCost();
  },
  
  reset: () => set({ materials: [], labor: [] }),
}));
```

---

## Stripe Integration

### Setup

```bash
npm install stripe @stripe/stripe-js
```

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Price IDs (from Stripe Dashboard)
export const PRICE_IDS = {
  free: null,
  pro: 'price_xxx', // $49/month
  enterprise: 'price_yyy', // $199/month
} as const;
```

### Create Checkout Session

```typescript
// app/api/billing/create-checkout/route.ts
import { stripe, PRICE_IDS } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')!;
  const { plan } = await request.json();

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId }
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    success_url: `https://${tenant.slug}.yourapp.com/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://${tenant.slug}.yourapp.com/billing`,
    metadata: {
      tenant_id: tenantId,
    },
    customer_email: tenant.email,
  });

  return NextResponse.json({ url: session.url });
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(deletedSub);
      break;

    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailure(invoice);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata.tenant_id;
  
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      plan: subscription.items.data[0].price.lookup_key, // 'pro' or 'enterprise'
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
    },
  });
}
```

---

## Caching Patterns

### Redis with Upstash (Serverless)

```bash
npm install @upstash/redis
```

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class TenantCache {
  constructor(private tenantId: string) {}

  private key(suffix: string): string {
    return `tenant:${this.tenantId}:${suffix}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(this.key(key));
    return data as T | null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await redis.setex(this.key(key), ttlSeconds, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await redis.del(this.key(key));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(this.key(pattern));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')!;
  const cache = new TenantCache(tenantId);

  // Try cache first
  let templates = await cache.get<Template[]>('templates');

  if (!templates) {
    templates = await db.template.findMany({
      where: { tenant_id: tenantId },
    });
    await cache.set('templates', templates, 600); // 10 min TTL
  }

  return NextResponse.json(templates);
}
```

---

## Component Examples (shadcn/ui)

### Setup

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
```

### Material Selector Component

```typescript
// components/material-selector.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialSelectorProps {
  onAdd: (material: Material) => void;
}

export function MaterialSelector({ onAdd }: MaterialSelectorProps) {
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');

  const materials = MATERIALS[category] || [];

  return (
    <div className="flex gap-4">
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shingles">Shingles</SelectItem>
          <SelectItem value="underlayment">Underlayment</SelectItem>
          <SelectItem value="flashing">Flashing</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={material} 
        onValueChange={setMaterial}
        disabled={!category}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select material" />
        </SelectTrigger>
        <SelectContent>
          {materials.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name} - ${m.price}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        onClick={() => onAdd(materials.find(m => m.id === material)!)}
        disabled={!material}
      >
        Add Material
      </Button>
    </div>
  );
}
```

---

## Testing Setup

### Jest + React Testing Library

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

```typescript
// __tests__/estimate-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useEstimateStore } from '@/lib/store/estimate-store';

describe('EstimateStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEstimateStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should add material', () => {
    const { result } = renderHook(() => useEstimateStore());

    act(() => {
      result.current.addMaterial({
        name: 'Duration Shingles',
        quantity: 10,
        price: 100,
        total: 1000,
      });
    });

    expect(result.current.materials).toHaveLength(1);
    expect(result.current.materials[0].name).toBe('Duration Shingles');
  });

  it('should calculate totals correctly', () => {
    const { result } = renderHook(() => useEstimateStore());

    act(() => {
      result.current.addMaterial({
        name: 'Shingles',
        quantity: 10,
        price: 100,
        total: 1000,
      });
      result.current.addLabor({
        description: 'Installation',
        hours: 20,
        rate: 50,
        total: 1000,
      });
    });

    expect(result.current.getTotalMaterialCost()).toBe(1000);
    expect(result.current.getTotalLaborCost()).toBe(1000);
    expect(result.current.getGrandTotal()).toBe(2000);
  });
});
```

---

## Deployment

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "env": {
    "DATABASE_URL": "@database-url",
    "STRIPE_SECRET_KEY": "@stripe-secret",
    "CLERK_SECRET_KEY": "@clerk-secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_DOMAIN=yourapp.com
```

---

## Performance Monitoring

### Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Useful Commands

```bash
# Development
npm run dev

# Database
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Run migrations
npx prisma studio      # Open database GUI

# Testing
npm test
npm run test:watch

# Build & Deploy
npm run build
vercel deploy
vercel deploy --prod

# Stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Clerk Docs:** https://clerk.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Vercel Multi-Tenant Example:** https://vercel.com/templates/next.js/platforms-starter-kit

