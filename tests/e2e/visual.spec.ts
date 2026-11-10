import { test, expect } from "@playwright/test";
const origin = process.env.PUBLIC_TEST_URL ?? "http://127.0.0.1:3000";
test("mobile graph is fitted, generator works, DFA accepts/rejects, dark view remains readable", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: "Visual QA",
      email: `qa-visual-${Date.now()}@example.test`,
      password: "Visual-QA-password-2026!",
    },
  });
  expect(signup.ok(), await signup.text()).toBe(true);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lab/lr");
    await expect(
      page.getByRole("link", { name: "Aller au contenu" }),
    ).not.toBeInViewport();
    const graph = page.locator(".state-graph");
    await graph.scrollIntoViewIfNeeded();
    await expect(graph.locator(".react-flow__node").first()).toBeInViewport();
    await page.screenshot({
      path: "test-results/lr-mobile-fitted.png",
      fullPage: true,
    });
    await page.goto("/practice");
    await page.getByRole("button", { name: "Préparer les exercices" }).click();
    await expect(page.locator(".exercise-card")).toHaveCount(3);
    await expect(
      page.getByRole("status").filter({ hasText: "3 / 3" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Essayer", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("textbox", { name: "Your answer", exact: true }),
    ).toBeVisible();
    await page.goto("/lab/automata");
    await expect(page.getByText("Mot accepté", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Mot à tester" }).fill("2bad");
    await page.getByRole("button", { name: "Valider & exécuter" }).click();
    await expect(page.getByText("Mot rejeté", { exact: true })).toBeVisible();
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Changer de thème" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: "test-results/dashboard-dark-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: "test-results/dashboard-dark-desktop.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.post("/api/data", {
      headers: { origin },
      data: { op: "deleteAccount", confirmation: "DELETE" },
    });
  }
});
