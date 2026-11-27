import { test, expect } from '@playwright/test';
import { backend, login } from '../support/backend';

test.describe('CRS-01 Coach Course Management', () => {
  test.beforeEach(async ({ page }) => {
    await backend(page, { academy: true });
    await login(page);
  });

  test('CRS-01-SC-001: Current authenticated Coach sees a Courses button on Today. Enter opens heading Courses, the honest pilot label and an empty state "No courses yet" with Create course. Existing five tabs remain.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Courses' }).click();
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
    await expect(page.getByText('Course pilot — not synced')).toBeVisible();
    await expect(page.getByText('No courses yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create course' })).toBeVisible();
    const tabs = ['Today', 'Classes', 'Roster', 'Attendance', 'Observations'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
  });

  test('CRS-01-SC-002: Create course form provides accessible labels Course title, Stage 1 title, Stage 1 objective 1; Save draft validates a blank title visibly ("Course title is required"), without discarding the other inputs or creating a course.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Courses' }).click();
    await page.getByRole('button', { name: 'Create course' }).click();
    await expect(page.getByLabel('Course title')).toBeVisible();
    await expect(page.getByLabel('Stage 1 title')).toBeVisible();
    await expect(page.getByLabel('Stage 1 objective 1')).toBeVisible();
    await page.getByLabel('Stage 1 title').fill('Introduction');
    await page.getByLabel('Stage 1 objective 1').fill('Learn basics');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Course title is required')).toBeVisible();
    await expect(page.getByLabel('Stage 1 title')).toHaveValue('Introduction');
    await expect(page.getByLabel('Stage 1 objective 1')).toHaveValue('Learn basics');
    await page.getByLabel('Course title').fill('Valid Title');
    await expect(page.getByText('Course title is required')).not.toBeVisible();
  });

  test('CRS-01-SC-003: A valid draft can have multiple ordered stages and objectives. Add stage creates Stage 2 title and Stage 2 objective 1. Add objective to stage 1 creates Stage 1 objective 2. Save draft returns to list, showing title and Draft, and Edit course restores all fields.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Courses' }).click();
    await page.getByRole('button', { name: 'Create course' }).click();
    await page.getByLabel('Course title').fill('Math Fundamentals');
    await page.getByLabel('Stage 1 title').fill('Addition');
    await page.getByLabel('Stage 1 objective 1').fill('Add single digits');
    await page.getByRole('button', { name: 'Add stage' }).click();
    await expect(page.getByLabel('Stage 2 title')).toBeVisible();
    await expect(page.getByLabel('Stage 2 objective 1')).toBeVisible();
    await page.getByLabel('Stage 2 title').fill('Subtraction');
    await page.getByLabel('Stage 2 objective 1').fill('Subtract single digits');
    await page.getByRole('button', { name: 'Add objective to stage 1' }).click();
    await expect(page.getByLabel('Stage 1 objective 2')).toBeVisible();
    await page.getByLabel('Stage 1 objective 2').fill('Add double digits');
    const order = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      return inputs.map(el => el.getAttribute('aria-label') || el.id);
    });
    const idx1 = order.indexOf('Stage 1 title');
    const idx2 = order.indexOf('Stage 2 title');
    expect(idx1).toBeLessThan(idx2);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Math Fundamentals')).toBeVisible();
    await expect(page.getByText('Draft')).toBeVisible();
    await page.getByRole('button', { name: 'Edit course' }).click();
    await expect(page.getByLabel('Course title')).toHaveValue('Math Fundamentals');
    await expect(page.getByLabel('Stage 1 title')).toHaveValue('Addition');
    await expect(page.getByLabel('Stage 1 objective 1')).toHaveValue('Add single digits');
    await expect(page.getByLabel('Stage 1 objective 2')).toHaveValue('Add double digits');
    await expect(page.getByLabel('Stage 2 title')).toHaveValue('Subtraction');
    await expect(page.getByLabel('Stage 2 objective 1')).toHaveValue('Subtract single digits');
  });

  test('CRS-01-SC-004: Publish version requires a confirmation with button Confirm publish. A successful local publish shows Version 1; edit and publish a changed title creates Version 2. View history shows both Version 1 and Version 2 and their original titles, not overwritten.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Courses' }).click();
    await page.getByRole('button', { name: 'Create course' }).click();
    await page.getByLabel('Course title').fill('Science Basics');
    await page.getByLabel('Stage 1 title').fill('Matter');
    await page.getByLabel('Stage 1 objective 1').fill('Identify states of matter');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Publish version' }).click();
    await expect(page.getByRole('button', { name: 'Confirm publish' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm publish' }).click();
    await expect(page.getByText('Version 1')).toBeVisible();
    await page.getByRole('button', { name: 'Edit course' }).click();
    await page.getByLabel('Course title').fill('Science Basics Updated');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Publish version' }).click();
    await page.getByRole('button', { name: 'Confirm publish' }).click();
    await expect(page.getByText('Version 2')).toBeVisible();
    await page.getByRole('button', { name: 'View history' }).click();
    const historyText = await page.locator('body').innerText();
    const v1Count = (historyText.match(/Version 1/g) || []).length;
    const v2Count = (historyText.match(/Version 2/g) || []).length;
    expect(v1Count).toBeGreaterThan(0);
    expect(v2Count).toBeGreaterThan(0);
    expect(historyText).toContain('Science Basics');
    expect(historyText).toContain('Science Basics Updated');
  });

  test('CRS-01-SC-005: Leaving a dirty course form via Today opens existing "Leave your unsaved changes?" confirmation; Keep editing preserves input; Discard and leave abandons it.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    await page.getByRole('button', { name: 'Courses' }).click();
    await page.getByRole('button', { name: 'Create course' }).click();
    await page.getByLabel('Course title').fill('Dirty Course');
    await page.getByLabel('Stage 1 title').fill('Dirty Stage');
    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByText('Leave your unsaved changes?')).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page.getByLabel('Course title')).toHaveValue('Dirty Course');
    await expect(page.getByLabel('Stage 1 title')).toHaveValue('Dirty Stage');
    await page.getByRole('tab', { name: 'Today' }).click();
    await expect(page.getByText('Leave your unsaved changes?')).toBeVisible();
    await page.getByRole('button', { name: 'Discard and leave' }).click();
    await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible();
    await expect(page.getByLabel('Course title')).not.toBeVisible();
  });

  test('CRS-01-SC-006: A draft saved in the authenticated pilot session remains when navigating Today → Courses, and no course/curriculum network request was sent. The user is not told the draft is synced.', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Courses' })).toBeVisible();
    const requests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('course') || url.includes('curriculum')) {
        requests.push(url);
      }
    });
    await page.getByRole('button', { name: 'Courses' }).click();
    await page.getByRole('button', { name: 'Create course' }).click();
    await page.getByLabel('Course title').fill('Persistent Draft');
    await page.getByLabel('Stage 1 title').fill('Stage One');
    await page.getByLabel('Stage 1 objective 1').fill('Objective One');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Persistent Draft')).toBeVisible();
    await page.getByRole('tab', { name: 'Today' }).click();
    await page.getByRole('tab', { name: 'Courses' }).click();
    await expect(page.getByText('Persistent Draft')).toBeVisible();
    const calls = await page.evaluate(() => (window as any).__coachFixture?.calls ?? []);
    const courseCalls = (calls as string[]).filter((c) => c.toLowerCase().includes('course') || c.toLowerCase().includes('curriculum'));
    expect(courseCalls).toHaveLength(0);
    expect(requests).toHaveLength(0);
    await expect(page.getByText(/synced/i)).not.toBeVisible();
  });
});
