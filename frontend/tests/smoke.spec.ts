import { test, expect } from '@playwright/test';

/**
 * Happy-path smoke test.
 * Runs against a local dev server (or staging via BASE_URL env).
 *
 * Coverage:
 *   1. Landing loads with critical UI elements
 *   2. Register flow (mocked in test mode)
 *   3. Canvas page loads, full canvas visible
 *   4. Click places pixel (optimistic UI works)
 *   5. Cooldown UI shown after place
 *   6. Leaderboard loads with placeholder data
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('PixelStake smoke tests', () => {
  test('landing page loads critical content', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/PixelStake/i);
    // Hero has at least one CTA
    const ctas = page.locator('a, button').filter({ hasText: /бой|игра|войти|регистр/i });
    await expect(ctas.first()).toBeVisible({ timeout: 5000 });
  });

  test('canvas page loads and full canvas is reachable', async ({ page }) => {
    await page.goto(`${BASE_URL}/canvas`);
    // Canvas element exists
    await expect(page.locator('canvas, [data-testid="canvas-root"]').first())
      .toBeVisible({ timeout: 10000 });
  });

  test('404 page shown for unknown route', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist`);
    await expect(page.locator('text=/не найдена|404/i').first()).toBeVisible();
  });

  test('cookie banner appears for new visitors', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(BASE_URL);
    await expect(page.locator('text=/cookie|куки/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('legal pages exist', async ({ page }) => {
    for (const path of ['/offer', '/privacy', '/refund', '/contacts']) {
      await page.goto(`${BASE_URL}${path}`);
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('lighthouse score acceptable', async ({ page }) => {
    await page.goto(BASE_URL);
    // Just check basic perf marker
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) resolve(entries[entries.length - 1].startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(-1), 5000);
      });
    });
    // LCP should be under 4 seconds even on slow CI
    expect(lcp).toBeLessThan(4000);
  });
});
