import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { getCourse, getTotalLessons } from "@/data/learn-content";
import { useLearnProgress } from "@/hooks/use-learn-progress";
import { T } from "@/lib/theme";

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: accent }}
      />
    </div>
  );
}

export default function LearnCourse() {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = params.courseSlug ?? "";
  const [, setLocation] = useLocation();
  const course = getCourse(courseSlug);
  const { isComplete, unitProgress, courseProgress } = useLearnProgress();
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>(() => {
    if (!course) return {};
    return Object.fromEntries(course.units.map(u => [u.slug, true]));
  });

  if (!course) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-[18px] font-semibold mb-2" style={{ color: T.text }}>Course not found</p>
            <button
              onClick={() => setLocation("/learn")}
              className="text-[13px] font-semibold"
              style={{ color: "var(--t-blue-deep)" }}
            >
              ← Back to Learning Hub
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const totalLessons = getTotalLessons(course);
  const { completed: totalCompleted, pct: totalPct } = courseProgress(course.slug);

  function toggleUnit(unitSlug: string) {
    setOpenUnits(prev => ({ ...prev, [unitSlug]: !prev[unitSlug] }));
  }

  return (
    <PageLayout>
      <div className="flex flex-col pb-10" style={{ background: "var(--t-bg)", minHeight: "100%" }}>

        <div
          className="px-4 py-6"
          style={{ background: course.coverGradient }}
        >
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setLocation("/learn")}
              className="flex items-center gap-1.5 text-[12px] font-semibold mb-4 opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: "white" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Learning Hub
            </button>

            <h1 className="text-[24px] font-bold leading-tight mb-1" style={{ color: "white" }}>
              {course.title}
            </h1>
            <p className="text-[13px] mb-4 opacity-80" style={{ color: "white" }}>
              {course.units.length} units · {totalLessons} lessons
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold opacity-80" style={{ color: "white" }}>
                  Your progress
                </span>
                <span className="text-[11px] font-bold" style={{ color: "white" }}>
                  {totalCompleted}/{totalLessons} complete
                </span>
              </div>
              <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${totalPct}%`, background: "white" }}
                />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-3">
          {course.units.map((unit, unitIdx) => {
            const isOpen = openUnits[unit.slug] ?? true;
            const { completed: unitCompleted, total: unitTotal, pct: unitPct } = unitProgress(course.slug, unit.slug);

            return (
              <div
                key={unit.slug}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  boxShadow: T.shadow,
                }}
              >
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
                  onClick={() => toggleUnit(unit.slug)}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black text-white"
                    style={{ background: course.accentColor }}
                  >
                    {unitIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate" style={{ color: T.text }}>
                      {unit.title}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: T.subtle }}>
                      {unitCompleted}/{unitTotal} lessons complete
                    </p>
                  </div>
                  {unitPct === 100 ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#059669" }} />
                  ) : isOpen ? (
                    <ChevronUp className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.subtle }} />
                  )}
                </button>

                {unitPct > 0 && unitPct < 100 && (
                  <div className="px-5 pb-1">
                    <ProgressBar pct={unitPct} accent={course.accentColor} />
                  </div>
                )}

                {isOpen && (
                  <div
                    className="border-t"
                    style={{ borderColor: T.border }}
                  >
                    {unit.lessons.map((lesson, lessonIdx) => {
                      const done = isComplete(course.slug, unit.slug, lesson.slug);
                      return (
                        <button
                          key={lesson.slug}
                          onClick={() => setLocation(`/learn/${course.slug}/${lesson.slug}`)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-black/[0.02] border-b last:border-b-0"
                          style={{ borderColor: T.border }}
                        >
                          {done ? (
                            <CheckCircle2
                              className="w-4 h-4 shrink-0"
                              style={{ color: "#059669" }}
                            />
                          ) : (
                            <Circle
                              className="w-4 h-4 shrink-0"
                              style={{ color: T.subtle }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[13px] font-semibold leading-snug"
                              style={{ color: done ? T.muted : T.text }}
                            >
                              {lesson.title}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            style={{ color: T.subtle }}
                          >
                            <Clock className="w-3 h-3" />
                            <span className="text-[11px]">{lesson.readMins}m</span>
                          </div>
                          <ChevronLeft
                            className="w-3.5 h-3.5 shrink-0 rotate-180"
                            style={{ color: T.subtle }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>
    </PageLayout>
  );
}
