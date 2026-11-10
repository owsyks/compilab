import { test, expect } from "@playwright/test";
const origin = process.env.PUBLIC_TEST_URL ?? "http://127.0.0.1:3000";
test("register, onboard, sign out and sign back in through the actual forms", async ({
  page,
}) => {
  const email = `qa-auth-${Date.now()}@example.test`;
  const password = "Auth-QA-password-2026!";
  try {
    await page.goto("/register");
    await page
      .getByRole("textbox", { name: "Prénom ou pseudonyme" })
      .fill("Auth QA");
    await page.getByRole("textbox", { name: "Adresse e-mail" }).fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(
      page.getByRole("heading", { name: "Un parcours à votre rythme." }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Langue de l’interface" })
      .selectOption("en");
    await page
      .getByRole("button", { name: "Ouvrir mon espace", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hello, Auth." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Hello, Auth." }),
    ).toBeVisible();
  } finally {
    await page.request.post("/api/data", {
      headers: { origin },
      data: { op: "deleteAccount", confirmation: "DELETE" },
    });
  }
});
test("administrator can open sources, save lesson content and see a genuine provider error", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/sign-in/email", {
    headers: { origin },
    data: {
      email: "admin@compilab.local",
      password: process.env.DEMO_PASSWORD ?? "Compilab-demo-2026!",
    },
  });
  test.skip(
    !login.ok(),
    "Enable the documented development demo seed to test the admin interface.",
  );
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Catalogue des documents" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Leçons", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Select lesson to edit" })
    .selectOption("pipeline");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Opération enregistrée." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Opérations IA" }).click();
  if (await page.getByText("Secret absent", { exact: true }).count()) {
    await page.getByRole("button", { name: "Tester l’accès réel" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "NVIDIA NIM is not configured" }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/admin-studio.png",
    fullPage: true,
  });
});
