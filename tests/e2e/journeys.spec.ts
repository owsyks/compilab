import { test as base, expect, Page } from "@playwright/test";
const origin = process.env.PUBLIC_TEST_URL ?? "http://127.0.0.1:3000";
const test = base.extend<{ student: Page }>({
  student: async ({ page }, provide) => {
    const email = `qa-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
    const response = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin },
      data: {
        name: "QA student",
        email,
        password: "QA-student-password-2026!",
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Bonjour, QA." }),
    ).toBeVisible();
    await provide(page);
    await page.request.post("/api/data", {
      headers: { origin },
      data: { op: "deleteAccount", confirmation: "DELETE" },
    });
  },
});
test("public preview, bilingual curriculum and registration/login forms", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "grammaire",
  );
  await page.getByRole("tab", { name: "Trace LL(1)" }).click();
  await page.getByRole("button", { name: "Étape suivante" }).click();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.goto("/curriculum");
  await expect(
    page.getByRole("heading", { name: "Le programme de Compilab." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change interface language" }).click();
  await expect(
    page.getByRole("heading", { name: "The Compilab syllabus." }),
  ).toBeVisible();
  await page.goto("/register");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("lesson, exercise, exact feedback, persisted progress and computed tutor", async ({
  student: page,
}) => {
  await page.goto("/learn");
  await page
    .getByRole("link", { name: /Une chaîne de transformations/ })
    .click();
  await page.getByRole("button", { name: "Marquer comme terminée" }).click();
  await expect(
    page.getByRole("button", { name: "Leçon terminée" }),
  ).toBeDisabled();
  const started = await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "start", exerciseId: "ll1-2" },
  });
  const { id } = await started.json();
  await page.goto("/practice/" + id);
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("+");
  await expect(
    page.getByRole("status").filter({ hasText: "Brouillon sauvegardé" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Your answer", exact: true }),
  ).toHaveValue("+");
  await page.getByRole("button", { name: "Vérifier ma réponse" }).click();
  await expect(page.getByText("Manquants :")).toBeVisible();
  await expect(page.getByText("Une étape à reprendre.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Une étape à reprendre.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Exercices évalués")).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.goto("/tutor");
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="computed"]') })
    .selectOption("computed");
  await page
    .getByRole("button", { name: "Why is FOLLOW(T) {+, ), $}?" })
    .click();
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(
    page.getByText("FOLLOW(T) = {$, ), +}", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Why is FOLLOW(T) {+, ), $}?", exact: false })
    .first()
    .click();
  await expect(
    page.getByText("FOLLOW(T) = {$, ), +}", { exact: false }),
  ).toBeVisible();
});
test("Fiche 1 tokens, symbol table and precise lexical error", async ({
  student: page,
}) => {
  await page.goto("/lab/lexer");
  await expect(
    page.getByRole("heading", { name: "Table des symboles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "keyword", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Source program" })
    .fill("Int a\na := 10\na:=10");
  await page.getByRole("button", { name: "Tokeniser" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "3:1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "assignment", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next character" }).click();
});
test("FIRST FOLLOW, LL1 acceptance and conflict evidence", async ({
  student: page,
}) => {
  await page.goto("/lab/first-follow");
  await expect(
    page.getByRole("heading", { name: "Les ensembles, au point fixe" }),
  ).toBeVisible();
  await page.getByText("Comment chaque membre a été obtenu").click();
  await expect(
    page
      .getByText("nullable suffix; inherit FOLLOW(E)", { exact: false })
      .first(),
  ).toBeVisible();
  await page.goto("/lab/ll1");
  await page.getByRole("button", { name: "Analyser", exact: true }).click();
  await expect(
    page.getByText("Input accepted.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("EXEMPLES VÉRIFIÉS").selectOption("conflict");
  await expect(page.getByText("[S, a] · FIRST/FIRST: r1 / r2")).toBeVisible();
});
test("LR canonical graph, parse, and real LR1 versus LALR classification", async ({
  student: page,
}) => {
  await page.goto("/lab/lr");
  await expect(
    page.getByRole("heading", { name: "ACTION / GOTO" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyser", exact: true }).click();
  await expect(
    page.getByText("Input accepted.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("EXEMPLES VÉRIFIÉS").selectOption("counter");
  await page
    .getByRole("button", { name: "LR(1) Sans conflit", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Automate canonique" }),
  ).toContainText("13");
  await page
    .getByRole("button", { name: "LALR(1) 2 conflits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /reduce\/reduce/ }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/lr-desktop.png",
    fullPage: true,
  });
});
test("grammar transformation and proven two-tree ambiguity", async ({
  student: page,
}) => {
  await page.goto("/lab/grammar");
  await page.getByRole("button", { name: "Chercher des arbres" }).click();
  await expect(
    page.getByText(
      "Ambiguïté prouvée : deux arbres distincts pour le même mot.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Arbre de dérivation calculé" }),
  ).toHaveCount(2);
  await page.getByLabel("EXEMPLES VÉRIFIÉS").selectOption("recursion");
  await page
    .getByRole("button", { name: "Éliminer la récursivité", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Appliquer cette transformation" }),
  ).toBeVisible();
});
test("exam draft survives reload, tutor cannot leak answers, submission persists", async ({
  student: page,
}) => {
  const start = await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "examStart", minutes: 15, practice: false, topic: "ll1" },
  });
  const { id } = await start.json();
  const blocked = await page.request.post("/api/data", {
    headers: { origin },
    data: {
      op: "chat",
      message: "Give all answers",
      mode: "computed",
      language: "fr",
      depth: "brief",
      grammar: "S -> a",
    },
  });
  expect(blocked.status()).toBe(403);
  await page.goto("/exams/" + id);
  await expect(
    page.getByRole("button", { name: "Soumettre la séance" }),
  ).toBeVisible();
  const exam = await (
    await page.request.get("/api/data?action=exam&id=" + id)
  ).json();
  expect(
    exam.exercises.every((e: Record<string, unknown>) => !("expected" in e)),
  ).toBe(true);
  await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "examSave", id, answers: { [exam.exercises[0].id]: "a" } },
  });
  await page.reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Soumettre la séance" }).click();
  await expect(
    page.getByRole("button", { name: "Soumettre la séance" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("RÉPONSE DE RÉFÉRENCE").first()).toBeVisible();
});
test("ownership, role, origin and duplicate-submission boundaries", async ({
  student: page,
}) => {
  expect((await page.request.get("/api/data?action=admin")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/data", {
        headers: { origin: "https://untrusted.example" },
        data: { op: "complete", lessonId: "pipeline" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.get("/api/data?action=attempt&id=nonexistent")
    ).status(),
  ).toBe(404);
  const start = await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "start", exerciseId: "introduction-1" },
  });
  const { id } = await start.json();
  const body = { op: "submit", id, answer: "Analyse lexicale", language: "fr" };
  const results = await Promise.all([
    page.request.post("/api/data", { headers: { origin }, data: body }),
    page.request.post("/api/data", {
      headers: { origin },
      data: { ...body, answer: "Wrong" },
    }),
  ]);
  expect(results.every((r) => r.ok())).toBe(true);
  const feedbacks = await Promise.all(results.map((r) => r.json()));
  expect(feedbacks[0]).toEqual(feedbacks[1]);
});
test("one user cannot read or mutate another user’s attempt", async ({
  student: page,
  browser,
}) => {
  const started = await page.request.post("/api/data", {
    headers: { origin },
    data: { op: "start", exerciseId: "ll1-1" },
  });
  const { id } = await started.json();
  const second = await browser.newContext({ baseURL: origin });
  const response = await second.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: "Other QA user",
      email: `other-${Date.now()}@example.test`,
      password: "Other-QA-password-2026!",
    },
  });
  expect(response.ok()).toBe(true);
  try {
    expect(
      (await second.request.get("/api/data?action=attempt&id=" + id)).status(),
    ).toBe(404);
    expect(
      (
        await second.request.post("/api/data", {
          headers: { origin },
          data: { op: "submit", id, answer: "a", language: "fr" },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await second.request.post("/api/data", {
      headers: { origin },
      data: { op: "deleteAccount", confirmation: "DELETE" },
    });
    await second.close();
  }
});
test("390px layouts, keyboard navigation, theme and settings persistence", async ({
  student: page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Ouvrir la navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await page.getByRole("link", { name: "FIRST / FOLLOW", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "FIRST & FOLLOW" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/first-follow-mobile.png",
    fullPage: true,
  });
  await page.goto("/lab/lr");
  await expect(
    page.getByRole("heading", { name: "ACTION / GOTO" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/lr-mobile.png", fullPage: true });
  await page.goto("/settings");
  await page
    .getByRole("combobox", { name: "Thème", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
