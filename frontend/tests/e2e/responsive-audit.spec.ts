import { test, expect } from '@playwright/test';

type Size = { name: string; width: number; height: number };

const viewports: Size[] = [
  { name: 'mobile-small', width: 320, height: 740 },
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

const routes = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/appointments',
  '/patients',
  '/settings',
  '/records',
  '/health-summary',
  '/notifications',
];

test.describe('Responsive layout audit', () => {
  for (const route of routes) {
    test(`route ${route} has no horizontal overflow`, async ({ page }) => {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: 'networkidle' });

        // Allow any layout shifts to settle.
        await page.waitForTimeout(200);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const maxWidth = Math.max(
            doc.scrollWidth,
            doc.offsetWidth,
            body ? body.scrollWidth : 0,
            body ? body.offsetWidth : 0
          );
          const viewportWidth = window.innerWidth;
          return { maxWidth, viewportWidth };
        });

        expect(
          metrics.maxWidth,
          `Overflow on ${route} at ${vp.name} (${vp.width}x${vp.height}): maxWidth=${metrics.maxWidth}, viewportWidth=${metrics.viewportWidth}`
        ).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      }
    });
  }
});
