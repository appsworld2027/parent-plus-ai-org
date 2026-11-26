import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

let browser;
let server;
let origin;
let html;

before(async () => {
  try {
    html = await readFile(process.argv[2] ?? "index.html", "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    html = "<!doctype html><title>Feature absent</title>";
  }

  server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
});

after(async () => {
  await browser?.close();
  server?.close();
});

function scenario(id, name, check) {
  test(`${id} ${name}`, async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(2500);
    try {
      await page.goto(origin);
      const child = page.getByRole("combobox", { name: "Child", exact: true });
      assert.equal(await child.count(), 1, "Feedback screen is missing its child selector");
      await check(page, child);
    } finally {
      await page.close();
    }
  });
}

const text = (page, value) => page.getByText(value, { exact: true });
const visible = (page, value) => text(page, value).waitFor();
const mode = (page, value) =>
  page.getByRole("combobox", { name: "Demo scenario" }).selectOption(value);
const cards = (page) => page.getByRole("article");

scenario("AC-01", "lists reviewed notes newest first", async (page) => {
  await visible(page, "Practised a steady landing.");
  const notes = await cards(page).allTextContents();
  assert.equal(notes.length, 2);
  assert.match(notes[0], /Coach Morgan[\s\S]*22 Nov 2026[\s\S]*Practised a steady landing\./);
  assert.match(notes[1], /Coach Morgan[\s\S]*15 Nov 2026[\s\S]*Remembered the warm-up sequence\./);
});

scenario("AC-02", "shows approved feedback and excludes drafts from the delivered page", async (page) => {
  await visible(page, "Practised a steady landing.");
  assert.equal(await text(page, "Private draft fixture").count(), 0);
  assert.doesNotMatch(html, /Private draft fixture|Unrelated child fixture/);
});

scenario("AC-03", "switches to the other child's feedback", async (page, child) => {
  await visible(page, "Practised a steady landing.");
  await child.selectOption("jamie");
  await visible(page, "Took turns during the relay.");
  assert.equal(await cards(page).count(), 1);
  assert.equal(await text(page, "Practised a steady landing.").count(), 0);
});

scenario("AC-04", "shows the empty state", async (page, child) => {
  await child.selectOption("sam");
  await visible(page, "No reviewed feedback yet");
  assert.equal(await cards(page).count(), 0);
});

scenario("AC-05", "shows inactive access with an empty list", async (page, child) => {
  await child.selectOption("taylor");
  await visible(page, "Feedback connection inactive");
  assert.equal(await cards(page).count(), 0);
});

scenario("AC-06", "clears previous feedback during loading", async (page, child) => {
  await visible(page, "Practised a steady landing.");
  await mode(page, "slow");
  await child.selectOption("jamie");
  await visible(page, "Loading feedback");
  assert.equal(await cards(page).count(), 0);
  await visible(page, "Took turns during the relay.");
});

scenario("AC-07", "offers recovery from a failed load", async (page) => {
  await mode(page, "fail-once");
  await visible(page, "Couldn’t load feedback");
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.equal(await cards(page).count(), 0);
});

scenario("AC-08", "loads selected feedback on retry", async (page, child) => {
  await child.selectOption("jamie");
  await visible(page, "Took turns during the relay.");
  await mode(page, "fail-once");
  await visible(page, "Couldn’t load feedback");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await visible(page, "Took turns during the relay.");
  assert.equal(await cards(page).count(), 1);
});

scenario("AC-09", "hides all feedback after an offline request", async (page, child) => {
  await visible(page, "Practised a steady landing.");
  await page.context().setOffline(true);
  await child.selectOption("jamie");
  await visible(page, "You’re offline. Reconnect and retry");
  assert.equal(await cards(page).count(), 0);
});
