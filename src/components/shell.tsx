"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  Layers,
  MessagesSquare,
  GraduationCap,
  ChartNoAxesCombined,
  Bookmark,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Sun,
  Moon,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useUI } from "./providers";
import { authClient } from "@/lib/auth-client";
const links = [
  ["/dashboard", "Tableau de bord", "Dashboard", LayoutDashboard],
  ["/learn", "Parcours de cours", "Learning path", BookOpen],
  ["/practice", "Entraînement", "Practice", Layers],
  ["/tutor", "Tuteur de compilation", "Compilation tutor", MessagesSquare],
  ["/exams", "Examens blancs", "Mock exams", GraduationCap],
  ["/review", "Révisions & favoris", "Review & bookmarks", Bookmark],
  ["/progress", "Ma progression", "My progress", ChartNoAxesCombined],
] as const;
const labs = [
  ["/lab/lexer", "Analyse lexicale", "Lexical analysis"],
  ["/lab/automata", "Automates finis", "Finite automata"],
  ["/lab/grammar", "Grammaires & arbres", "Grammars & trees"],
  ["/lab/first-follow", "FIRST / FOLLOW", "FIRST / FOLLOW"],
  ["/lab/ll1", "Analyse LL(1)", "LL(1) parsing"],
  ["/lab/lr?method=LR0", "Analyse LR(0)", "LR(0) parsing"],
  ["/lab/lr?method=SLR", "Analyse SLR(1)", "SLR(1) parsing"],
  ["/lab/lr?method=LR1", "Analyse LR(1)", "LR(1) parsing"],
  ["/lab/lr?method=LALR", "Analyse LALR(1)", "LALR(1) parsing"],
];
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Compilab home">
      <span className="logo-symbol">
        c<span>:</span>
      </span>
      <span>
        compilab<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Controls() {
  const { preferences, setPreferences, t } = useUI();
  return (
    <div className="global-controls">
      <button
        className="language-button"
        aria-label="Change interface language"
        onClick={() =>
          setPreferences({
            language: preferences.language === "fr" ? "en" : "fr",
          })
        }
      >
        {preferences.language.toUpperCase()} <span>⌄</span>
      </button>
      <button
        className="icon-button"
        aria-label={t("Changer de thème", "Switch theme")}
        onClick={() =>
          setPreferences({
            theme: preferences.theme === "light" ? "dark" : "light",
          })
        }
      >
        {preferences.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  );
}
export function Shell({
  children,
  name,
  role,
}: {
  children: ReactNode;
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLab = (href: string) =>
    pathname === href.split("?")[0] &&
    (!href.includes("?") ||
      new URLSearchParams(href.split("?")[1]).get("method") ===
        (searchParams.get("method") ?? "SLR"));
  const router = useRouter();
  const { t } = useUI();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [mobile]);
  const current = links.find((l) => pathname.startsWith(l[0]));
  const lab = labs.find((l) => activeLab(l[0]));
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">
        {t("Aller au contenu", "Skip to content")}
      </a>
      <aside
        id="workspace-nav"
        inert={narrow && !mobile}
        className={`sidebar ${mobile ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button collapse-button"
            aria-label={t("Réduire la navigation", "Collapse navigation")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">O1</span>
          <div>
            <strong>Université Oran 1</strong>
            <small>Compilation · L3 informatique</small>
          </div>
        </div>
        <nav aria-label={t("Navigation principale", "Main navigation")}>
          <div className="nav-label">{t("MON ESPACE", "MY WORKSPACE")}</div>
          {links.map(([href, fr, en, Icon]) => (
            <Link
              onClick={() => setMobile(false)}
              href={href}
              key={href}
              title={t(fr, en)}
              className={`nav-item ${pathname.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{t(fr, en)}</span>
              {pathname.startsWith(href) && <span className="nav-active-dot" />}
            </Link>
          ))}
          <div className="nav-label lab-label">
            <FlaskConical size={13} />
            <span>{t("LABORATOIRES", "LABORATORIES")}</span>
          </div>
          {labs.map(([href, fr, en], i) => (
            <Link
              onClick={() => setMobile(false)}
              href={href}
              key={href}
              title={t(fr, en)}
              className={`nav-item lab-nav ${activeLab(href) ? "active" : ""}`}
            >
              <span className="lab-number" aria-hidden="true">
                0{i + 1}
              </span>
              <span>{t(fr, en)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
          >
            <Settings size={17} />
            <span>{t("Préférences", "Settings")}</span>
          </Link>
          {role === "ADMIN" && (
            <Link href="/admin" className="nav-item">
              <ShieldCheck size={17} />
              <span>Content studio</span>
            </Link>
          )}
          <div className="user-card">
            <span className="avatar">{((name || "VI").slice(0, 2)).toUpperCase()}</span>
            <div>
              <strong>{name || t("Visiteur", "Visitor")}</strong>
              <small>
                {role === "GUEST"
                  ? t("Accès libre · cet appareil", "Open access · this device")
                  : t("Espace personnel", "Personal workspace")}
              </small>
            </div>
            {role !== "GUEST" && (
              <button
                className="icon-button"
                aria-label={t("Se déconnecter", "Sign out")}
                onClick={async () => {
                  await authClient.signOut();
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-expanded={mobile}
              aria-controls="workspace-nav"
              aria-label={t("Ouvrir la navigation", "Open navigation")}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb-root">
              {t("Mon espace", "Workspace")}
            </span>
            <ChevronRight size={13} />
            <span>
              {lab
                ? t(lab[1], lab[2])
                : current
                  ? t(current[1], current[2])
                  : pathname === "/settings"
                    ? t("Préférences", "Settings")
                    : pathname === "/admin"
                      ? "Content studio"
                      : t("Bienvenue", "Welcome")}
            </span>
          </div>
          <div className="topbar-right">
            <Link className="course-link" href="/curriculum">
              {t("Voir le programme", "View syllabus")}
              <ArrowUpRight size={13} />
            </Link>
            <Controls />
          </div>
        </header>
        <main
          id="main-content"
          className={`main-content ${pathname.startsWith("/lab/") ? "lab-content" : ""}`}
        >
          {children}
        </main>
        <footer className="app-footer">
          <span>
            Compilab ·{" "}
            {t("Apprendre par la pratique.", "Learn through practice.")}
          </span>
          <span>
            {t(
              "Résultats formels calculés, pas devinés.",
              "Formal results computed, not guessed.",
            )}
          </span>
        </footer>
        {pathname !== "/tutor" && (
          <Link
            href="/tutor"
            className="floating-tutor-pill"
            title={t("Tuteur IA de Compilation", "AI Compilation Tutor")}
          >
            <MessagesSquare size={16} />
            <span>{t("Tuteur IA", "AI Tutor")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
