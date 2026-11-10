"use client";
import { useData, Bootstrap } from "@/lib/client";
import { Loading, ErrorBox } from "./ui";
import {
  Dashboard,
  Learn,
  LessonPage,
  Review,
  Progress,
  Settings,
} from "./study-pages";
import {
  PracticePage,
  AttemptPage,
  ExamsPage,
  ExamPage,
} from "./exercise-workspace";
import { Tutor } from "./tutor";
import { Admin } from "./admin";
import { Lab } from "./labs";
export function AppScreen({
  section,
  rest,
}: {
  section: string;
  rest: string[];
}) {
  const { data, error, refresh } = useData<Bootstrap>("/api/data");
  if (section === "lab") return <Lab kind={rest[0]} />;
  if (section === "admin") return <Admin />;
  if (error)
    return (
      <>
        <ErrorBox message={error} />
        <button className="button secondary" onClick={() => refresh()}>
          Retry
        </button>
      </>
    );
  if (!data) return <Loading />;
  const props = {
    data,
    onRefresh: () => {
      void refresh();
    },
  };
  if (section === "dashboard") return <Dashboard data={data} />;
  if (section === "learn")
    return rest.length === 2 ? (
      <LessonPage {...props} moduleId={rest[0]} slug={rest[1]} />
    ) : (
      <Learn data={data} />
    );
  if (section === "practice")
    return rest[0] ? (
      <AttemptPage id={rest[0]} onRefresh={props.onRefresh} />
    ) : (
      <PracticePage data={data} />
    );
  if (section === "exams")
    return rest[0] ? (
      <ExamPage id={rest[0]} onRefresh={props.onRefresh} />
    ) : (
      <ExamsPage data={data} />
    );
  if (section === "review") return <Review data={data} />;
  if (section === "progress") return <Progress data={data} />;
  if (section === "tutor") return <Tutor {...props} />;
  return <Settings {...props} onboarding={section === "onboarding"} />;
}
