# NexusCare Frontend - Production-Grade Next.js + TypeScript Application

A modern, blazing-fast healthcare management platform built with Next.js 14, TypeScript, and Django REST Framework backend.

## 🚀 Tech Stack

### Core

- **Next.js 15** (App Router) - React framework with SSR/SSG/RSC support
- **TypeScript** (Strict mode) - Type-safe development
- **React 19** - Latest React features

### Styling & UI

- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - High-quality, accessible component library built on Radix UI
- **Framer Motion** - Smooth animations and micro-interactions
- **Lucide React** - Beautiful icon library

### State Management

- **TanStack Query v5** - Powerful server state management
- **Zustand** - Lightweight client state management
- **React Hook Form** - Performant form library
- **Zod** - TypeScript-first schema validation

### API & Authentication

- **Axios** - HTTP client with interceptors
- **JWT Authentication** - Access + refresh token flow
- **Automatic token refresh** - Seamless auth experience

### Developer Experience

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Lint-staged** - Pre-commit checks

### Testing

- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **MSW** - API mocking

### Internationalization

- **react-i18next** - i18n support (English default, easy to add more)

## 📦 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ (comes with Node.js)
- **Django Backend** running at `http://localhost:8000`

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment:**

Copy `.env.local` and adjust if needed:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=NexusCare
NEXT_PUBLIC_ENV=development
```

3. **Initialize MSW (for API mocking):**

```bash
npm run msw:init
```

4. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (protected)/              # Protected routes (dashboard, etc.)
│   │   ├── dashboard/page.tsx
│   │   └── layout.tsx           # Auth guard
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home (redirects to dashboard)
│   ├── providers.tsx            # Query client provider
│   └── globals.css              # Global styles
│
├── components/                   # Reusable UI components
│   ├── ui/                      # Shadcn/UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── app-shell/               # App layout components
│       ├── AppShell.tsx
│       ├── AppHeader.tsx
│       └── AppSidebar.tsx
│
├── features/                     # Feature modules
│   ├── auth/                    # Authentication feature
│   │   ├── api.ts              # API endpoints
│   │   ├── schemas.ts          # Zod schemas
│   │   ├── hooks.ts            # React Query hooks
│   │   └── components/
│   │       └── LoginForm.tsx
│   └── projects/                # Projects feature (example CRUD)
│       ├── api.ts
│       ├── schemas.ts
│       ├── hooks.ts
│       └── components/
│
├── lib/                         # Core utilities
│   ├── api/
│   │   ├── axios.ts            # Axios instance
│   │   ├── interceptors.ts     # JWT interceptors
│   │   └── errors.ts           # Error handling
│   ├── auth/
│   │   └── session.ts          # Token management
│   ├── utils/
│   │   ├── cn.ts               # Class name utilities
│   │   └── format.ts           # Formatting utilities
│   ├── i18n/                   # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   └── queryClient.ts          # TanStack Query config
│
├── store/                       # Zustand stores
│   ├── useSession.ts           # Session state
│   └── useTheme.ts             # Theme state
│
├── tests/                       # Test files
│   ├── setup.ts                # Test setup
│   ├── unit/                   # Unit tests
│   └── e2e/                    # E2E tests
│
├── public/                      # Static assets
├── env.mjs                      # Environment validation
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Vitest config
├── playwright.config.ts        # Playwright config
└── package.json                # Dependencies & scripts
```

## 🔧 Available Scripts

```bash
# Development
npm run dev           # Start dev server (port 3000)
npm run build         # Build for production
npm run start         # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run typecheck     # Run TypeScript compiler check
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting

# Testing
npm test              # Run unit tests (Vitest)
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run E2E tests (Playwright)
npm run test:e2e:ui   # Run E2E tests with UI

# Utilities
npm run msw:init      # Initialize MSW for API mocking
npm run analyze       # Analyze bundle size
```

## 🔐 Authentication Flow

### JWT Token Management

The app uses JWT tokens with automatic refresh:

1. **Login**: POST to `/api/auth/login/` returns `{access, refresh, user}`
2. **Storage**: Tokens stored in `localStorage` (⚠️ see security note below)
3. **Requests**: Access token attached to all API requests via Axios interceptor
4. **Refresh**: On 401 error, automatically attempts token refresh once
5. **Logout**: Clears tokens and redirects to login

### Security Warning

**Current implementation stores tokens in localStorage which is vulnerable to XSS attacks.**

**Recommended for production:**

1. Configure Django to send JWT as HttpOnly cookies
2. Update `lib/auth/session.ts` to use cookies instead
3. Ensure CORS settings allow credentials:
   ```python
   # Django settings.py
   CORS_ALLOW_CREDENTIALS = True
   CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
   ```

### Route Protection

Protected routes use the `(protected)` layout which:

- Checks authentication status on mount
- Redirects unauthenticated users to `/login`
- Wraps content in `AppShell` component

## 🌐 API Integration

### Django REST Framework Setup

Ensure your Django backend has:

```python
# settings.py
INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
```

### Expected API Endpoints

```
POST   /api/auth/login/        # Login
POST   /api/auth/register/     # Register
POST   /api/auth/refresh/      # Refresh token
GET    /api/auth/me/           # Current user

GET    /api/projects/          # List projects (paginated)
POST   /api/projects/          # Create project
GET    /api/projects/:id/      # Get project
PATCH  /api/projects/:id/      # Update project
DELETE /api/projects/:id/      # Delete project
```

### Changing API Base URL

To point to staging/production:

1. Update `.env.local`:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.staging.yourapp.com
   ```

2. Rebuild the app:
   ```bash
   pnpm build
   ```

## 📊 Adding a New Feature Module

Follow the **features/** pattern for consistent architecture:

### 1. Create schemas (`features/newfeature/schemas.ts`)

```typescript
import { z } from 'zod';

export const newFeatureSchema = z.object({
  id: z.number(),
  name: z.string(),
  // ... other fields
});

export type NewFeature = z.infer<typeof newFeatureSchema>;
```

### 2. Create API functions (`features/newfeature/api.ts`)

```typescript
import { api } from '@/lib/api/axios';

export const newFeatureApi = {
  getAll: () => api.get('/api/newfeatures/'),
  getOne: (id: number) => api.get(`/api/newfeatures/${id}/`),
  create: (data: any) => api.post('/api/newfeatures/', data),
  update: (id: number, data: any) => api.patch(`/api/newfeatures/${id}/`, data),
  delete: (id: number) => api.delete(`/api/newfeatures/${id}/`),
};
```

### 3. Create hooks (`features/newfeature/hooks.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newFeatureApi } from './api';

export const newFeatureKeys = {
  all: ['newfeatures'] as const,
  lists: () => [...newFeatureKeys.all, 'list'] as const,
  list: (filters?: any) => [...newFeatureKeys.lists(), filters] as const,
  details: () => [...newFeatureKeys.all, 'detail'] as const,
  detail: (id: number) => [...newFeatureKeys.details(), id] as const,
};

export function useNewFeatures() {
  return useQuery({
    queryKey: newFeatureKeys.lists(),
    queryFn: newFeatureApi.getAll,
  });
}

export function useCreateNewFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: newFeatureApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newFeatureKeys.lists() });
    },
  });
}
```

### 4. Create components (`features/newfeature/components/`)

Build your UI components using the shared UI library.

### 5. Create page (`app/(protected)/newfeature/page.tsx`)

```typescript
'use client';

import { useNewFeatures } from '@/features/newfeature/hooks';

export default function NewFeaturePage() {
  const { data, isLoading } = useNewFeatures();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Run with UI
pnpm test:ui

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test:coverage
```

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/features/auth/schemas';

describe('loginSchema', () => {
  it('validates correct data', () => {
    const result = loginSchema.safeParse({
      username: 'user',
      password: 'pass',
    });
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run specific browser
pnpm test:e2e -- --project=chromium
```

### API Mocking (MSW)

Mock API responses during development:

1. Create `mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/auth/login/', () => {
    return HttpResponse.json({
      access: 'mock-token',
      refresh: 'mock-refresh',
      user: { id: 1, username: 'testuser' },
    });
  }),
];
```

2. Enable in `.env.local`:

```env
NEXT_PUBLIC_ENABLE_MSW=true
```

## 🎨 Styling Guidelines

### Using Tailwind

```tsx
// Use utility classes
<div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow-md">
  <Button size="lg" variant="primary">Click me</Button>
</div>

// Use cn() utility for conditional classes
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDanger ? 'danger-classes' : 'normal-classes'
)}>
```

### Theme Customization

Edit `tailwind.config.ts` to customize colors, spacing, etc.

CSS custom properties in `app/globals.css` for theme colors.

## ⚡ Performance Optimizations

### Implemented

- ✅ Bundle analysis with `@next/bundle-analyzer`
- ✅ Dynamic imports for large components
- ✅ Image optimization with `next/image`
- ✅ React Query with intelligent caching
- ✅ Code splitting via Next.js App Router
- ✅ Tree-shaking of unused code
- ✅ Tailwind CSS purge in production

### Checklist for Production

- [ ] Enable gzip/brotli compression on server
- [ ] Set up CDN for static assets
- [ ] Implement service worker for offline support
- [ ] Add error boundary components
- [ ] Configure proper cache headers
- [ ] Set up performance monitoring (e.g., Vercel Analytics)
- [ ] Optimize images (use WebP/AVIF)
- [ ] Lazy load images below the fold
- [ ] Prefetch critical routes

### Bundle Analysis

```bash
ANALYZE=true npm run build
```

Opens bundle analyzer in browser showing what's included in your bundles.

## 🐛 Troubleshooting

### CORS Errors

Ensure Django CORS settings allow requests from `http://localhost:3000`:

```python
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
```

### Authentication Issues

1. Check Django JWT settings:

   ```python
   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
       'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
   }
   ```

2. Verify tokens in browser DevTools → Application → Local Storage

3. Check Axios interceptor console logs

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Type check
pnpm typecheck
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test && pnpm test:e2e`
4. Ensure types are correct: `pnpm typecheck`
5. Format code: `pnpm format`
6. Submit PR

## 📄 License

MIT License - see LICENSE file

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
