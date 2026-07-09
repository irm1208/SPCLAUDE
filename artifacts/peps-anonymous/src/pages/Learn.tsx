import React from "react";
import { useLocation } from "wouter";
import { BookOpen, ChevronRight, Atom } from "lucide-react";
import { ResearchShell } from "@/components/ResearchShell";
import { COURSES, getTotalLessons } from "@/data/learn-content";
import { useLearnProgress } from "@/hooks/use-learn-progress";
import { T } from "@/lib/theme";

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div
      className="relative h-1.5 rounded-full overflow-hidden w-full"
      style={{ background: "var(--t-border)" }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: accent }}
      />
    </div>
  );
}

export default function Learn() {
  const [, setLocation] = useLocation();
  const { courseProgress } = useLearnProgress();

  return (
    <ResearchShell active="learn">
      <div className="flex flex-col pb-10" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5" style={{ color: "var(--t-blue-deep)" }} strokeWidth={2} />
              <h1 className="text-[26px] font-bold tracking-tight" style={{ color: T.text }}>
                Learning Hub - (BETA) - NOT COMPLETED
              </h1>
            </div>
            <p className="text-[14px]" style={{ color: T.muted }}>
              Structured education on TRT, peptides, and hormone optimisation — written for the curious and the committed.
            </p>
          </div>

          <button
            onClick={() => setLocation("/learn/3d-lab")}
            className="w-full text-left rounded-2xl overflow-hidden transition-all hover:shadow-lg active:scale-[0.995] focus:outline-none mb-6"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              boxShadow: T.shadow,
            }}
          >
            <div
              className="px-6 py-5 flex items-start justify-between gap-4"
              style={{ background: "linear-gradient(135deg, #05060a 0%, #1B3A7A 60%, #2D6BCC 100%)" }}
            >
              <div className="flex-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-1 opacity-75"
                  style={{ color: "white" }}
                >
                  Interactive · WebGL
                </p>
                <h2 className="text-[20px] font-bold leading-tight flex items-center gap-2" style={{ color: "white" }}>
                  <Atom className="w-5 h-5" strokeWidth={2} />
                  3D Peptide Explorer
                </h2>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>

            <div className="px-6 py-4 space-y-1">
              <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
                Rotate the full 3D structure of retatrutide, semaglutide and tirzepatide, see the 2D chemical
                structure, and walk through how each one works in the body.
              </p>
            </div>
          </button>

          <div className="space-y-4">
            {COURSES.map(course => {
              const { completed, total, pct } = courseProgress(course.slug);

              return (
                <button
                  key={course.slug}
                  onClick={() => setLocation(`/learn/${course.slug}`)}
                  className="w-full text-left rounded-2xl overflow-hidden transition-all hover:shadow-lg active:scale-[0.995] focus:outline-none"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    boxShadow: T.shadow,
                  }}
                >
                  <div
                    className="px-6 py-5 flex items-start justify-between gap-4"
                    style={{ background: course.coverGradient }}
                  >
                    <div className="flex-1">
                      <p
                        className="text-[11px] font-bold uppercase tracking-widest mb-1 opacity-75"
                        style={{ color: "white" }}
                      >
                        {course.units.length} units · {total} lessons
                      </p>
                      <h2 className="text-[20px] font-bold leading-tight" style={{ color: "white" }}>
                        {course.title}
                      </h2>
                    </div>
                    <ChevronRight className="w-5 h-5 shrink-0 mt-1" style={{ color: "rgba(255,255,255,0.7)" }} />
                  </div>

                  <div className="px-6 py-4 space-y-3">
                    <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
                      {course.description}
                    </p>

                    <div className="flex items-center gap-3">
                      <ProgressBar pct={pct} accent={course.accentColor} />
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: course.accentColor }}>
                        {completed}/{total}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-center mt-8 leading-relaxed" style={{ color: T.subtle }}>
            For educational purposes only. Always consult a qualified healthcare professional before starting any protocol.
          </p>
        </main>
      </div>
    </ResearchShell>
  );
}
