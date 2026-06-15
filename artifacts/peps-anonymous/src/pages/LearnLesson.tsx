import React, { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Lightbulb, CheckCheck } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { getCourse, getLesson, getLessonNav } from "@/data/learn-content";
import { useLearnProgress } from "@/hooks/use-learn-progress";
import { T } from "@/lib/theme";

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden flex-1" style={{ background: "var(--t-border)" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: accent }}
      />
    </div>
  );
}

export default function LearnLesson() {
  const params = useParams<{ courseSlug: string; lessonSlug: string }>();
  const courseSlug = params.courseSlug ?? "";
  const lessonSlug = params.lessonSlug ?? "";
  const [, setLocation] = useLocation();

  const course = getCourse(courseSlug);
  const unitSlug = course?.units.find(u => u.lessons.some(l => l.slug === lessonSlug))?.slug ?? "";
  const lesson = unitSlug ? getLesson(courseSlug, unitSlug, lessonSlug) : undefined;
  const { prev, next } = getLessonNav(courseSlug, lessonSlug);
  const { isComplete, markComplete, markIncomplete, unitProgress } = useLearnProgress();

  const done = isComplete(courseSlug, unitSlug, lessonSlug);
  const { pct: unitPct } = unitProgress(courseSlug, unitSlug);
  const unit = course?.units.find(u => u.slug === unitSlug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [courseSlug, lessonSlug]);

  if (!course || !lesson) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-[18px] font-semibold mb-2" style={{ color: T.text }}>Lesson not found</p>
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

  function handleToggleComplete() {
    if (done) {
      markIncomplete(courseSlug, unitSlug, lessonSlug);
    } else {
      markComplete(courseSlug, unitSlug, lessonSlug);
    }
  }

  return (
    <PageLayout>
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>

        <div
          className="sticky top-0 z-20 px-4 py-2.5 md:px-6 flex items-center gap-3"
          style={{
            background: "var(--t-glass)",
            borderBottom: `1px solid ${T.border}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={() => setLocation(`/learn/${courseSlug}`)}
            className="flex items-center gap-1 text-[12px] font-semibold shrink-0 transition-opacity hover:opacity-70"
            style={{ color: course.accentColor }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{course.title}</span>
            <span className="sm:hidden">Back</span>
          </button>

          <span className="text-[12px] shrink-0" style={{ color: T.subtle }}>›</span>

          <p className="text-[12px] font-medium truncate flex-1 min-w-0" style={{ color: T.muted }}>
            {unit?.title}
          </p>

          <ProgressBar pct={unitPct} accent={course.accentColor} />

          <span
            className="text-[11px] font-bold shrink-0"
            style={{ color: course.accentColor }}
          >
            {unitPct}%
          </span>
        </div>

        <main className="px-4 py-8 max-w-2xl mx-auto w-full">

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5" style={{ color: T.subtle }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>
                {lesson.readMins} min read
              </span>
              {done && (
                <span
                  className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}
                >
                  <CheckCheck className="w-3 h-3" />
                  Complete
                </span>
              )}
            </div>

            <h1 className="text-[26px] font-bold leading-tight mb-4" style={{ color: T.text }}>
              {lesson.title}
            </h1>

            <p className="text-[15px] leading-relaxed font-medium" style={{ color: T.muted }}>
              {lesson.intro}
            </p>
          </div>

          <div
            className="h-px mb-6"
            style={{ background: T.border }}
          />

          <div className="space-y-8">
            {lesson.sections.map((section, idx) => (
              <section key={idx}>
                <h2
                  className="text-[17px] font-bold mb-3"
                  style={{ color: T.text }}
                >
                  {section.heading}
                </h2>

                <p className="text-[14px] leading-relaxed" style={{ color: T.muted, lineHeight: "1.75" }}>
                  {section.body}
                </p>

                {section.keyPoints && section.keyPoints.length > 0 && (
                  <div
                    className="mt-4 rounded-xl px-4 py-4 space-y-2"
                    style={{
                      background: `${course.accentColor}0D`,
                      border: `1px solid ${course.accentColor}25`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-2"
                      style={{ color: course.accentColor }}
                    >
                      Key Points
                    </p>
                    {section.keyPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2
                          className="w-3.5 h-3.5 shrink-0 mt-0.5"
                          style={{ color: course.accentColor }}
                        />
                        <p className="text-[13px] leading-snug" style={{ color: T.text }}>
                          {pt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.tip && (
                  <div
                    className="mt-4 rounded-xl px-4 py-4 flex gap-3"
                    style={{
                      background: "rgba(245,158,11,0.07)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <Lightbulb
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: "#D97706" }}
                    />
                    <p className="text-[13px] leading-relaxed" style={{ color: T.text }}>
                      <strong style={{ color: "#D97706" }}>Tip: </strong>
                      {section.tip}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>

          <div
            className="mt-10 rounded-2xl px-5 py-5"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow,
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: course.accentColor }}
            >
              Key Takeaway
            </p>
            <p className="text-[14px] leading-relaxed font-medium" style={{ color: T.text }}>
              {lesson.takeaway}
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleToggleComplete}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-[13px] transition-all flex-1 sm:flex-initial"
              style={
                done
                  ? { background: "rgba(5,150,105,0.12)", color: "#059669", border: "1.5px solid rgba(5,150,105,0.3)" }
                  : { background: "#059669", color: "white", border: "1.5px solid #059669" }
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              {done ? "Mark as Incomplete" : "Mark as Complete"}
            </button>

            <div className="flex items-center gap-3 flex-1 justify-end">
              {prev && (
                <button
                  onClick={() => setLocation(`/learn/${prev.courseSlug}/${prev.lessonSlug}`)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
              )}
              {next && (
                <button
                  onClick={() => setLocation(`/learn/${next.courseSlug}/${next.lessonSlug}`)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: done ? "#059669" : T.surface,
                    border: `1px solid ${done ? "#059669" : T.border}`,
                    color: done ? "white" : T.muted,
                  }}
                >
                  Next lesson
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-center mt-8 leading-relaxed" style={{ color: T.subtle }}>
            For educational purposes only. Consult a qualified healthcare professional before acting on any information here.
          </p>

        </main>
      </div>
    </PageLayout>
  );
}
