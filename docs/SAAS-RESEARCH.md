# SaaS Development Research Arsenal

**Purpose:** Comprehensive technical knowledge base for evolving the material calculator into a full multi-tenant SaaS product for the roofing industry.

**Last Updated:** February 4, 2026

---

## Table of Contents

1. [Multi-Tenant Architecture](#multi-tenant-architecture)
2. [Authentication & User Management](#authentication--user-management)
3. [Database Design](#database-design)
4. [PDF Parsing & Cross-Referencing](#pdf-parsing--cross-referencing)
5. [UI/UX Patterns](#uiux-patterns)
6. [Real-Time Features](#real-time-features)
7. [Payment & Subscription Management](#payment--subscription-management)
8. [Performance & Scaling](#performance--scaling)
9. [Tech Stack Recommendations](#tech-stack-recommendations)

---

## Multi-Tenant Architecture

### Why Subdomain-Based Tenancy Wins

**Research Source:** Next.js official docs, Vercel enterprise patterns, Vladimir Siedykh SaaS architecture guide

**Key Finding:** Subdomain-based multi-tenancy (`acme.yourapp.com`) consistently outperforms alternatives for SaaS applications.

**Comparison:**
- ❌ **Path-based** (`yourapp.com/acme`) - Security complexity, unprofessional URLs, custom domain nightmares
- ❌ **Database-per-tenant** - Management nightmare, linear cost scaling, backup complexity
- ✅ **Subdomain-based** - Professional URLs, custom domain support, natural security boundaries, scales efficiently

**Why It Matters for Roofing SaaS:**
- Each roofing company gets `ashleyriver.roofcalc.com`
- Easy to white-label for enterprise clients
- Natural data isolation between companies
- Professional appearance for B2B sales

### Implementation Pattern (Next.js)

```typescript
// middleware.ts - The foundation of subdomain multi-tenancy
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Skip processing for main domain and API routes
  if (subdomain === 'www' || subdomain === 'api') {
    return NextResponse.next();
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // Pass tenant context to your application
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);

  return response;
}
```

**Key Benefits:**
- Tenant resolution happens BEFORE application code runs
- Zero manual tenant filtering needed in most code
- Natural separation for analytics, billing, data

### Vercel's Official Multi-Tenant Pattern

**Source:** https://nextjs.org/docs/app/guides/multi-tenant

Vercel provides an official example: [Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit)

This is THE reference implementation for Next.js multi-tenant apps.

---

## Authentication & User Management

### Multi-Tenant Auth Challenges

**Research Source:** Clerk authentication guide, NextAuth.js patterns

**Core Challenge:** Managing TWO levels of access:
1. User identity (who you are)
2. Tenant membership (which companies you belong to)

**Real-World Scenario:**
A roofing estimator might work for multiple companies:
- Ashley River Roofing (admin role)
- Palmetto Contractors (viewer role)
- Charleston Roofers (owner role)

They need to seamlessly switch between companies with correct permissions in each.

### Recommended Auth Providers (by use case)

| Provider | Best For | Multi-Tenant Support | Edge Compatible | Setup Time |
|----------|----------|---------------------|-----------------|------------|
| **Clerk** | Next.js apps, component-first approach | ✅ Organizations built-in | ✅ Native | 15 min |
| **Auth0** | Enterprise features, compliance needs | ✅ Organizations (paid) | ✅ Via Actions | 2-4 hrs |
| **Supabase Auth** | When using Supabase for DB | ⚠️ Manual implementation | ✅ JWT mode | 1-2 hrs |
| **NextAuth.js** | Full control, self-hosted | ⚠️ DIY | ✅ With config | 1-2 weeks |

**For Your Roofing SaaS:** Clerk or Auth0 recommended.
- Clerk: Faster to market, better DX for Next.js
- Auth0: More enterprise features, better for complex SSO needs

### Authentication Architecture Pattern

```typescript
// Extend NextAuth.js with tenant memberships
export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Load user's tenant memberships into the token
        const memberships = await getUserTenantMemberships(user.id);
        token.tenants = memberships.map((m) => ({
          id: m.tenant.id,
          slug: m.tenant.slug,
          role: m.role, // owner, admin, member, viewer
        }));
      }
      return token;
    },

    async session({ session, token }) {
      // Make tenant info available in session
      session.user.tenants = token.tenants;
      return session;
    },
  },
};
```

### Role-Based Access Control (RBAC)

**Simple but Effective Pattern:**

```typescript
export const PERMISSIONS = {
  // Billing permissions
  MANAGE_BILLING: ['owner'],
  VIEW_INVOICES: ['owner', 'admin'],
  
  // User management
  INVITE_USERS: ['owner', 'admin'],
  REMOVE_USERS: ['owner'],
  
  // Material calculator permissions
  CREATE_ESTIMATES: ['owner', 'admin', 'estimator'],
  EDIT_PRICING: ['owner', 'admin'],
  VIEW_ESTIMATES: ['owner', 'admin', 'estimator', 'viewer'],
  EXPORT_PDF: ['owner', 'admin', 'estimator'],
  
  // Template management
  CREATE_TEMPLATES: ['owner', 'admin'],
  EDIT_TEMPLATES: ['owner', 'admin'],
  DELETE_TEMPLATES: ['owner'],
} as const;

export function hasPermission(
  userRole: string,
  permission: keyof typeof PERMISSIONS
): boolean {
  return PERMISSIONS[permission].includes(userRole);
}
```

**Recommended Roles for Roofing Companies:**
- **Owner** - Full access, billing, user management
- **Admin** - Manage estimates, pricing, templates
- **Estimator** - Create/edit estimates, view pricing
- **Viewer** - Read-only access to estimates

### Cross-Subdomain Sessions

**Critical for UX:** User logs in once at `yourapp.com`, session works across all tenant subdomains.

```typescript
// Configure cookies for cross-subdomain sessions
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: {
      domain: '.yourapp.com', // Works for all subdomains
      httpOnly: true,
      sameSite: 'lax',
    }
  }
}
```

---

## Database Design

### The Shared Database Pattern

**Research Consensus:** For most SaaS apps, shared database with tenant isolation is optimal.

**Why Shared Database Wins:**
- ✅ Simplest to manage
- ✅ Most cost-effective
- ✅ Easiest to scale horizontally
- ✅ Straightforward backups and migrations

**Alternatives (and why they're worse):**
- ❌ Database-per-tenant: Management nightmare, cost scales linearly
- ❌ Schema-per-tenant: PostgreSQL schema limits, migration hell

### Essential Multi-Tenant Schema Pattern

**Every tenant-scoped table needs:**
1. `tenant_id` column (UUID)
2. Foreign key to `tenants` table
3. Composite indexes for performance

```sql
-- Core tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- subdomain
  company_name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: Estimates table (tenant-scoped)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Composite indexes for multi-tenant queries
CREATE INDEX idx_estimates_tenant_created 
  ON estimates(tenant_id, created_at DESC);
```

**Why Composite Indexes Matter:**
Every query that filters by tenant AND sorts by another column needs a composite index. Without these, PostgreSQL does full table scans that get slower as data grows.

### PostgreSQL Row-Level Security (RLS)

**The Safety Net:** Enforce tenant isolation at DATABASE level, regardless of application bugs.

**How It Works:** RLS acts like invisible WHERE clauses on every query.

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Create automatic tenant filtering policy
CREATE POLICY tenant_isolation ON estimates
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Using RLS in Next.js:**

```typescript
// Set tenant context for the database session
export async function withTenantContext<T>(
  tenantId: string,
  operation: () => Promise<T>
): Promise<T> {
  await db.query('SET app.tenant_id = $1', [tenantId]);
  return operation();
}

// Use in API routes - queries are automatically tenant-filtered
export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');

  return withTenantContext(tenantId, async () => {
    const estimates = await db.estimate.findMany(); 
    // RLS automatically filters to current tenant
    return Response.json(estimates);
  });
}
```

**Benefits:**
- 🛡️ Protection against developer errors
- 🛡️ Protection against SQL injection
- 🛡️ Protection against buggy joins/subqueries
- 🛡️ Security layer that CANNOT be bypassed by application code

### Schema Design for Roofing SaaS

**Core Tables:**

```sql
-- Users (shared across tenants)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant memberships (users can belong to multiple tenants)
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- owner, admin, estimator, viewer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Pricing templates (tenant-scoped)
CREATE TABLE pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  material_prices JSONB NOT NULL, -- Store all material prices as JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material estimates (tenant-scoped)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES pricing_templates(id),
  pdf_url TEXT, -- Original uploaded PDF
  parsed_data JSONB, -- Structured data extracted from PDF
  materials_data JSONB, -- Calculated materials
  labor_data JSONB, -- Calculated labor
  total_cost DECIMAL(10,2),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_estimates_tenant_created ON estimates(tenant_id, created_at DESC);
CREATE INDEX idx_estimates_created_by ON estimates(created_by);
CREATE INDEX idx_templates_tenant ON pricing_templates(tenant_id);
```

---

## PDF Parsing & Cross-Referencing

### Current Implementation (What We've Built)

**Library:** `pdf-parse` (Node.js)

**Challenge:** PDFs concatenate table columns during text extraction:
- Original: `"Main Level F1 869.4 8.69 10"`
- Extracted: `"MainLevelF1869.48.6910"`

**Solution:** Validation-based parsing using relationship `squares ≈ sqft / 100`

**Key Files:**
- `parse-numbers.js` - Validation module
- `pdf-parser.js` - Extraction with pitch data handling

### Advanced PDF Parsing Options (For SaaS Version)

| Library | Language | Strengths | Use Case |
|---------|----------|-----------|----------|
| **pdf-parse** | Node.js | Simple, good for text extraction | Current solution ✅ |
| **pdf.js** | JavaScript | Browser + server, maintained by Mozilla | Client-side parsing |
| **pdfplumber** | Python | Best for tables, coordinates, layout | Complex table extraction |
| **Tabula** | Java/Python | Specifically for table extraction | When tables are critical |
| **Apache PDFBox** | Java | Enterprise-grade, very robust | Large-scale processing |
| **Camelot** | Python | Table extraction specialist | Research papers, complex layouts |

**Recommendation for Roofing SaaS:**

**Phase 1 (Current):** Keep `pdf-parse` - it's working well enough

**Phase 2 (Multi-user SaaS):** Consider hybrid approach:
- `pdf-parse` for basic extraction
- Add `pdfplumber` API endpoint (Python microservice) for complex PDFs
- Let users flag "difficult PDFs" that need advanced parsing

### Cross-Referencing Pattern (Future Feature)

**Scenario:** Parse multiple related documents and cross-reference data

```typescript
// Example: Cross-reference estimate PDFs with supplier invoices
interface ParsedDocument {
  id: string;
  type: 'estimate' | 'invoice' | 'work_order';
  extractedData: {
    items: Array<{ name: string; quantity: number; price?: number }>;
    totals: { subtotal: number; tax: number; total: number };
    metadata: { date: string; reference: string };
  };
}

// Cross-reference engine
class DocumentCrossReference {
  async findMatchingItems(
    estimate: ParsedDocument,
    invoice: ParsedDocument
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    
    for (const estimateItem of estimate.extractedData.items) {
      const invoiceMatch = invoice.extractedData.items.find(
        (item) => this.isSimilarItem(estimateItem.name, item.name)
      );
      
      if (invoiceMatch) {
        matches.push({
          estimateItem,
          invoiceMatch,
          quantityDiff: invoiceMatch.quantity - estimateItem.quantity,
          priceDiff: invoiceMatch.price - estimateItem.price,
        });
      }
    }
    
    return matches;
  }
  
  private isSimilarItem(name1: string, name2: string): boolean {
    // Fuzzy matching logic (e.g., Levenshtein distance)
    // "Duration Shingles" matches "Duration Shingle"
    return similarity(name1, name2) > 0.85;
  }
}
```

**Use Cases:**
- Compare estimate vs. actual invoice (cost overruns)
- Track material price changes over time
- Verify supplier quotes against historical pricing

---

## UI/UX Patterns

### Complex Form State Management

**Challenge:** Material calculator has:
- Multiple tabs (Materials, Labor, Pricing)
- Dynamic item lists (add/remove)
- Interdependent calculations
- Template system
- Real-time totals

**Current Approach:** React useState (works fine for single-user)

**For Multi-User SaaS:**

**Option 1: Zustand** (Recommended)
```typescript
// Lightweight, simple, great for forms
import create from 'zustand';

interface EstimateStore {
  materials: Material[];
  labor: LaborItem[];
  pricing: PricingTemplate;
  
  addMaterial: (item: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  
  // Computed values
  get totalCost(): number;
}

const useEstimateStore = create<EstimateStore>((set, get) => ({
  materials: [],
  labor: [],
  pricing: defaultPricing,
  
  addMaterial: (item) => set((state) => ({
    materials: [...state.materials, item]
  })),
  
  get totalCost() {
    const { materials, labor } = get();
    return calculateTotal(materials, labor);
  }
}));
```

**Option 2: React Hook Form** (For complex validation)
```typescript
// Best for forms with complex validation rules
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const estimateSchema = z.object({
  materials: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().positive(),
    price: z.number().positive(),
  })),
  labor: z.array(z.object({
    description: z.string(),
    hours: z.number().positive(),
    rate: z.number().positive(),
  })),
});

function EstimateForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(estimateSchema),
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  });
  
  // Form automatically validates, handles errors
}
```

**Recommendation:** Start with Zustand, add React Hook Form if validation becomes complex.

### Dropdown & Cascading Selectors

**Pattern for Material Selection:**

```typescript
// Hierarchical material selector
interface MaterialCategory {
  id: string;
  name: string;
  subcategories: MaterialSubcategory[];
}

function MaterialSelector() {
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  
  const categories = useMaterialCategories(); // From API or Zustand
  const subcategories = category 
    ? categories.find(c => c.id === category)?.subcategories 
    : [];
  const materials = subcategory
    ? getMaterialsBySubcategory(subcategory)
    : [];
  
  return (
    <div className="flex gap-4">
      <Select value={category} onChange={setCategory}>
        {categories.map(c => <option value={c.id}>{c.name}</option>)}
      </Select>
      
      <Select 
        value={subcategory} 
        onChange={setSubcategory}
        disabled={!category}
      >
        {subcategories.map(s => <option value={s.id}>{s.name}</option>)}
      </Select>
      
      <Select disabled={!subcategory}>
        {materials.map(m => <option value={m.id}>{m.name}</option>)}
      </Select>
    </div>
  );
}
```

### Component Libraries (Modern Recommendations)

| Library | Style | Best For | Customization |
|---------|-------|----------|---------------|
| **shadcn/ui** | Headless, Tailwind | Full control, modern apps | High |
| **Radix UI** | Headless, unstyled | Accessibility-first | High |
| **Mantine** | Full-featured, styled | Fast development | Medium |
| **Chakra UI** | Component library | Rapid prototyping | Medium |
| **Ant Design** | Enterprise | Complex dashboards | Low |

**Recommendation for Roofing SaaS:** **shadcn/ui** or **Radix UI** + Tailwind
- Modern, accessible components
- Full control over styling
- Not bloated
- Works great with Next.js

**Example with shadcn/ui:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

---

## Real-Time Features

### The Serverless Challenge

**Problem:** Next.js on Vercel (serverless) can't maintain persistent WebSocket connections.

**Solutions:**

#### Option 1: Server-Sent Events (SSE) - Simple Updates

**Best For:** One-way updates (notifications, status changes, activity feeds)

```typescript
// API route: app/api/notifications/route.ts
export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Listen to database changes
      const listener = (notification: any) => {
        if (notification.tenant_id === tenantId) {
          const data = `data: ${JSON.stringify(notification)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      };

      subscribeToNotifications(tenantId, listener);

      request.signal.addEventListener('abort', () => {
        unsubscribeFromNotifications(tenantId, listener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

#### Option 2: Third-Party Real-Time Services

**For Complex Features (collaborative editing, live presence, etc.):**

| Service | Best For | Pricing | Complexity |
|---------|----------|---------|------------|
| **Ably** | Enterprise real-time | Usage-based | Medium |
| **Pusher** | Simple pub/sub | Free tier, then $$$ | Low |
| **Supabase Realtime** | If using Supabase | Included | Low |
| **PartyKit** | Collaborative features | Developer-friendly | Medium |

**Example with Pusher:**
```typescript
// Server: Trigger event when estimate is updated
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'us2',
});

export async function updateEstimate(tenantId: string, estimateId: string) {
  const estimate = await db.estimate.update({
    where: { id: estimateId },
    data: { /* updates */ },
  });
  
  // Broadcast to all users watching this estimate
  await pusher.trigger(
    `tenant-${tenantId}`,
    'estimate-updated',
    { estimateId, data: estimate }
  );
  
  return estimate;
}

// Client: Subscribe to updates
import Pusher from 'pusher-js';

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: 'us2',
});

const channel = pusher.subscribe(`tenant-${tenantId}`);
channel.bind('estimate-updated', (data) => {
  console.log('Estimate updated:', data);
  // Refresh UI
});
```

**Recommendation for Roofing SaaS:**
- **Phase 1:** SSE for simple notifications
- **Phase 2:** Add Pusher if you need collaborative features

---

## Payment & Subscription Management

### Stripe for Roofing SaaS

**Why Stripe:** Industry standard, best developer experience, handles complexity.

**Key Features Needed:**
- ✅ Subscription management
- ✅ Usage-based billing (if pricing by estimates/users)
- ✅ Invoicing
- ✅ Customer portal (users manage their own billing)

### Plan Structure Recommendation

```typescript
// Recommended pricing tiers for roofing SaaS
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      estimates: 5, // per month
      users: 1,
      storage_mb: 100,
      pdf_exports: 10,
    },
  },
  pro: {
    name: 'Pro',
    price: 49, // per month
    limits: {
      estimates: 100,
      users: 5,
      storage_mb: 5000,
      pdf_exports: -1, // unlimited
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 199, // per month
    limits: {
      estimates: -1, // unlimited
      users: -1,
      storage_mb: 50000,
      pdf_exports: -1,
      custom_branding: true,
      api_access: true,
    },
  },
} as const;
```

### Stripe Integration Pattern

```typescript
// Create checkout session
export async function createCheckoutSession(tenantId: string, plan: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: STRIPE_PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    success_url: `https://${getTenantSlug(tenantId)}.yourapp.com/billing/success`,
    cancel_url: `https://${getTenantSlug(tenantId)}.yourapp.com/billing`,
    metadata: { tenant_id: tenantId },
  });
  
  return session;
}

// Webhook to handle subscription events
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')!;
  const body = await request.text();

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await updateTenantSubscription(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }

  return new Response('OK');
}
```

### Enforcing Plan Limits

```typescript
// Middleware to check limits before actions
export async function checkEstimateLimit(tenantId: string) {
  const tenant = await getTenant(tenantId);
  const plan = PLANS[tenant.plan];
  
  if (plan.limits.estimates === -1) {
    return true; // unlimited
  }
  
  const currentCount = await getEstimateCountThisMonth(tenantId);
  
  if (currentCount >= plan.limits.estimates) {
    throw new Error('Plan limit reached. Please upgrade.');
  }
  
  return true;
}

// Use in API routes
export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  
  await checkEstimateLimit(tenantId); // Throws if limit exceeded
  
  // Create estimate...
}
```

---

## Performance & Scaling

### Database Performance at Scale

**The Problem:** Queries slow down as tenants and data grow.

**The Solution:** Strategic indexing for multi-tenant patterns.

```sql
-- Essential indexes for multi-tenant performance
CREATE INDEX idx_estimates_tenant_created 
  ON estimates(tenant_id, created_at DESC);

CREATE INDEX idx_estimates_tenant_status 
  ON estimates(tenant_id, status) 
  WHERE status != 'archived'; -- Partial index

CREATE INDEX idx_materials_tenant 
  ON materials(tenant_id);
```

**Why Composite Indexes Matter:**
Every query that filters by `tenant_id` AND sorts by another column needs a composite index.

```sql
-- This query needs idx_estimates_tenant_created
SELECT * FROM estimates 
WHERE tenant_id = $1 
ORDER BY created_at DESC 
LIMIT 20;

-- Without the composite index, PostgreSQL does:
-- 1. Filter by tenant (slow)
-- 2. Sort all results (slower)
-- With the composite index, PostgreSQL:
-- 1. Use index to get pre-sorted results instantly
```

### Caching Strategy

**Pattern: Tenant-Aware Caching**

```typescript
// Prevent cache pollution between tenants
export class TenantCache {
  constructor(private tenantId: string) {}

  private key(suffix: string): string {
    return `tenant:${this.tenantId}:${suffix}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return await redis.get(this.key(key));
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await redis.setex(this.key(key), ttl, JSON.stringify(value));
  }
}

// Usage in API routes
export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  const cache = new TenantCache(tenantId);
  
  // Check cache first
  let templates = await cache.get<Template[]>('templates');
  
  if (!templates) {
    templates = await db.template.findMany({
      where: { tenant_id: tenantId },
    });
    await cache.set('templates', templates, 600); // 10 min TTL
  }
  
  return Response.json(templates);
}
```

### Edge Computing with Vercel

**What Runs on Edge:**
- ✅ Authentication checks
- ✅ Tenant resolution (middleware)
- ✅ Static content delivery
- ✅ Simple API routes (no database)

**What Needs Serverless Functions:**
- ✅ Database queries
- ✅ PDF processing
- ✅ Complex calculations
- ✅ Third-party API calls

**Performance Tips:**
- Use Next.js Server Components to fetch data before rendering
- Implement optimistic UI updates
- Cache tenant-specific data aggressively
- Use Vercel Analytics to monitor real performance

---

## Tech Stack Recommendations

### Complete Tech Stack for Roofing SaaS

**Frontend:**
- ✅ **Next.js 14+** (App Router)
- ✅ **React** (Server Components + Client Components)
- ✅ **TypeScript** (type safety is critical)
- ✅ **Tailwind CSS** (styling)
- ✅ **shadcn/ui** (component library)
- ✅ **Zustand** (state management)
- ✅ **React Hook Form** (complex forms)

**Backend:**
- ✅ **Next.js API Routes** (primary backend)
- ✅ **PostgreSQL** (database)
- ✅ **Prisma** or **Drizzle ORM** (database access)
- ✅ **Redis** (caching - Upstash recommended for serverless)

**Authentication:**
- ✅ **Clerk** (recommended) or **Auth0**

**Storage:**
- ✅ **Vercel Blob** (PDF storage)
- ✅ **Cloudflare R2** (if need cheaper bulk storage)

**Payment:**
- ✅ **Stripe** (subscriptions, invoicing)

**Real-Time:**
- ✅ **Server-Sent Events** (simple notifications)
- ✅ **Pusher** or **Ably** (if need collaborative features)

**Hosting:**
- ✅ **Vercel** (Next.js hosting)
- ✅ **Supabase** (PostgreSQL hosting)
- ✅ **Upstash** (Redis hosting)

**Monitoring:**
- ✅ **Vercel Analytics** (performance)
- ✅ **Sentry** (error tracking)
- ✅ **PostHog** or **Mixpanel** (product analytics)

### Development Workflow

```bash
# Recommended project structure
roofing-saas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (app)/             # Main app (requires auth)
│   │   ├── [tenant]/      # Tenant-scoped routes
│   │   │   ├── dashboard/
│   │   │   ├── estimates/
│   │   │   ├── pricing/
│   │   │   └── settings/
│   ├── api/               # API routes
│   └── middleware.ts      # Tenant resolution
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── lib/                   # Utilities
│   ├── db/               # Database helpers
│   ├── auth/             # Auth helpers
│   └── pdf/              # PDF parsing
├── prisma/                # Database schema
└── tests/                 # Tests
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Next.js + TypeScript + Tailwind
- [ ] Configure Vercel deployment
- [ ] Set up PostgreSQL (Supabase)
- [ ] Implement subdomain routing (middleware)
- [ ] Basic database schema with RLS
- [ ] Authentication (Clerk or Auth0)
- [ ] Tenant onboarding flow

### Phase 2: Core Features (Week 3-4)
- [ ] Migrate material calculator to multi-tenant
- [ ] Pricing templates (per tenant)
- [ ] User management (invite, roles, permissions)
- [ ] PDF upload and parsing (tenant-scoped)
- [ ] Material/labor calculations (current logic)
- [ ] PDF generation (invoices)

### Phase 3: Business Logic (Week 5-6)
- [ ] Plan limits enforcement
- [ ] Stripe subscription flow
- [ ] Customer billing portal
- [ ] Usage tracking
- [ ] Email notifications
- [ ] Basic analytics

### Phase 4: Polish & Scale (Week 7-8)
- [ ] Performance optimization (caching, indexes)
- [ ] Real-time notifications (SSE)
- [ ] Advanced PDF parsing features
- [ ] Team collaboration features
- [ ] Mobile responsiveness
- [ ] Documentation

### Phase 5: Launch (Week 9-10)
- [ ] Security audit
- [ ] Load testing
- [ ] Onboarding flow optimization
- [ ] Marketing site
- [ ] Beta customer onboarding

---

## Key Lessons from Research

### Architecture Decisions

1. **Multi-tenancy is NOT a feature** - It's a foundational architecture. Build it from day one.

2. **Subdomain-based tenancy wins** - Professional URLs, custom domain support, natural security boundaries.

3. **Shared database + RLS** - Simplest to manage, most cost-effective, safest with proper RLS.

4. **Edge for routing, serverless for data** - Middleware resolves tenants on edge, API routes handle data.

### Authentication

5. **Use a managed provider** - Building auth from scratch is 2-4 weeks of work. Clerk/Auth0 is 15 minutes.

6. **JWT-based sessions** - Eliminates database calls for every request, scales infinitely.

7. **User can belong to multiple tenants** - Better UX, matches real-world (contractors work for multiple companies).

### Database

8. **Composite indexes are CRITICAL** - Every `tenant_id + sort_column` query needs a composite index.

9. **Row-Level Security is your safety net** - Protects against application bugs, SQL injection, developer errors.

10. **JSONB for flexible data** - Pricing templates, parsed PDF data, etc. Perfect for evolving schemas.

### Performance

11. **Cache aggressively with tenant isolation** - Key pattern: `tenant:{id}:{resource}`.

12. **Server Components for instant load** - Fetch data on server, render complete HTML, send to client.

13. **Optimistic UI updates** - Users expect instant feedback, sync to server in background.

### Business

14. **Start with free tier** - Get users in the door, convert to paid after they see value.

15. **Enforce limits softly first** - Warn before blocking, offer easy upgrade path.

16. **Usage-based pricing scales better** - Aligns your revenue with customer value.

---

## Next Steps

1. **Review this document** with team/client
2. **Prioritize features** for MVP
3. **Set up development environment** (Next.js, Supabase, Clerk)
4. **Start with Phase 1 foundation** (subdomain routing, auth, basic schema)
5. **Migrate existing calculator** to multi-tenant architecture
6. **Iterate based on user feedback**

---

**Remember:** The foundation you build determines your scaling ceiling. Build multi-tenancy right from the start, and you'll never have to rebuild.

**Questions?** This is a living document. Update as you learn more.

