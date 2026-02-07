# 🔧 Quick Fix Reference

## Common VS Code TypeScript Issues

### Issue: "Cannot find module" errors

**Symptoms:**

- Red squiggly lines on imports
- Error: `Cannot find module './providers'`
- Files clearly exist in the file explorer

**Quick Fix:**

```
1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter
```

**Alternative:**

```
1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type: "Reload Window"
3. Press Enter
```

---

### Issue: Tailwind CSS warnings

**Symptoms:**

- `Unknown at rule @tailwind`
- `Unknown at rule @apply`

**Fix:**
✅ Already fixed in `.vscode/settings.json`:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

**Note:** These are expected with Tailwind CSS and don't affect builds.

---

## Build Commands

### Development

```bash
npm run dev          # Start dev server (localhost:3000)
```

### Type Checking

```bash
npm run typecheck    # Check TypeScript types
```

### Linting

```bash
npm run lint         # Run ESLint
```

### Testing

```bash
npm test            # Run unit tests
npm run test:e2e    # Run E2E tests
npm run test:watch  # Watch mode
```

### Production

```bash
npm run build       # Create production build
npm start           # Serve production build
```

---

## Verification Checklist

Run these commands to verify everything works:

```bash
# 1. Type check (should pass with 0 errors)
npm run typecheck

# 2. Lint check (should pass with 0 errors)
npm run lint

# 3. Build check (should build successfully)
npm run build

# 4. Run tests (should pass)
npm test
```

---

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (protected)/       # Protected pages (dashboard)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # React Query & other providers
├── components/            # UI components
│   ├── ui/               # shadcn/ui components
│   └── app-shell/        # Layout components
├── features/             # Feature modules
│   ├── auth/            # Authentication
│   └── projects/        # Projects (example)
├── lib/                 # Utilities
│   ├── api/            # API client & error handling
│   ├── auth/           # Session management
│   └── utils/          # Helper functions
├── store/              # Zustand stores
├── tests/              # Test files
│   ├── unit/          # Unit tests
│   └── e2e/           # E2E tests
└── env.ts             # Environment validation
```

---

## Key Files

### Configuration

- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `tailwind.config.ts` - Tailwind CSS configuration

### Environment

- `.env.local` - Local environment variables (create this!)
- `env.ts` - Environment schema validation

### Package Management

- `package.json` - Dependencies & scripts

---

## Environment Setup

Create `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=NexusCare
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_ENABLE_MSW=false
```

---

## Backend Integration

### API Configuration

API client is configured in `lib/api/axios.ts`:

- Base URL: From `NEXT_PUBLIC_API_BASE_URL`
- Includes credentials for HttpOnly cookies
- JWT token management via interceptors

### Authentication Flow

1. User logs in → JWT tokens stored in localStorage
2. API requests include `Authorization: Bearer <token>`
3. Token refresh handled automatically
4. Logout clears tokens and redirects

---

## Common Tasks

### Add New Feature

```bash
# Create feature directory
mkdir -p features/my-feature

# Create files
touch features/my-feature/api.ts
touch features/my-feature/hooks.ts
touch features/my-feature/schemas.ts
touch features/my-feature/types.ts
```

### Add New Component

```bash
# shadcn/ui component
npx shadcn@latest add [component-name]

# Custom component
touch components/MyComponent.tsx
```

### Add New Page

```bash
# Public page
touch app/my-page/page.tsx

# Protected page
touch app/(protected)/my-page/page.tsx

# Auth page
touch app/(auth)/my-page/page.tsx
```

---

## Troubleshooting

### Build Fails

1. Clear cache: `rm -rf .next`
2. Reinstall: `rm -rf node_modules package-lock.json && npm install`
3. Check TypeScript: `npm run typecheck`
4. Check ESLint: `npm run lint`

### Type Errors

1. Restart TS Server (see above)
2. Check `tsconfig.json` paths
3. Verify imports match file structure

### Import Errors

1. Check file exists
2. Check export is correct
3. Restart TS Server
4. Check path aliases in `tsconfig.json`

---

## Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)

---

**Last Updated:** November 1, 2025
**Status:** ✅ All systems operational
