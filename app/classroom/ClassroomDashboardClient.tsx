"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AssignmentRecord,
  AssignmentsResponse,
  AuthSessionResponse,
  ClassSectionRecord,
  ClassSectionsResponse,
  SectionLearnerMetric,
  SectionLearnerMetricsResponse,
  UserProfileRecord,
  UserProfileResponse,
} from "@/lib/grading/contracts";

interface SectionPanel {
  section: ClassSectionRecord;
  metrics: SectionLearnerMetric[];
  assignments: AssignmentRecord[];
  error?: string;
}

interface AssignmentDraft {
  title: string;
  chapterId: string;
  exerciseId: string;
  dueAtLocal: string;
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export default function ClassroomDashboardClient() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profile, setProfile] = useState<UserProfileRecord>();
  const [sections, setSections] = useState<SectionPanel[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, AssignmentDraft>
  >({});
  const [assignmentBusy, setAssignmentBusy] = useState<Record<string, boolean>>({});
  const [assignmentError, setAssignmentError] = useState<Record<string, string>>({});

  const isStaff = profile?.role === "instructor" || profile?.role === "ta";

  const loadSections = useCallback(async () => {
    if (!isStaff) {
      setSections([]);
      return;
    }

    setLoadingSections(true);
    try {
      const sectionsPayload = await readJson<ClassSectionsResponse>("/api/classroom/sections");
      const panels = await Promise.all(
        sectionsPayload.sections.map(async (section) => {
          try {
            const [metricsPayload, assignmentsPayload] = await Promise.all([
              readJson<SectionLearnerMetricsResponse>(
                `/api/classroom/sections/metrics?sectionId=${encodeURIComponent(section.sectionId)}`
              ),
              readJson<AssignmentsResponse>(
                `/api/classroom/assignments?sectionId=${encodeURIComponent(section.sectionId)}`
              ),
            ]);
            return {
              section,
              metrics: metricsPayload.metrics,
              assignments: assignmentsPayload.assignments,
            } as SectionPanel;
          } catch (error) {
            return {
              section,
              metrics: [],
              assignments: [],
              error:
                error instanceof Error
                  ? `Could not load classroom data: ${error.message}`
                  : "Could not load classroom data.",
            } as SectionPanel;
          }
        })
      );
      setSections(panels);
      setAssignmentDrafts((prev) => {
        const next = { ...prev };
        for (const panel of panels) {
          if (!next[panel.section.sectionId]) {
            next[panel.section.sectionId] = {
              title: "",
              chapterId: "",
              exerciseId: "",
              dueAtLocal: "",
            };
          }
        }
        return next;
      });
    } finally {
      setLoadingSections(false);
    }
  }, [isStaff]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const payload = await readJson<UserProfileResponse>("/api/auth/session");
        setProfile(payload.profile);
      } catch {
        setProfile(undefined);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  async function onSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const payload = await readJson<AuthSessionResponse>("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });
      setProfile(payload.profile);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onSignOut() {
    setAuthBusy(true);
    setAuthError("");
    try {
      await readJson<{ ok: boolean }>("/api/auth/session", { method: "DELETE" });
      setProfile(undefined);
      setSections([]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-out failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  function setDraftValue(sectionId: string, field: keyof AssignmentDraft, value: string) {
    setAssignmentDrafts((prev) => {
      const current = prev[sectionId] ?? {
        title: "",
        chapterId: "",
        exerciseId: "",
        dueAtLocal: "",
      };
      return {
        ...prev,
        [sectionId]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  async function onCreateAssignment(event: FormEvent<HTMLFormElement>, section: ClassSectionRecord) {
    event.preventDefault();
    const draft = assignmentDrafts[section.sectionId];
    if (!draft) return;

    setAssignmentBusy((prev) => ({ ...prev, [section.sectionId]: true }));
    setAssignmentError((prev) => ({ ...prev, [section.sectionId]: "" }));
    try {
      const dueAt =
        draft.dueAtLocal.length > 0 ? new Date(draft.dueAtLocal).getTime() : undefined;
      if (dueAt !== undefined && Number.isNaN(dueAt)) {
        throw new Error("Invalid due date.");
      }

      await readJson<AssignmentRecord>("/api/classroom/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.sectionId,
          courseSlug: section.courseSlug,
          chapterId: draft.chapterId.trim(),
          exerciseId: draft.exerciseId.trim(),
          title: draft.title.trim(),
          dueAt,
        }),
      });

      setAssignmentDrafts((prev) => ({
        ...prev,
        [section.sectionId]: {
          title: "",
          chapterId: "",
          exerciseId: "",
          dueAtLocal: "",
        },
      }));
      await loadSections();
    } catch (error) {
      setAssignmentError((prev) => ({
        ...prev,
        [section.sectionId]:
          error instanceof Error ? error.message : "Failed to create assignment.",
      }));
    } finally {
      setAssignmentBusy((prev) => ({ ...prev, [section.sectionId]: false }));
    }
  }

  const summary = useMemo(() => {
    const learners = sections.reduce((acc, section) => acc + section.metrics.length, 0);
    const attempts = sections.reduce(
      (acc, section) =>
        acc + section.metrics.reduce((a, metric) => a + metric.attemptsCount, 0),
      0
    );
    return {
      sections: sections.length,
      learners,
      attempts,
    };
  }, [sections]);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Classroom Dashboard</h1>
        <p className="text-sm text-gray-600 mb-4">
          Instructor-facing overview for sections, learner activity, and exports.
        </p>

        {!profile && (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={onSignIn}>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Instructor email"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name (optional)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              disabled={authBusy}
              className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {authBusy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {profile && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 font-medium">
              {profile.displayName} ({profile.role})
            </span>
            <span className="text-gray-600">{profile.email}</span>
            <button
              onClick={onSignOut}
              disabled={authBusy}
              className="ml-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        )}

        {authError && <p className="text-sm text-rose-700 mt-3">{authError}</p>}
        {!profile && (
          <p className="text-xs text-gray-500 mt-3">
            For instructor access during bootstrap, include your email in
            AUTH_BOOTSTRAP_INSTRUCTOR_EMAILS.
          </p>
        )}
      </section>

      {profile && !isStaff && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Your account role is <strong>{profile.role}</strong>. Instructor dashboard data is
          available only to instructor/ta roles.
        </section>
      )}

      {profile && isStaff && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Sections</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.sections}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Learners tracked</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.learners}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Attempts logged</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.attempts}</p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Section Activity</h2>
              {loadingSections && <span className="text-xs text-gray-500">Refreshing...</span>}
            </div>
            {sections.length === 0 && !loadingSections && (
              <p className="text-sm text-gray-600">No sections available yet.</p>
            )}
            <div className="space-y-4">
              {sections.map((panel) => (
                <div key={panel.section.sectionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{panel.section.title}</p>
                      <p className="text-xs text-gray-500">
                        {panel.section.courseSlug} · section {panel.section.sectionId}
                      </p>
                    </div>
                    <a
                      href={`/api/classroom/sections/export?sectionId=${encodeURIComponent(
                        panel.section.sectionId
                      )}&format=csv`}
                      className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      Download CSV
                    </a>
                  </div>
                  {panel.error && <p className="text-xs text-rose-700">{panel.error}</p>}
                  {!panel.error && panel.metrics.length === 0 && (
                    <p className="text-sm text-gray-600">No learner metrics yet.</p>
                  )}
                  {!panel.error && panel.metrics.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-1 pr-2">Learner</th>
                            <th className="py-1 pr-2">Completed</th>
                            <th className="py-1 pr-2">Attempts</th>
                            <th className="py-1">Last attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {panel.metrics.map((metric) => (
                            <tr key={metric.userId} className="border-t border-gray-100">
                              <td className="py-1.5 pr-2 font-mono">{metric.userId}</td>
                              <td className="py-1.5 pr-2">{metric.completedExercises}</td>
                              <td className="py-1.5 pr-2">{metric.attemptsCount}</td>
                              <td className="py-1.5">
                                {metric.lastAttemptAt
                                  ? new Date(metric.lastAttemptAt).toLocaleString()
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!panel.error && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Assignments</h3>
                      <form
                        className="grid gap-2 sm:grid-cols-5"
                        onSubmit={(event) => onCreateAssignment(event, panel.section)}
                      >
                        <input
                          value={assignmentDrafts[panel.section.sectionId]?.title ?? ""}
                          onChange={(event) =>
                            setDraftValue(panel.section.sectionId, "title", event.target.value)
                          }
                          placeholder="Title"
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        />
                        <input
                          value={assignmentDrafts[panel.section.sectionId]?.chapterId ?? ""}
                          onChange={(event) =>
                            setDraftValue(panel.section.sectionId, "chapterId", event.target.value)
                          }
                          placeholder="Chapter ID"
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        />
                        <input
                          value={assignmentDrafts[panel.section.sectionId]?.exerciseId ?? ""}
                          onChange={(event) =>
                            setDraftValue(
                              panel.section.sectionId,
                              "exerciseId",
                              event.target.value
                            )
                          }
                          placeholder="Exercise ID"
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        />
                        <input
                          type="datetime-local"
                          value={assignmentDrafts[panel.section.sectionId]?.dueAtLocal ?? ""}
                          onChange={(event) =>
                            setDraftValue(panel.section.sectionId, "dueAtLocal", event.target.value)
                          }
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={assignmentBusy[panel.section.sectionId]}
                          className="bg-indigo-600 text-white rounded px-2 py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {assignmentBusy[panel.section.sectionId] ? "Saving..." : "Add assignment"}
                        </button>
                      </form>
                      {assignmentError[panel.section.sectionId] && (
                        <p className="text-xs text-rose-700 mt-2">
                          {assignmentError[panel.section.sectionId]}
                        </p>
                      )}
                      {panel.assignments.length === 0 ? (
                        <p className="text-xs text-gray-500 mt-2">No assignments yet.</p>
                      ) : (
                        <div className="overflow-x-auto mt-2">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-1 pr-2">Title</th>
                                <th className="py-1 pr-2">Exercise</th>
                                <th className="py-1 pr-2">Due</th>
                                <th className="py-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {panel.assignments.map((assignment) => {
                                const now = Date.now();
                                const isLate =
                                  assignment.dueAt !== null && assignment.dueAt < now;
                                const hasDueDate = assignment.dueAt !== null;
                                return (
                                  <tr
                                    key={assignment.assignmentId}
                                    className="border-t border-gray-100"
                                  >
                                    <td className="py-1.5 pr-2">{assignment.title}</td>
                                    <td className="py-1.5 pr-2 font-mono">
                                      {assignment.chapterId}/{assignment.exerciseId}
                                    </td>
                                    <td className="py-1.5 pr-2">
                                      {hasDueDate
                                        ? new Date(assignment.dueAt as number).toLocaleString()
                                        : "No due date"}
                                    </td>
                                    <td className="py-1.5">
                                      {!hasDueDate && (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                          Open
                                        </span>
                                      )}
                                      {hasDueDate && !isLate && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                          Upcoming
                                        </span>
                                      )}
                                      {hasDueDate && isLate && (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                          Late
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
