"use client";
import { useState } from "react";
import { Upload, Save, Activity, Check } from "lucide-react";
import { api, useData, ClientLesson } from "@/lib/client";
import { useUI } from "./providers";
import { Badge, ErrorBox, Loading, PageTitle } from "./ui";
type AdminData = {
  sources: {
    id: string;
    title: string;
    pageCount: number;
    _count: { chunks: number };
  }[];
  chunks: {
    id: string;
    sourceId: string;
    page: number;
    text: string;
    verified: boolean;
  }[];
  lessons: ClientLesson[];
  exercises: {
    id: string;
    topic: string;
    type: string;
    published: boolean;
    provenance: string;
  }[];
  logs: {
    id: string;
    operation: string;
    model: string;
    status: string;
    durationMs: number;
  }[];
  audits: { id: string; action: string; target: string }[];
  provider: { configured: boolean; model: string };
};
export function Admin() {
  const { t } = useUI();
  const { data, error, refresh } = useData<AdminData>("/api/data?action=admin");
  const [active, setActive] = useState("sources");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [editor, setEditor] = useState("");
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const content = data;
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setActionError("");
    try {
      const r = await api(body);
      setNotice(
        t("Opération enregistrée.", "Operation saved.") +
          (body.op === "health" ? " " + JSON.stringify(r) : ""),
      );
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION / CONTENT STUDIO"
        title={t("Publier avec des preuves.", "Publish with evidence.")}
        description={t(
          "Leçons, exercices et documents sources. Les imports restent non vérifiés jusqu’à leur révision.",
          "Lessons, exercises and source documents. Imports stay unverified until reviewed.",
        )}
      >
        <Badge tone="amber">ADMIN</Badge>
      </PageTitle>
      <div className="tabs" role="tablist">
        {[
          ["sources", t("Sources", "Sources")],
          ["lessons", t("Leçons", "Lessons")],
          ["exercises", t("Exercices", "Exercises")],
          ["operations", t("Opérations IA", "AI operations")],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={active === key}
            key={key}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox message={actionError} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {active === "sources" && (
        <>
          <section className="panel">
            <h2>{t("Importer un PDF", "Import a PDF")}</h2>
            <p className="muted">
              {t(
                "PDF uniquement · 15 Mo · 500 pages · extraction locale sans exécution de code du document.",
                "PDF only · 15 MB · 500 pages · local extraction without executing document code.",
              )}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setActionError("");
                try {
                  const form = new FormData(e.currentTarget);
                  const r = await fetch("/api/sources", {
                    method: "POST",
                    body: form,
                  });
                  const json = await r.json();
                  if (!r.ok) throw new Error(json.error);
                  setNotice(
                    `${json.pageCount} ${t("pages importées, non vérifiées.", "pages imported, unverified.")}`,
                  );
                  await refresh();
                } catch (e) {
                  setActionError(
                    e instanceof Error ? e.message : "Import failed.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="input-action">
                <input
                  aria-label="PDF source document"
                  name="file"
                  type="file"
                  accept="application/pdf"
                  required
                />
                <button
                  disabled={busy}
                  className="button primary"
                  type="submit"
                >
                  <Upload size={15} />
                  {t("Importer", "Import")}
                </button>
              </div>
            </form>
          </section>
          <section className="panel">
            <h2>{t("Catalogue des documents", "Document catalog")}</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Document", "Document")}</th>
                    <th>Pages</th>
                    <th>Chunks</th>
                    <th>{t("Statut", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {content.sources.map((s) => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>{s.pageCount}</td>
                      <td>{s._count.chunks}</td>
                      <td>
                        <Badge tone="amber">
                          {t(
                            "Contexte, pas autorité",
                            "Context, not authority",
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <h2>
              {t("Réviser les premiers extraits", "Review initial excerpts")}
            </h2>
            <p className="muted">
              {t(
                "40 extraits affichés. Vérifié signifie que ce texte a été contrôlé par un administrateur.",
                "Showing 40 excerpts. Verified means an administrator has checked this text.",
              )}
            </p>
            {content.chunks.map((c) => (
              <details className="source-chunk" key={c.id}>
                <summary>
                  {c.sourceId} · p. {c.page}
                  <Badge tone={c.verified ? "green" : "amber"}>
                    {c.verified
                      ? t("Vérifié", "Verified")
                      : t("À contrôler", "Unverified")}
                  </Badge>
                </summary>
                <pre>{c.text}</pre>
                <button
                  disabled={busy}
                  className="button secondary"
                  onClick={() =>
                    action({
                      op: "verifyChunk",
                      id: c.id,
                      verified: !c.verified,
                    })
                  }
                >
                  <Check size={14} />
                  {c.verified
                    ? t("Marquer non vérifié", "Mark unverified")
                    : t("Marquer vérifié", "Mark verified")}
                </button>
              </details>
            ))}
          </section>
        </>
      )}
      {active === "lessons" && (
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {t("Éditer et publier une leçon", "Edit and publish a lesson")}
            </h2>
          </div>
          <select
            aria-label="Select lesson to edit"
            value={lessonId}
            onChange={(e) => {
              setLessonId(e.target.value);
              const l = content.lessons.find((l) => l.id === e.target.value);
              setEditor(
                l
                  ? JSON.stringify(
                      {
                        title: l.title,
                        titleEn: l.titleEn,
                        content: l.content,
                      },
                      null,
                      2,
                    )
                  : "",
              );
            }}
          >
            <option value="">
              {t("Choisir une leçon", "Choose a lesson")}
            </option>
            {content.lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
                {!l.published ? " (draft)" : ""}
              </option>
            ))}
          </select>
          {lessonId && (
            <>
              <textarea
                className="code-editor admin-editor"
                aria-label="Lesson content JSON"
                rows={25}
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
              />
              <div className="button-row">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    try {
                      const value = JSON.parse(editor);
                      void action({ op: "editLesson", id: lessonId, ...value });
                    } catch {
                      setActionError("Invalid JSON.");
                    }
                  }}
                >
                  <Save size={14} />
                  {t("Enregistrer les modifications", "Save changes")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    action({
                      op: "publish",
                      kind: "lesson",
                      id: lessonId,
                      published: !content.lessons.find(
                        (l) => l.id === lessonId,
                      )!.published,
                    })
                  }
                >
                  {content.lessons.find((l) => l.id === lessonId)!.published
                    ? t("Dépublier", "Unpublish")
                    : t("Publier", "Publish")}
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {active === "exercises" && (
        <section className="panel">
          <h2>{t("Modérer la banque", "Moderate the bank")}</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID / type</th>
                  <th>{t("Provenance", "Provenance")}</th>
                  <th>{t("Publication", "Publication")}</th>
                </tr>
              </thead>
              <tbody>
                {content.exercises.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.id}</strong>
                      <small className="block">{e.type}</small>
                    </td>
                    <td>{e.provenance}</td>
                    <td>
                      <button
                        disabled={busy}
                        className="button secondary"
                        onClick={() =>
                          action({
                            op: "publish",
                            kind: "exercise",
                            id: e.id,
                            published: !e.published,
                          })
                        }
                      >
                        {e.published
                          ? t("Dépublier", "Unpublish")
                          : t("Publier", "Publish")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {active === "operations" && (
        <>
          <section className="panel">
            <h2>NVIDIA NIM</h2>
            <p className="mono">{content.provider.model}</p>
            <Badge tone={content.provider.configured ? "blue" : "amber"}>
              {content.provider.configured
                ? t(
                    "Secret configuré, accès non testé",
                    "Secret configured, access untested",
                  )
                : t("Secret absent", "Secret missing")}
            </Badge>
            <p className="muted">
              {t(
                "La clé et le modèle sont configurés uniquement dans les secrets du serveur. Aucun secret n’est affiché ici.",
                "The key and model are configured only in server secrets. No secret is displayed here.",
              )}
            </p>
            <button
              disabled={busy}
              className="button secondary"
              onClick={() => action({ op: "health" })}
            >
              <Activity size={15} />
              {t("Tester l’accès réel", "Test real access")}
            </button>
          </section>
          <section className="panel">
            <h2>
              {t(
                "Requêtes récentes · métadonnées",
                "Recent requests · metadata",
              )}
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>ms</th>
                </tr>
              </thead>
              <tbody>
                {content.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.operation}</td>
                    <td>{log.status}</td>
                    <td>{log.durationMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!content.logs.length && (
              <p className="muted">
                {t("Aucune requête enregistrée.", "No requests recorded.")}
              </p>
            )}
          </section>
          <section className="panel">
            <h3>{t("Journal administratif", "Administrative audit")}</h3>
            {content.audits.map((a) => (
              <p className="mono" key={a.id}>
                {a.action} · {a.target}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
