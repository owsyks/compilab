import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.PUBLIC_TEST_URL ?? "http://127.0.0.1:3000" });

test("open learning, separate guest progress, and visible LR methods", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "fondations",
  );
  expect(page.url()).not.toContain("login");
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "Analyse LR(0)", exact: true }),
  ).toBeAttached();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "Analyse SLR(1)", exact: true }),
  ).toBeAttached();
  await page.goto("/learn/lr/lr0");
  await expect(
    page.getByRole("heading", {
      name: "Collection canonique LR(0) calculée à la main",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".worked-example").filter({ hasText: "I5 =" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Marquer comme terminée", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Leçon terminée", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Leçon terminée", exact: true }),
  ).toBeDisabled();

  const second = await browser.newContext({ baseURL });
  try {
    const other = await second.newPage();
    await other.goto("/learn/lr/lr0");
    await expect(
      other.getByRole("button", {
        name: "Marquer comme terminée",
        exact: true,
      }),
    ).toBeEnabled();
    const data = await (await second.request.get("/api/data")).json();
    const first = await (await page.request.get("/api/data")).json();
    expect(data.user.id).not.toBe(first.user.id);
    expect(data.user.role).toBe("GUEST");
    expect((await second.request.get("/api/data?action=admin")).status()).toBe(
      403,
    );
    const forbidden = await second.request.post("/api/data", {
      headers: { origin: baseURL! },
      data: { op: "health" },
    });
    expect(forbidden.status()).toBe(403);
    await second.request.post("/api/data", {
      headers: { origin: baseURL! },
      data: { op: "deleteAccount", confirmation: "DELETE" },
    });
  } finally {
    await second.close();
  }

  for (const [method, label] of [
    ["LR0", "LR(0)"],
    ["SLR", "SLR(1)"],
    ["LR1", "LR(1)"],
    ["LALR", "LALR(1)"],
  ]) {
    await page.goto(`/lab/lr?method=${method}`);
    await expect(page.locator(".classification.selected")).toContainText(label);
    await expect(page.locator(".sidebar .lab-nav.active")).toContainText(label);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await expect(
    page
      .locator(".sidebar")
      .getByRole("link", { name: "Analyse SLR(1)", exact: true }),
  ).toBeVisible();
  await page.request.post("/api/data", {
    headers: { origin: baseURL! },
    data: { op: "deleteAccount", confirmation: "DELETE" },
  });
});

test("first visit to a direct method link preserves the chosen method", async ({
  page,
}) => {
  await page.goto("/lab/lr?method=LALR");
  await expect(page.locator(".classification.selected")).toContainText(
    "LALR(1)",
  );
  expect(page.url()).toContain("method=LALR");
  const origin = new URL(page.url()).origin;
  await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "deleteAccount", confirmation: "DELETE" },
  });
});
