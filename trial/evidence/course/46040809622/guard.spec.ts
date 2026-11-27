import { test, expect } from '@playwright/test';
import { backend, login } from '../support/backend';

test.describe('CRS-01 Guard', () => {
  test('GUARD-CRS-FLAG-OFF: Feature flag off hides Courses button and prevents course/curriculum traffic.', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('course') || url.includes('curriculum')) {
        requests.push(url);
      }
    });
    await backend(page, { academy: true });
    await login(page);
    await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Courses' })).not.toBeVisible();
    const calls = await page.evaluate(() => (window as any).__coachFixture?.calls ?? []);
    const courseCalls = (calls as string[]).filter((c) => c.toLowerCase().includes('course') || c.toLowerCase().includes('curriculum'));
    expect(courseCalls).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });
});
