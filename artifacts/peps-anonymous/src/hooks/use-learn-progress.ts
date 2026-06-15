import { useState, useCallback } from "react";
import { COURSES, getCourse, getTotalLessons, type Course } from "@/data/learn-content";

const STORAGE_KEY = "peps_learn_progress";

type ProgressMap = Record<string, boolean>;

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
  }
}

function lessonKey(courseSlug: string, unitSlug: string, lessonSlug: string): string {
  return `${courseSlug}::${unitSlug}::${lessonSlug}`;
}

export function useLearnProgress() {
  const [progress, setProgress] = useState<ProgressMap>(loadProgress);

  const isComplete = useCallback(
    (courseSlug: string, unitSlug: string, lessonSlug: string): boolean =>
      !!progress[lessonKey(courseSlug, unitSlug, lessonSlug)],
    [progress]
  );

  const markComplete = useCallback(
    (courseSlug: string, unitSlug: string, lessonSlug: string) => {
      setProgress(prev => {
        const next = { ...prev, [lessonKey(courseSlug, unitSlug, lessonSlug)]: true };
        saveProgress(next);
        return next;
      });
    },
    []
  );

  const markIncomplete = useCallback(
    (courseSlug: string, unitSlug: string, lessonSlug: string) => {
      setProgress(prev => {
        const next = { ...prev };
        delete next[lessonKey(courseSlug, unitSlug, lessonSlug)];
        saveProgress(next);
        return next;
      });
    },
    []
  );

  const toggleComplete = useCallback(
    (courseSlug: string, unitSlug: string, lessonSlug: string) => {
      if (isComplete(courseSlug, unitSlug, lessonSlug)) {
        markIncomplete(courseSlug, unitSlug, lessonSlug);
      } else {
        markComplete(courseSlug, unitSlug, lessonSlug);
      }
    },
    [isComplete, markComplete, markIncomplete]
  );

  const unitProgress = useCallback(
    (courseSlug: string, unitSlug: string): { completed: number; total: number; pct: number } => {
      const course = getCourse(courseSlug);
      const unit = course?.units.find(u => u.slug === unitSlug);
      if (!unit) return { completed: 0, total: 0, pct: 0 };
      const total = unit.lessons.length;
      const completed = unit.lessons.filter(l => progress[lessonKey(courseSlug, unitSlug, l.slug)]).length;
      return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    [progress]
  );

  const courseProgress = useCallback(
    (courseSlug: string): { completed: number; total: number; pct: number } => {
      const course = getCourse(courseSlug);
      if (!course) return { completed: 0, total: 0, pct: 0 };
      const total = getTotalLessons(course);
      let completed = 0;
      for (const unit of course.units) {
        for (const lesson of unit.lessons) {
          if (progress[lessonKey(courseSlug, unit.slug, lesson.slug)]) completed++;
        }
      }
      return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    [progress]
  );

  return {
    progress,
    isComplete,
    markComplete,
    markIncomplete,
    toggleComplete,
    unitProgress,
    courseProgress,
  };
}
