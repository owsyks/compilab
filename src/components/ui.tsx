"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUI } from "./providers";
import { ParseResult } from "@/lib/compiler/grammar";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "blue" | "red" | "amber";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      <AlertCircle size={17} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Loading() {
  const { t } = useUI();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      {t("Chargement de votre espace…", "Loading your workspace…")}
    </div>
  );
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">∅</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link href={href} className="button secondary">
          {label}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="title-action">{children}</div>}
    </div>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}
export function TraceView({ result }: { result: ParseResult }) {
  const { t } = useUI();
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const step = Math.min(index, Math.max(0, result.steps.length - 1));
  return (
    <section className="panel">
      <div className="panel-heading">
        <h3>{t("Trace d’analyse", "Parsing trace")}</h3>
        <Badge
          tone={
            result.status === "accept"
              ? "green"
              : result.status === "conflict"
                ? "amber"
                : "red"
          }
        >
          {result.status === "accept" ? (
            <>
              <Check size={12} /> accept
            </>
          ) : (
            result.status
          )}
        </Badge>
      </div>
      <p className="muted">{result.message}</p>
      {result.steps.length > 0 && (
        <>
          <div className="trace-controls">
            <button
              className="icon-button"
              aria-label={t("Étape précédente", "Previous step")}
              disabled={!step}
              onClick={() => setIndex(step - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {step + 1} / {result.steps.length}
            </span>
            <button
              className="icon-button"
              aria-label={t("Étape suivante", "Next step")}
              disabled={step >= result.steps.length - 1}
              onClick={() => setIndex(step + 1)}
            >
              <ChevronRight size={16} />
            </button>
            <button className="text-button" onClick={() => setAll(!all)}>
              {all
                ? t("Une étape", "One step")
                : t("Toutes les étapes", "All steps")}
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>
                    {t("Pile · sommet à gauche (LL)", "Stack · top left (LL)")}
                  </th>
                  <th>{t("Entrée restante", "Remaining input")}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.map(
                  (s, i) =>
                    (all || i === step) && (
                      <tr key={i} className={i === step ? "selected-row" : ""}>
                        <td>{i + 1}</td>
                        <td className="mono">{s.stack}</td>
                        <td className="mono">{s.input}</td>
                        <td className="mono">{s.action}</td>
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
