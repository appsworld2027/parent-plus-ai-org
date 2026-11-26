// NEW-HOOKS: /^\d+ fees? overdue/ | needs-you-fees-wallet | needs-you-fees-chevron | fees-overdue-section | fees-overdue-row | /Fees could not load\. Reference: .+/ | /Feedback could not load\. Reference: .+/
// LOCKED acceptance tests for docs/product/needs-you-fees-overdue/ACCEPTANCE.md (AI Org AGENTS.md §7A).
// First draft by Quinn (QA, 8a6f38e); corrected in CPTO review (ITER14-PPDEV) because 11 of 18 tests could never pass:
// a fixture student who always needs feedback blocked every "All caught up" check, two tests referenced an undefined
// variable, the failure switches they used (failStudent, failObservation, holdObservation) only affect writes, and the
// 600-student amount was 10x off the contract (₹7,050 instead of ₹70,500 each).
// Only an `ai:contract` PR may change this file; a build PR must make these pass WITHOUT editing, skipping or deleting
// them (contract-lock enforces it).
//
// Hooks the build must provide (behaviour, not styling):
//   Today  - "Needs you" fees item: a button whose accessible name starts "N fee(s) overdue", showing "₹X pending",
//            with testIDs `needs-you-fees-wallet` and `needs-you-fees-chevron` inside it.
//          - partial-failure lines "Fees could not load. Reference: …" / "Feedback could not load. Reference: …".
//   Fees   - a heading "Overdue" and a container `fees-overdue-section` holding one `fees-overdue-row` per student,
//            each row showing student, batch, billing month(s) and amount still due; oldest first; above the monthly overview.
// Overdue amounts must be read from the `fee_invoice_balances` view (it already leaves test payments out of balance_paise);
// the tests fail, hold and count reads of that view.
// Test support: e2e/support/feesBackend.ts must answer fee_invoice_balances reads that are not limited to one
// billing month and return more than 50 rows when asked (fixture gap for Dev; record it in the Demo Pack).
import { expect, test, type Page } from '@playwright/test';
import { login } from '../support/backend';
import { feesBackend } from '../support/feesBackend';
import type { Invoice } from '../../src/fees/model';

const RIA = '00000000-0000-0000-0000-000000000021'; // the fixture's ready-class student (always enrolled)
const ZOYA = '10000000-0000-0000-0000-000000000022';
const KABIR = '10000000-0000-0000-0000-000000000023';
const CLAY = 'Fictional Clay Class'; // the fixture's batch

const heading = (page: Page) => page.getByRole('heading', { name: 'Needs you', exact: true });
const feedbackItem = (page: Page) => page.getByRole('button', { name: /\d+ (child needs|children need) feedback/ });
const feesItem = (page: Page) => page.getByRole('button', { name: /^\d+ fees? overdue/ });
const wholeCardError = (page: Page) => page.getByText(/Needs you list could not load\. Reference: .+/);

declare global {
  interface Window { __needsYouNet: { offline: boolean; failFeedback: boolean; failFees: boolean; holdAll: boolean; holdFees: boolean } }
}

// Coach + fees fixtures, plus a network layer (installed last, so the app uses it) that can fail or hold READS.
async function openToday(page: Page) {
  await feesBackend(page); // also installs the coach backend with the ready class
  await page.addInitScript(() => {
    const net = window.__needsYouNet = { offline: false, failFeedback: false, failFees: false, holdAll: false, holdFees: false };
    const inner = window.fetch.bind(window);
    const fail = (message: string) => new Response(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
      if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/rest/v1/')) {
        const fees = url.pathname.endsWith('/fee_invoice_balances');
        while (net.holdAll || (fees && net.holdFees)) await new Promise(resolve => setTimeout(resolve, 20));
        if (net.offline) throw new TypeError('Failed to fetch');
        if (net.failFees && fees) return fail('Fictional fees read failure');
        if (net.failFeedback && /\/(observations|observation_recipients)$/.test(url.pathname)) return fail('Fictional feedback read failure');
      }
      return inner(input, init);
    };
  });
  await login(page);
  await expect(heading(page)).toBeVisible();
}
// Leave and re-open Today so it loads fresh records.
async function reopenToday(page: Page) {
  await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
}
async function addStudent(page: Page, student: { id: string; name: string; archived?: boolean; ended?: boolean }) {
  await page.evaluate(value => {
    const roster = window.__coachFixture.roster;
    roster.students.push({ id: value.id, name: value.name, age_years: 7, archived_at: value.archived ? '2026-01-01T00:00:00.000Z' : null });
    roster.enrolments.push({ id: `e-${value.id}`, student_id: value.id, batch_id: roster.batches[0].id,
      starts_on: '2020-01-01', ends_on: value.ended ? '2020-06-30' : null });
  }, student);
}
// A feedback note recorded now for these students, so they do not need feedback.
async function recordFeedbackFor(page: Page, studentIds: string[]) {
  await page.evaluate(ids => {
    const state = window.__coachFixture, now = new Date().toISOString(), id = crypto.randomUUID();
    state.observations.push({ id, academy_id: 'academy-test', batch_id: state.roster.batches[0].id, session_id: null,
      note: 'Fictional note: steady progress.', status: 'recorded', audience: 'student', revision: 1,
      author_id: '00000000-0000-0000-0000-000000000001', created_at: now, updated_at: now, recorded_at: now });
    state.observationRecipients[id] = ids;
  }, studentIds);
}
// Adds an invoice for the student's enrolment (ended enrolments included) and returns its id.
async function addInvoice(page: Page, inv: { student: string; month: string; due: string; paise: number; voided?: boolean }) {
  return page.evaluate(value => {
    const roster = window.__coachFixture.roster;
    const enrolment = roster.enrolments.find(e => e.student_id === value.student)!;
    const batch = roster.batches.find(b => b.id === enrolment.batch_id)!;
    const student = roster.students.find(s => s.id === value.student)!;
    const row: Invoice = { id: crypto.randomUUID(), academy_id: 'academy-test', enrolment_id: enrolment.id!, billing_month: value.month,
      due_on: value.due, amount_paise: value.paise, paid_paise: 0, balance_paise: value.paise, excess_paise: 0, test_paise: 0,
      student_name: student.name, batch_name: batch.name, created_at: new Date().toISOString(),
      created_by: '00000000-0000-0000-0000-000000000001', voided_at: value.voided ? new Date().toISOString() : null,
      voided_by: value.voided ? '00000000-0000-0000-0000-000000000001' : null, void_reason: value.voided ? 'Fictional void' : null };
    window.__feeFixture.invoices.push(row);
    return row.id;
  }, inv);
}
async function addPayment(page: Page, invoice: string, paise: number, mode: 'live' | 'test') {
  await page.evaluate(value => {
    window.__feeFixture.payments.push({ id: crypto.randomUUID(), invoice_id: value.invoice, request_id: crypto.randomUUID(),
      amount_paise: value.paise, source: 'manual', mode: value.mode, paid_on: '2026-10-20', method: 'cash', reference: null,
      recorded_at: new Date().toISOString(), recorded_by: '00000000-0000-0000-0000-000000000001', reversal: null });
  }, { invoice, paise, mode });
}
async function expectFees(page: Page, text: string, pending: string) {
  await expect(feesItem(page)).toHaveCount(1);
  await expect(feesItem(page)).toContainText(text);
  await expect(feesItem(page)).toContainText(`${pending} pending`);
}
async function expectAllCaughtUp(page: Page) {
  await expect(page.getByText('All caught up', { exact: true })).toBeVisible();
  await expect(page.getByText('New requests will show here', { exact: true })).toBeVisible();
  await page.waitForTimeout(1500); // must stay caught up after loading settles
  await expect(feedbackItem(page)).toHaveCount(0);
  await expect(feesItem(page)).toHaveCount(0);
}
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Excluded invoices: first alone ("All caught up", as the contract says), then next to a genuinely overdue student,
// so the test also fails while the feature is missing and catches an implementation that counts the excluded invoice.
async function expectExcludedThenCountsOnlyTheGenuineOne(page: Page, exclude: { student: string; name: string; archived?: boolean; ended?: boolean },
  invoice: { month: string; due: string; voided?: boolean }) {
  await addStudent(page, { id: exclude.student, name: exclude.name, archived: exclude.archived, ended: exclude.ended });
  await addInvoice(page, { student: exclude.student, paise: 250000, ...invoice });
  await recordFeedbackFor(page, [RIA, exclude.student]);
  await reopenToday(page);
  await expectAllCaughtUp(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [ZOYA]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 150000 });
  await reopenToday(page);
  await expectFees(page, '1 fee overdue', '₹1,500');
}

test.describe.configure({ retries: 0 });
test.setTimeout(60000);

test('AC-01 two students overdue show "2 fees overdue" with "₹5,500 pending", wallet icon and chevron', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await addStudent(page, { id: KABIR, name: 'Fictional Kabir' });
  await recordFeedbackFor(page, [RIA, ZOYA, KABIR]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 350000 });
  await addInvoice(page, { student: KABIR, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await reopenToday(page);
  await expect(feedbackItem(page)).toHaveCount(0);
  await expectFees(page, '2 fees overdue', '₹5,500');
  await expect(feesItem(page).getByTestId('needs-you-fees-wallet')).toBeVisible();
  await expect(feesItem(page).getByTestId('needs-you-fees-chevron')).toBeVisible();
});

test('AC-02 feedback item comes first, then the fees item', async ({ page }) => {
  await openToday(page); // Ria needs feedback
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [ZOYA]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 350000 });
  await reopenToday(page);
  await expect(feedbackItem(page)).toHaveCount(1);
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
  await expect(feesItem(page)).toHaveCount(1);
  const feedback = await feedbackItem(page).boundingBox(), fees = await feesItem(page).boundingBox();
  expect(feedback!.y).toBeLessThan(fees!.y);
});

test('AC-03 tapping the fees item opens Fees with an "Overdue" section on top: one row per student, any month, oldest first', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await addStudent(page, { id: KABIR, name: 'Fictional Kabir' });
  // Zoya has TWO overdue invoices from different months — tests that a single student row shows both months
  await addInvoice(page, { student: ZOYA, month: '2026-09-01', due: '2026-09-15', paise: 200000 });
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 350000 });
  // Kabir has one overdue invoice from October
  await addInvoice(page, { student: KABIR, month: '2026-10-01', due: '2026-10-15', paise: 250000 });
  await reopenToday(page);
  await feesItem(page).click();
  await expect(page.getByRole('heading', { name: 'Fees overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overdue', exact: true })).toBeVisible();
  const rows = page.getByTestId('fees-overdue-section').getByTestId('fees-overdue-row');
  await expect(rows).toHaveCount(2);
  // Row 0: Zoya (oldest invoice is September) — must show BOTH months
  await expect(rows.nth(0)).toContainText('Fictional Zoya');
  await expect(rows.nth(0)).toContainText(CLAY);
  await expect(rows.nth(0)).toContainText(/Sep(tember)? 2026|2026-09/);
  await expect(rows.nth(0)).toContainText(/Oct(ober)? 2026|2026-10/);
  await expect(rows.nth(0)).toContainText('₹5,500'); // 2,000 + 3,500
  // Row 1: Kabir (October only)
  await expect(rows.nth(1)).toContainText('Fictional Kabir');
  await expect(rows.nth(1)).toContainText(CLAY);
  await expect(rows.nth(1)).toContainText(/Oct(ober)? 2026|2026-10/);
  await expect(rows.nth(1)).toContainText('₹2,500');
  const section = await page.getByTestId('fees-overdue-section').boundingBox();
  const overview = await page.getByText('Collected for this month', { exact: true }).boundingBox();
  expect(section!.y).toBeLessThan(overview!.y); // the monthly overview stays, below the section
});

test('AC-16 a fee overdue only from last month shows on Today and in the Fees "Overdue" section', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [RIA, ZOYA]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await reopenToday(page);
  await expectFees(page, '1 fee overdue', '₹2,000');
  await feesItem(page).click();
  const rows = page.getByTestId('fees-overdue-section').getByTestId('fees-overdue-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Fictional Zoya');
  await expect(rows.first()).toContainText(/Oct(ober)? 2026|2026-10/);
});

// GUARD: resolving Ria's default feedback already leaves the existing empty card; it must stay empty with no overdue fees.
test('AC-04 no overdue fees and no feedback needed shows "All caught up"', async ({ page }) => {
  await openToday(page);
  await recordFeedbackFor(page, [RIA]);
  await reopenToday(page);
  await expectAllCaughtUp(page);
});

test('AC-05 an overdue fee for an ended enrolment is not counted', async ({ page }) => {
  await openToday(page);
  await expectExcludedThenCountsOnlyTheGenuineOne(page, { student: KABIR, name: 'Fictional Kabir', ended: true }, { month: '2026-10-01', due: '2026-10-15' });
});

test('AC-06 an overdue fee for an archived student is not counted', async ({ page }) => {
  await openToday(page);
  await expectExcludedThenCountsOnlyTheGenuineOne(page, { student: KABIR, name: 'Fictional Kabir', archived: true }, { month: '2026-10-01', due: '2026-10-15' });
});

// GUARD: offline feedback reads already show the existing whole-card error; adding fees must preserve it when both fail.
test('AC-07 offline shows the whole-card error "Needs you list could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await page.evaluate(() => { window.__needsYouNet.offline = true; });
  await reopenToday(page);
  // The database client retries a failed read 3 times (about 7 s) before giving up.
  await expect(wholeCardError(page)).toBeVisible({ timeout: 15000 });
  await expect(feesItem(page)).toHaveCount(0);
  await expect(page.getByText(/(Fees|Feedback) could not load/)).toHaveCount(0);
});

// RED-BECAUSE: Today currently finishes Checking after feedback and never waits for the held fee read, so it shows All caught up early.
test('AC-08 while any data is still loading the card shows "Checking…", never an early "All caught up"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [RIA, ZOYA]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await page.evaluate(() => { window.__needsYouNet.holdFees = true; }); // feedback loads, fees still loading
  await reopenToday(page);
  await expect(page.getByText('Checking…', { exact: true })).toBeVisible();
  // Mid-hold check: a buggy impl that flashes Checking… → All caught up → Checking… would pass a two-point check
  await page.waitForTimeout(500);
  await expect(page.getByText('Checking…', { exact: true })).toBeVisible();
  await expect(page.getByText('All caught up', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(page.getByText('Checking…', { exact: true })).toBeVisible();
  await expect(page.getByText('All caught up', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { window.__needsYouNet.holdFees = false; });
  await expectFees(page, '1 fee overdue', '₹2,000');
  await expect(page.getByText('Checking…', { exact: true })).toHaveCount(0);
});

test('AC-17 fees fail, feedback loads: feedback item plus "Fees could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page); // Ria needs feedback
  await page.evaluate(() => { window.__needsYouNet.failFees = true; });
  await reopenToday(page);
  await expect(feedbackItem(page)).toHaveCount(1);
  await expect(page.getByText(/Fees could not load\. Reference: .+/)).toBeVisible({ timeout: 15000 });
  await expect(wholeCardError(page)).toHaveCount(0);
  await expect(feesItem(page)).toHaveCount(0);
});

test('AC-18 feedback fails, fees load: fees item plus "Feedback could not load. Reference: <ref>"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await page.evaluate(() => { window.__needsYouNet.failFeedback = true; });
  await reopenToday(page);
  await expectFees(page, '1 fee overdue', '₹2,000');
  await expect(page.getByText(/Feedback could not load\. Reference: .+/)).toBeVisible({ timeout: 15000 });
  await expect(wholeCardError(page)).toHaveCount(0);
  await expect(feedbackItem(page)).toHaveCount(0);
});

test('AC-09 600 overdue students across 4 batches show "600 fees overdue" with "₹4,23,00,000 pending"', async ({ page }) => {
  await openToday(page);
  await page.evaluate(() => {
    const roster = window.__coachFixture.roster, fees = window.__feeFixture, now = new Date().toISOString();
    for (let b = 0; b < 4; b++) {
      const batch = `30000000-0000-0000-0000-00000000000${b}`, batchName = `Fictional Batch ${b + 1}`;
      roster.batches.push({ id: batch, name: batchName, room: `Room ${b + 1}`, monthly_fee_paise: 7050000, archived_at: null });
      for (let i = 0; i < 150; i++) {
        const n = b * 150 + i, id = `20000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
        roster.students.push({ id, name: `Fictional Student ${n}`, age_years: 7, archived_at: null });
        roster.enrolments.push({ id: `e-${id}`, student_id: id, batch_id: batch, starts_on: '2020-01-01', ends_on: null });
        fees.invoices.push({ id: crypto.randomUUID(), academy_id: 'academy-test', enrolment_id: `e-${id}`, billing_month: '2026-10-01',
          due_on: '2026-10-15', amount_paise: 7050000, paid_paise: 0, balance_paise: 7050000, excess_paise: 0, test_paise: 0,
          student_name: `Fictional Student ${n}`, batch_name: batchName, created_at: now,
          created_by: '00000000-0000-0000-0000-000000000001', voided_at: null, voided_by: null, void_reason: null });
      }
    }
  });
  await reopenToday(page);
  await expectFees(page, '600 fees overdue', '₹4,23,00,000'); // 600 × ₹70,500, beyond one 500-row page
});

test('AC-10 a student with an overdue fee who also needs feedback: both items, each opening its own screen', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [RIA]); // only Zoya needs feedback, and only Zoya owes a fee
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  await reopenToday(page);
  await expect(feedbackItem(page)).toContainText('1 child needs feedback');
  await expectFees(page, '1 fee overdue', '₹2,000');
  await feedbackItem(page).click();
  await expect(page.getByRole('heading', { name: 'Feedback for parents', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await expect(heading(page)).toBeVisible();
  await feesItem(page).click();
  await expect(page.getByRole('heading', { name: 'Overdue', exact: true })).toBeVisible();
});

test('AC-11 one student overdue shows "1 fee overdue" with "₹1,500 pending"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  await recordFeedbackFor(page, [RIA, ZOYA]);
  await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 150000 });
  await reopenToday(page);
  await expect(feedbackItem(page)).toHaveCount(0);
  await expectFees(page, '1 fee overdue', '₹1,500');
  await expect(feesItem(page)).not.toContainText('1 fees');
});

test('AC-12 an invoice due today (Asia/Kolkata) is not overdue', async ({ page }) => {
  await openToday(page);
  const today = todayIST();
  await expectExcludedThenCountsOnlyTheGenuineOne(page, { student: KABIR, name: 'Fictional Kabir' }, { month: `${today.slice(0, 7)}-01`, due: today });
});

test('AC-13 a voided overdue invoice is not counted', async ({ page }) => {
  await openToday(page);
  await expectExcludedThenCountsOnlyTheGenuineOne(page, { student: KABIR, name: 'Fictional Kabir' }, { month: '2026-10-01', due: '2026-10-15', voided: true });
});

test('AC-14 a test receipt (mode = test) never counts as paid', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  const invoice = await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 250000 });
  await addPayment(page, invoice, 250000, 'test');
  await reopenToday(page);
  await expectFees(page, '1 fee overdue', '₹2,500');
});

test('AC-15 two partly paid overdue invoices for one student: "1 fee overdue" with "₹1,500 pending"', async ({ page }) => {
  await openToday(page);
  await addStudent(page, { id: ZOYA, name: 'Fictional Zoya' });
  const october = await addInvoice(page, { student: ZOYA, month: '2026-10-01', due: '2026-10-15', paise: 200000 });
  const september = await addInvoice(page, { student: ZOYA, month: '2026-09-01', due: '2026-09-15', paise: 300000 });
  await addPayment(page, october, 150000, 'live'); // ₹500 left
  await addPayment(page, september, 200000, 'live'); // ₹1,000 left
  await reopenToday(page);
  await expectFees(page, '1 fee overdue', '₹1,500');
});
