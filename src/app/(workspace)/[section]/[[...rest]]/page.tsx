import { notFound, redirect } from "next/navigation";
import { visitor } from "@/lib/visitor";
import { Shell } from "@/components/shell";
import { AppScreen } from "@/components/app-screen";
const sections = [
  "dashboard",
  "learn",
  "practice",
  "lab",
  "tutor",
  "exams",
  "review",
  "progress",
  "settings",
  "onboarding",
  "admin",
];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; rest?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section, rest = [] } = await params;
  if (!sections.includes(section)) notFound();
  if (
    section === "lab" &&
    (rest.length !== 1 ||
      !["lexer", "automata", "grammar", "first-follow", "ll1", "lr"].includes(
        rest[0],
      ))
  )
    notFound();
  if (section === "learn" && rest.length !== 0 && rest.length !== 2) notFound();
  if (["practice", "exams"].includes(section) && rest.length > 1) notFound();
  if (!["lab", "learn", "practice", "exams"].includes(section) && rest.length)
    notFound();
  const user = await visitor();
  if (!user) {
    if (section === "admin") redirect("/login");
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === "string") query.set(key, value);
    }
    redirect(
      "/api/guest?next=" +
        encodeURIComponent(
          "/" +
            [section, ...rest].join("/") +
            (query.size ? "?" + query.toString() : ""),
        ),
    );
  }
  if (section === "admin" && user.role !== "ADMIN") redirect("/dashboard");
  return (
    <Shell name={user.name} role={user.role}>
      <AppScreen
        key={section + "/" + rest.join("/")}
        section={section}
        rest={rest}
      />
    </Shell>
  );
}
