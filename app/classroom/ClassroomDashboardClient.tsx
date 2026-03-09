"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { courses } from "@/lib/courses";
import type {
  AcademicTermRecord,
  AcademicTermsResponse,
  AssignmentRecord,
  AuthConfigResponse,
  RiskArchiveGovernanceConfigResponse,
  RiskArchiveAutomationResponse,
  RiskArchiveDestinationValidation,
  AuthSessionResponse,
  ClassSectionRecord,
  ClassSectionsResponse,
  ClassroomRiskConfig,
  SectionAssignmentBreakdownRecord,
  SectionGradeSummaryRecord,
  SectionEnrollmentRecord,
  SectionEnrollmentsResponse,
  SectionLearnerMetric,
  SectionRiskPolicyAuditRecord,
  SectionRiskArchivePolicyRecord,
  SectionRiskArchivePolicyResponse,
  SectionOverviewResponse,
  SectionRiskArchiveRunRecord,
  SectionRiskPolicyRecord,
  SectionRiskPolicyResponse,
  UserProfileRecord,
  UserProfileResponse,
} from "@/lib/grading/contracts";

interface SectionPanel {
  section: ClassSectionRecord;
  enrollments: SectionEnrollmentRecord[];
  metrics: SectionLearnerMetric[];
  assignments: AssignmentRecord[];
  assignmentBreakdown: SectionAssignmentBreakdownRecord[];
  gradeSummary: SectionGradeSummaryRecord[];
  riskPolicy?: SectionRiskPolicyRecord;
  riskPolicyHistory: SectionRiskPolicyAuditRecord[];
  riskArchivePolicy: SectionRiskArchivePolicyRecord;
  riskArchiveNextAt: number;
  riskArchiveRecentRuns: SectionRiskArchiveRunRecord[];
  riskArchiveWindow: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    failureRate: number;
    lastSuccessAt: number | null;
    lastFailureAt: number | null;
  };
  effectiveRiskConfig: ClassroomRiskConfig;
  error?: string;
}

interface AssignmentDraft {
  title: string;
  chapterId: string;
  exerciseId: string;
  dueAtLocal: string;
}

interface RiskArchiveDraft {
  enabled: boolean;
  cadence: "daily" | "weekly" | "monthly";
  retentionDays: number;
  destinationLabel: string;
}

interface TermDraft {
  title: string;
  startsAtLocal: string;
  endsAtLocal: string;
}

interface SectionDraft {
  termId: string;
  courseSlug: string;
  title: string;
}

interface MemberDraft {
  userId: string;
  role: "student" | "ta" | "instructor";
}

const DEFAULT_RISK_CONFIG: ClassroomRiskConfig = {
  minAttemptsAtRisk: 5,
  maxCompletionRateAtRisk: 25,
  overdueIncompleteFlagsAtRisk: true,
  maxCompletionRateStalledAssignment: 60,
};
const SECTION_VIRTUAL_ROW_HEIGHT = 170;
const SECTION_VIRTUAL_OVERSCAN = 3;
const SECTION_VIRTUAL_VIEWPORT_PX = 900;

function toLocalDateTimeInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultTermDraft(): TermDraft {
  const now = Date.now();
  const plus90Days = now + 90 * 24 * 60 * 60 * 1000;
  return {
    title: "",
    startsAtLocal: toLocalDateTimeInputValue(now),
    endsAtLocal: toLocalDateTimeInputValue(plus90Days),
  };
}

function getDefaultSectionDraft(termId = "", courseSlug = ""): SectionDraft {
  return {
    termId,
    courseSlug,
    title: "",
  };
}

function getDefaultDraftForCourse(courseSlug: string): AssignmentDraft {
  const course = courses.find((item) => item.slug === courseSlug);
  const firstChapter = course?.chapters[0];
  const firstExercise = firstChapter?.exercises[0];
  return {
    title: "",
    chapterId: firstChapter?.id ?? "",
    exerciseId: firstExercise?.id ?? "",
    dueAtLocal: "",
  };
}

function getCourseBySlug(courseSlug: string) {
  return courses.find((item) => item.slug === courseSlug);
}

function getExercisesForChapter(courseSlug: string, chapterId: string): { id: string; title: string }[] {
  const course = getCourseBySlug(courseSlug);
  const chapter = course?.chapters.find((item) => item.id === chapterId);
  return (chapter?.exercises ?? []).map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
  }));
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
  const [authMode, setAuthMode] = useState<"bootstrap" | "oidc">("bootstrap");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [archiveGovernanceError, setArchiveGovernanceError] = useState("");
  const [archiveGovernanceConfig, setArchiveGovernanceConfig] =
    useState<RiskArchiveGovernanceConfigResponse["config"]>();
  const [profile, setProfile] = useState<UserProfileRecord>();
  const [sections, setSections] = useState<SectionPanel[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, AssignmentDraft>
  >({});
  const [assignmentBusy, setAssignmentBusy] = useState<Record<string, boolean>>({});
  const [assignmentError, setAssignmentError] = useState<Record<string, string>>({});
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [termFilter, setTermFilter] = useState<string>("all");
  const [sectionPageSize] = useState<10 | 25 | 50>(10);
  const [terms, setTerms] = useState<AcademicTermRecord[]>([]);
  const [sectionSearch, setSectionSearch] = useState("");
  const [sectionSort] = useState<
    "created_desc" | "created_asc" | "title_asc" | "title_desc"
  >("created_desc");
  const [hasMoreSections, setHasMoreSections] = useState(false);
  const [totalSectionsCount, setTotalSectionsCount] = useState(0);
  const [learnerSearch, setLearnerSearch] = useState<Record<string, string>>({});
  const [learnerRiskFilter] = useState<Record<string, "all" | "at-risk" | "on-track">>({});
  const [learnerPage, setLearnerPage] = useState<Record<string, number>>({});
  const [riskPolicyDrafts, setRiskPolicyDrafts] = useState<Record<string, ClassroomRiskConfig>>(
    {}
  );
  const [riskPolicyBusy, setRiskPolicyBusy] = useState<Record<string, boolean>>({});
  const [riskPolicyError, setRiskPolicyError] = useState<Record<string, string>>({});
  const [riskArchiveDrafts, setRiskArchiveDrafts] = useState<Record<string, RiskArchiveDraft>>({});
  const [riskArchiveBusy, setRiskArchiveBusy] = useState<Record<string, boolean>>({});
  const [riskArchiveError, setRiskArchiveError] = useState<Record<string, string>>({});
  const [riskArchiveValidateBusy, setRiskArchiveValidateBusy] = useState<Record<string, boolean>>(
    {}
  );
  const [riskArchiveValidation, setRiskArchiveValidation] = useState<
    Record<string, RiskArchiveDestinationValidation | undefined>
  >({});
  const [riskArchiveRunBusy, setRiskArchiveRunBusy] = useState<Record<string, boolean>>({});
  const [riskArchiveRunResult, setRiskArchiveRunResult] = useState<Record<string, string>>({});
  const [expandedSections] = useState<Record<string, boolean>>({});
  const [virtualizeSectionList] = useState(true);
  const [sectionListScrollTop, setSectionListScrollTop] = useState(0);
  const [auditActorFilter, setAuditActorFilter] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState<"all" | "upsert" | "reset">("all");
  const [termDraft, setTermDraft] = useState<TermDraft>(() => getDefaultTermDraft());
  const [sectionDraft, setSectionDraft] = useState<SectionDraft>(() =>
    getDefaultSectionDraft("", courses[0]?.slug ?? "")
  );
  const [setupBusy, setSetupBusy] = useState<"none" | "term" | "section">("none");
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");
  const [showAdvancedGovernance, setShowAdvancedGovernance] = useState(false);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});
  const [memberBusy, setMemberBusy] = useState<Record<string, boolean>>({});
  const [memberError, setMemberError] = useState<Record<string, string>>({});

  const isStaff = profile?.role === "instructor" || profile?.role === "ta";
  const showAdvancedOps = false;

  const loadSections = useCallback(async (offset = 0, append = false) => {
    if (!isStaff) {
      setSections([]);
      setHasMoreSections(false);
      setTotalSectionsCount(0);
      return;
    }

    setLoadingSections(true);
    try {
      const params = new URLSearchParams({
        limit: String(sectionPageSize),
        offset: String(offset),
        sort: sectionSort,
      });
      if (courseFilter !== "all") params.set("courseSlug", courseFilter);
      if (termFilter !== "all") params.set("termId", termFilter);
      if (sectionSearch.trim().length > 0) params.set("search", sectionSearch.trim());
      const sectionsPayload = await readJson<ClassSectionsResponse>(
        `/api/classroom/sections?${params.toString()}`
      );
      const panels = await Promise.all(
        sectionsPayload.sections.map(async (section) => {
          try {
            const overview = await readJson<SectionOverviewResponse>(
              `/api/classroom/sections/overview?sectionId=${encodeURIComponent(section.sectionId)}`
            );
            const enrollmentsPayload = await readJson<SectionEnrollmentsResponse>(
              `/api/classroom/enrollments?sectionId=${encodeURIComponent(section.sectionId)}`
            );
            return {
              section,
              enrollments: enrollmentsPayload.enrollments,
              metrics: overview.metrics,
              assignments: overview.assignments,
              assignmentBreakdown: overview.assignmentBreakdown,
              gradeSummary: overview.gradeSummary,
              riskPolicy: overview.riskPolicy,
              riskPolicyHistory: overview.riskPolicyHistory,
              riskArchivePolicy: overview.riskArchivePolicy,
              riskArchiveNextAt: overview.riskArchiveNextAt,
              riskArchiveRecentRuns: overview.riskArchiveRecentRuns,
              riskArchiveWindow: overview.riskArchiveWindow,
              effectiveRiskConfig: overview.effectiveRiskConfig,
            } as SectionPanel;
          } catch (error) {
            return {
              section,
              enrollments: [],
              metrics: [],
              assignments: [],
              assignmentBreakdown: [],
              gradeSummary: [],
              riskPolicyHistory: [],
              riskArchivePolicy: {
                sectionId: section.sectionId,
                enabled: false,
                cadence: "weekly",
                retentionDays: 180,
                destinationLabel: null,
                lastArchivedAt: null,
                updatedAt: Date.now(),
              },
              riskArchiveNextAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
              riskArchiveRecentRuns: [],
              riskArchiveWindow: {
                totalRuns: 0,
                successRuns: 0,
                failedRuns: 0,
                failureRate: 0,
                lastSuccessAt: null,
                lastFailureAt: null,
              },
              effectiveRiskConfig: DEFAULT_RISK_CONFIG,
              error:
                error instanceof Error
                  ? `Could not load classroom data: ${error.message}`
                  : "Could not load classroom data.",
            } as SectionPanel;
          }
        })
      );
      let mergedLength = panels.length;
      setSections((prev) => {
        const merged = append ? [...prev, ...panels] : panels;
        mergedLength = merged.length;
        return merged;
      });
      const totalCount = sectionsPayload.totalCount ?? panels.length;
      setTotalSectionsCount(totalCount);
      setHasMoreSections(mergedLength < totalCount);
      setAssignmentDrafts((prev) => {
        const next = { ...prev };
        for (const panel of panels) {
          if (!next[panel.section.sectionId]) {
            next[panel.section.sectionId] = getDefaultDraftForCourse(
              panel.section.courseSlug
            );
          }
        }
        return next;
      });
      setRiskPolicyDrafts((prev) => {
        const next = { ...prev };
        for (const panel of panels) {
          next[panel.section.sectionId] = panel.effectiveRiskConfig;
        }
        return next;
      });
      setRiskArchiveDrafts((prev) => {
        const next = { ...prev };
        for (const panel of panels) {
          next[panel.section.sectionId] = {
            enabled: panel.riskArchivePolicy.enabled,
            cadence: panel.riskArchivePolicy.cadence,
            retentionDays: panel.riskArchivePolicy.retentionDays,
            destinationLabel: panel.riskArchivePolicy.destinationLabel ?? "",
          };
        }
        return next;
      });
      setMemberDrafts((prev) => {
        const next = { ...prev };
        for (const panel of panels) {
          if (!next[panel.section.sectionId]) {
            next[panel.section.sectionId] = { userId: "", role: "student" };
          }
        }
        return next;
      });
    } finally {
      setLoadingSections(false);
    }
  }, [courseFilter, isStaff, sectionPageSize, sectionSearch, sectionSort, termFilter]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const config = await readJson<AuthConfigResponse>("/api/auth/config");
        setAuthMode(config.mode);
        const payload = await readJson<UserProfileResponse>("/api/auth/session");
        setProfile(payload.profile);
      } catch {
        setProfile(undefined);
      }
    };
    void loadAuth();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get("authError");
    if (!errorParam) return;
    setAuthError(errorParam);
    url.searchParams.delete("authError");
    window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    if (!profile || !isStaff) {
      setTerms([]);
      return;
    }
    const loadTerms = async () => {
      try {
        const payload = await readJson<AcademicTermsResponse>("/api/classroom/terms");
        setTerms(payload.terms);
      } catch {
        setTerms([]);
      }
    };
    void loadTerms();
  }, [isStaff, profile]);

  useEffect(() => {
    if (!profile || !isStaff) {
      setArchiveGovernanceConfig(undefined);
      setArchiveGovernanceError("");
      return;
    }
    const loadArchiveGovernance = async () => {
      try {
        const payload = await readJson<RiskArchiveGovernanceConfigResponse>(
          "/api/classroom/risk-archive/config"
        );
        setArchiveGovernanceConfig(payload.config);
        setArchiveGovernanceError("");
      } catch (error) {
        setArchiveGovernanceConfig(undefined);
        setArchiveGovernanceError(
          error instanceof Error ? error.message : "Failed to load archive governance config."
        );
      }
    };
    void loadArchiveGovernance();
  }, [isStaff, profile]);

  useEffect(() => {
    void loadSections(0, false);
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

  function onOidcSignIn() {
    setAuthError("");
    window.location.assign("/api/auth/login");
  }

  function setDraftValue(sectionId: string, field: keyof AssignmentDraft, value: string) {
    setAssignmentDrafts((prev) => {
      const section = sections.find((item) => item.section.sectionId === sectionId);
      const current = prev[sectionId] ?? {
        ...getDefaultDraftForCourse(section?.section.courseSlug ?? ""),
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

  function setLearnerSearchValue(sectionId: string, value: string) {
    setLearnerSearch((prev) => ({ ...prev, [sectionId]: value }));
    setLearnerPage((prev) => ({ ...prev, [sectionId]: 1 }));
  }

  function setRiskPolicyDraftValue(
    sectionId: string,
    field: keyof ClassroomRiskConfig,
    value: number | boolean
  ) {
    setRiskPolicyDrafts((prev) => {
      const current = prev[sectionId] ?? DEFAULT_RISK_CONFIG;
      return {
        ...prev,
        [sectionId]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  function setRiskArchiveDraftValue(
    sectionId: string,
    field: keyof RiskArchiveDraft,
    value: string | number | boolean
  ) {
    setRiskArchiveDrafts((prev) => {
      const current = prev[sectionId] ?? {
        enabled: false,
        cadence: "weekly",
        retentionDays: 180,
        destinationLabel: "",
      };
      return {
        ...prev,
        [sectionId]: {
          ...current,
          [field]: value,
        } as RiskArchiveDraft,
      };
    });
  }

  async function onSaveRiskPolicy(sectionId: string) {
    const draft = riskPolicyDrafts[sectionId];
    if (!draft) return;
    setRiskPolicyBusy((prev) => ({ ...prev, [sectionId]: true }));
    setRiskPolicyError((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      await readJson<SectionRiskPolicyResponse>(
        `/api/classroom/sections/risk-policy?sectionId=${encodeURIComponent(sectionId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );
      await loadSections(0, false);
    } catch (error) {
      setRiskPolicyError((prev) => ({
        ...prev,
        [sectionId]:
          error instanceof Error ? error.message : "Failed to save section risk policy.",
      }));
    } finally {
      setRiskPolicyBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  async function onResetRiskPolicy(sectionId: string) {
    setRiskPolicyBusy((prev) => ({ ...prev, [sectionId]: true }));
    setRiskPolicyError((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      await readJson<SectionRiskPolicyResponse>(
        `/api/classroom/sections/risk-policy?sectionId=${encodeURIComponent(sectionId)}`,
        { method: "DELETE" }
      );
      await loadSections(0, false);
    } catch (error) {
      setRiskPolicyError((prev) => ({
        ...prev,
        [sectionId]:
          error instanceof Error ? error.message : "Failed to reset section risk policy.",
      }));
    } finally {
      setRiskPolicyBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  async function onSaveRiskArchivePolicy(sectionId: string) {
    const draft = riskArchiveDrafts[sectionId];
    if (!draft) return;
    setRiskArchiveBusy((prev) => ({ ...prev, [sectionId]: true }));
    setRiskArchiveError((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      await readJson<SectionRiskArchivePolicyResponse>(
        `/api/classroom/sections/risk-policy/archive?sectionId=${encodeURIComponent(sectionId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: draft.enabled,
            cadence: draft.cadence,
            retentionDays: draft.retentionDays,
            destinationLabel: draft.destinationLabel,
          }),
        }
      );
      await loadSections(0, false);
    } catch (error) {
      setRiskArchiveError((prev) => ({
        ...prev,
        [sectionId]:
          error instanceof Error ? error.message : "Failed to save archive policy.",
      }));
    } finally {
      setRiskArchiveBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  async function onValidateRiskArchiveDestination(sectionId: string) {
    const draft = riskArchiveDrafts[sectionId];
    if (!draft) return;
    setRiskArchiveValidateBusy((prev) => ({ ...prev, [sectionId]: true }));
    setRiskArchiveError((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      const result = await readJson<RiskArchiveDestinationValidation>(
        `/api/classroom/sections/risk-policy/archive/validate?sectionId=${encodeURIComponent(
          sectionId
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destinationLabel: draft.destinationLabel }),
        }
      );
      setRiskArchiveValidation((prev) => ({ ...prev, [sectionId]: result }));
    } catch (error) {
      setRiskArchiveError((prev) => ({
        ...prev,
        [sectionId]:
          error instanceof Error ? error.message : "Failed to validate archive destination.",
      }));
      setRiskArchiveValidation((prev) => ({ ...prev, [sectionId]: undefined }));
    } finally {
      setRiskArchiveValidateBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  async function onRunArchiveNow(sectionId: string) {
    setRiskArchiveRunBusy((prev) => ({ ...prev, [sectionId]: true }));
    setRiskArchiveError((prev) => ({ ...prev, [sectionId]: "" }));
    setRiskArchiveRunResult((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      const response = await readJson<RiskArchiveAutomationResponse>(
        "/api/classroom/risk-archive/run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        }
      );
      const item = response.processed[0];
      if (!item) {
        setRiskArchiveRunResult((prev) => ({
          ...prev,
          [sectionId]: "No archive run item was returned.",
        }));
      } else if (item.status === "success") {
        setRiskArchiveRunResult((prev) => ({
          ...prev,
          [sectionId]: `Archive run succeeded (${item.archivedRecords} records).`,
        }));
      } else if (item.status === "skipped") {
        setRiskArchiveRunResult((prev) => ({
          ...prev,
          [sectionId]: [
            "Archive run skipped (not due or policy disabled).",
            item.alertLevel && item.alertLevel !== "none"
              ? `Alert level: ${item.alertLevel}.`
              : "",
          ]
            .filter((part) => part.length > 0)
            .join(" "),
        }));
      } else {
        const recommendationText =
          item.recommendedActions && item.recommendedActions.length > 0
            ? ` Next actions: ${item.recommendedActions.join(" ")}`
            : "";
        const notifyText = item.notificationTarget
          ? ` Notify target: ${item.notificationTarget}.`
          : "";
        const streakText =
          typeof item.failureStreak === "number" ? ` Failure streak: ${item.failureStreak}.` : "";
        setRiskArchiveRunResult((prev) => ({
          ...prev,
          [sectionId]: `Archive run failed: ${item.errorMessage ?? "Unknown error."}${streakText}${notifyText}${recommendationText}`,
        }));
      }
      await loadSections(0, false);
    } catch (error) {
      setRiskArchiveError((prev) => ({
        ...prev,
        [sectionId]:
          error instanceof Error ? error.message : "Failed to record archive run.",
      }));
    } finally {
      setRiskArchiveRunBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  async function onRunDueArchivesNow() {
    const globalKey = "__all_due__";
    setRiskArchiveRunBusy((prev) => ({ ...prev, [globalKey]: true }));
    setRiskArchiveRunResult((prev) => ({ ...prev, [globalKey]: "" }));
    try {
      const response = await readJson<RiskArchiveAutomationResponse>(
        "/api/classroom/risk-archive/run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const total = response.processed.length;
      const successCount = response.processed.filter((item) => item.status === "success").length;
      const failed = response.processed.filter((item) => item.status === "failure");
      const skippedCount = response.processed.filter((item) => item.status === "skipped").length;
      const criticalCount = response.processed.filter((item) => item.alertLevel === "critical").length;

      let summary = `Run due archives complete: ${successCount} success, ${failed.length} failure, ${skippedCount} skipped across ${total} sections.`;
      if (criticalCount > 0) {
        summary += ` ${criticalCount} section(s) are at critical escalation level.`;
      }
      const notifyTargets = Array.from(
        new Set(
          failed
            .map((item) => item.notificationTarget ?? "")
            .filter((target) => target.length > 0)
        )
      );
      if (notifyTargets.length > 0) {
        summary += ` Notify: ${notifyTargets.join(", ")}.`;
      }
      setRiskArchiveRunResult((prev) => ({ ...prev, [globalKey]: summary }));
      await loadSections(0, false);
    } catch (error) {
      setRiskArchiveRunResult((prev) => ({
        ...prev,
        [globalKey]:
          error instanceof Error ? error.message : "Failed to run due archive automation.",
      }));
    } finally {
      setRiskArchiveRunBusy((prev) => ({ ...prev, [globalKey]: false }));
    }
  }

  function getRiskPolicyExportHref(sectionId: string) {
    const params = new URLSearchParams({
      sectionId,
      format: "csv",
      limit: "500",
    });
    if (auditActionFilter !== "all") {
      params.set("action", auditActionFilter);
    }
    if (auditActorFilter.trim().length > 0) {
      params.set("actor", auditActorFilter.trim());
    }
    return `/api/classroom/sections/risk-policy/export?${params.toString()}`;
  }

  function getRiskArchiveRunExportHref(sectionId: string) {
    const params = new URLSearchParams({
      sectionId,
      format: "csv",
      limit: "100",
    });
    return `/api/classroom/sections/risk-policy/archive/report/export?${params.toString()}`;
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
        [section.sectionId]: getDefaultDraftForCourse(section.courseSlug),
      }));
      await loadSections(0, false);
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

  async function onCreateTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupBusy("term");
    setSetupError("");
    setSetupSuccess("");
    try {
      const startsAt = new Date(termDraft.startsAtLocal).getTime();
      const endsAt = new Date(termDraft.endsAtLocal).getTime();
      if (!termDraft.title.trim()) {
        throw new Error("Term title is required.");
      }
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
        throw new Error("Term start and end dates are required.");
      }
      await readJson<AcademicTermRecord>("/api/classroom/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: termDraft.title.trim(),
          startsAt,
          endsAt,
        }),
      });
      const payload = await readJson<AcademicTermsResponse>("/api/classroom/terms");
      setTerms(payload.terms);
      const newest = [...payload.terms].sort((a, b) => b.createdAt - a.createdAt)[0];
      setSectionDraft((prev) => ({ ...prev, termId: newest?.termId ?? prev.termId }));
      setTermDraft(getDefaultTermDraft());
      setSetupSuccess("Term created. Next: create your first section.");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to create term.");
    } finally {
      setSetupBusy("none");
    }
  }

  async function onCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSetupBusy("section");
    setSetupError("");
    setSetupSuccess("");
    try {
      if (!sectionDraft.termId || !sectionDraft.courseSlug || !sectionDraft.title.trim()) {
        throw new Error("Section term, course, and title are required.");
      }
      await readJson<ClassSectionRecord>("/api/classroom/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termId: sectionDraft.termId,
          courseSlug: sectionDraft.courseSlug,
          title: sectionDraft.title.trim(),
          instructorUserId: profile.userId,
        }),
      });
      setSectionDraft((prev) => ({ ...prev, title: "" }));
      setSetupSuccess("Section created. Next: add assignments in Section Activity.");
      await loadSections(0, false);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Failed to create section.");
    } finally {
      setSetupBusy("none");
    }
  }

  async function onAddMember(event: FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault();
    const draft = memberDrafts[sectionId];
    if (!draft || !draft.userId.trim()) return;

    setMemberBusy((prev) => ({ ...prev, [sectionId]: true }));
    setMemberError((prev) => ({ ...prev, [sectionId]: "" }));
    try {
      await readJson<SectionEnrollmentRecord>("/api/classroom/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          userId: draft.userId.trim(),
          role: draft.role,
        }),
      });
      setMemberDrafts((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], userId: "" },
      }));
      await loadSections(0, false);
    } catch (error) {
      setMemberError((prev) => ({
        ...prev,
        [sectionId]: error instanceof Error ? error.message : "Failed to add member.",
      }));
    } finally {
      setMemberBusy((prev) => ({ ...prev, [sectionId]: false }));
    }
  }

  const summary = useMemo(() => {
    const learners = sections.reduce((acc, section) => acc + section.metrics.length, 0);
    const attempts = sections.reduce(
      (acc, section) =>
        acc + section.metrics.reduce((a, metric) => a + metric.attemptsCount, 0),
      0
    );
    const avgCompletionRate =
      sections.length === 0
        ? 0
        : Number(
            (
              sections.reduce((acc, section) => {
                if (section.gradeSummary.length === 0) return acc;
                const localAvg =
                  section.gradeSummary.reduce((sum, row) => sum + row.completionRate, 0) /
                  section.gradeSummary.length;
                return acc + localAvg;
              }, 0) / sections.length
            ).toFixed(1)
          );
    const assignmentsPublished = sections.reduce(
      (acc, section) => acc + section.assignments.length,
      0
    );
    return {
      sections: sections.length,
      learners,
      attempts,
      avgCompletionRate,
      assignmentsPublished,
    };
  }, [sections]);

  const leaderboardRows = useMemo(() => {
    return sections
      .flatMap((panel) =>
        panel.gradeSummary.map((row) => ({
          sectionId: panel.section.sectionId,
          sectionTitle: panel.section.title,
          courseSlug: panel.section.courseSlug,
          userId: row.userId,
          completionRate: row.completionRate,
          completedAssignments: row.completedAssignments,
          assignmentsCount: row.assignmentsCount,
          attemptsCount: row.attemptsCount,
        }))
      )
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
        if (b.completedAssignments !== a.completedAssignments) {
          return b.completedAssignments - a.completedAssignments;
        }
        return a.attemptsCount - b.attemptsCount;
      });
  }, [sections]);

  const onboardingChecklist = useMemo(
    () => [
      { label: "Sign in as instructor", done: Boolean(profile && profile.role === "instructor") },
      { label: "Create an academic term", done: terms.length > 0 },
      { label: "Create a section", done: sections.length > 0 },
      {
        label: "Create at least one assignment",
        done: sections.some((panel) => panel.assignments.length > 0),
      },
      {
        label: "Receive first learner submission",
        done: summary.attempts > 0,
      },
    ],
    [profile, sections, summary.attempts, terms.length]
  );

  const filteredSections = useMemo(() => {
    return sections.filter((panel) => {
      if (courseFilter !== "all" && panel.section.courseSlug !== courseFilter) return false;
      if (termFilter !== "all" && panel.section.termId !== termFilter) return false;
      return true;
    });
  }, [courseFilter, sections, termFilter]);

  const auditRows = useMemo(() => {
    const actorNeedle = auditActorFilter.trim().toLowerCase();
    return filteredSections
      .flatMap((panel) =>
        panel.riskPolicyHistory.map((event) => ({
          event,
          sectionId: panel.section.sectionId,
          sectionTitle: panel.section.title,
          courseSlug: panel.section.courseSlug,
        }))
      )
      .filter((row) => {
        if (auditActionFilter !== "all" && row.event.action !== auditActionFilter) return false;
        if (actorNeedle.length > 0 && !row.event.actorUserId.toLowerCase().includes(actorNeedle)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.event.createdAt - a.event.createdAt);
  }, [auditActionFilter, auditActorFilter, filteredSections]);

  const shouldVirtualizeSections = useMemo(
    () => virtualizeSectionList && filteredSections.length > 8,
    [filteredSections.length, virtualizeSectionList]
  );

  const sectionVirtualWindow = useMemo(() => {
    if (!shouldVirtualizeSections) {
      return {
        startIndex: 0,
        endIndex: filteredSections.length,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }
    const visibleRows = Math.ceil(SECTION_VIRTUAL_VIEWPORT_PX / SECTION_VIRTUAL_ROW_HEIGHT);
    const startIndex = Math.max(
      0,
      Math.floor(sectionListScrollTop / SECTION_VIRTUAL_ROW_HEIGHT) - SECTION_VIRTUAL_OVERSCAN
    );
    const endIndex = Math.min(
      filteredSections.length,
      startIndex + visibleRows + SECTION_VIRTUAL_OVERSCAN * 2
    );
    return {
      startIndex,
      endIndex,
      paddingTop: startIndex * SECTION_VIRTUAL_ROW_HEIGHT,
      paddingBottom: Math.max(
        0,
        (filteredSections.length - endIndex) * SECTION_VIRTUAL_ROW_HEIGHT
      ),
    };
  }, [filteredSections.length, sectionListScrollTop, shouldVirtualizeSections]);

  const visibleSectionPanels = useMemo(
    () => filteredSections.slice(sectionVirtualWindow.startIndex, sectionVirtualWindow.endIndex),
    [filteredSections, sectionVirtualWindow.endIndex, sectionVirtualWindow.startIndex]
  );

  useEffect(() => {
    setSectionListScrollTop(0);
  }, [courseFilter, termFilter, sectionSearch, sectionSort, sectionPageSize, virtualizeSectionList]);

  return (
    <div className="space-y-6">
      <section
        id="classroom-overview"
        className="scroll-mt-20 bg-white border border-gray-200 rounded-xl p-5"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Classroom Dashboard</h1>
        <p className="text-sm text-gray-600 mb-4">
          Use this to assign practice content, track class participation, and identify bonus-credit candidates.
        </p>

        {!profile && authMode === "bootstrap" && (
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

        {!profile && authMode === "oidc" && (
          <button
            onClick={onOidcSignIn}
            className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Sign in with campus SSO
          </button>
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
        {!profile && authMode === "bootstrap" && (
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
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Avg completion rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.avgCompletionRate}%
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Assignments published</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.assignmentsPublished}</p>
            </div>
          </section>

          {summary.sections === 0 && (
            <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-indigo-900">Getting started checklist</h2>
                <p className="text-sm text-indigo-800 mt-1">
                  Your classroom is empty right now. Complete these steps to populate Overview,
                  Risk Policy Audit, and Section Activity.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {onboardingChecklist.map((step) => (
                  <li key={step.label} className="flex items-center gap-2 text-indigo-900">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        step.done ? "bg-emerald-100 text-emerald-700" : "bg-white text-indigo-700"
                      }`}
                    >
                      {step.done ? "✓" : "•"}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ul>
              {profile.role === "instructor" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <form className="space-y-2 rounded border border-indigo-200 bg-white p-3" onSubmit={onCreateTerm}>
                    <p className="text-sm font-medium text-gray-900">1) Create academic term</p>
                    <input
                      value={termDraft.title}
                      onChange={(event) => setTermDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="e.g. Spring 2026"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={termDraft.startsAtLocal}
                        onChange={(event) =>
                          setTermDraft((prev) => ({ ...prev, startsAtLocal: event.target.value }))
                        }
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                        required
                      />
                      <input
                        type="datetime-local"
                        value={termDraft.endsAtLocal}
                        onChange={(event) =>
                          setTermDraft((prev) => ({ ...prev, endsAtLocal: event.target.value }))
                        }
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                        required
                      />
                    </div>
                    <button
                      disabled={setupBusy !== "none"}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {setupBusy === "term" ? "Creating term..." : "Create term"}
                    </button>
                  </form>
                  <form className="space-y-2 rounded border border-indigo-200 bg-white p-3" onSubmit={onCreateSection}>
                    <p className="text-sm font-medium text-gray-900">2) Create section</p>
                    <select
                      value={sectionDraft.termId}
                      onChange={(event) =>
                        setSectionDraft((prev) => ({ ...prev, termId: event.target.value }))
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    >
                      <option value="">Select term</option>
                      {terms.map((term) => (
                        <option key={term.termId} value={term.termId}>
                          {term.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sectionDraft.courseSlug}
                      onChange={(event) =>
                        setSectionDraft((prev) => ({ ...prev, courseSlug: event.target.value }))
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    >
                      {courses.map((course) => (
                        <option key={course.slug} value={course.slug}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    <input
                      value={sectionDraft.title}
                      onChange={(event) =>
                        setSectionDraft((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="e.g. Econ 101 - Section A"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    />
                    <button
                      disabled={setupBusy !== "none"}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {setupBusy === "section" ? "Creating section..." : "Create section"}
                    </button>
                  </form>
                </div>
              )}
              {setupError && <p className="text-sm text-rose-700">{setupError}</p>}
              {setupSuccess && <p className="text-sm text-emerald-700">{setupSuccess}</p>}
            </section>
          )}

          <section
            id="classroom-leaderboards"
            className="scroll-mt-20 bg-white border border-gray-200 rounded-xl p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Class leaderboards</h2>
                <p className="text-sm text-gray-600">
                  Highlight participation and completion across all your sections.
                </p>
              </div>
            </div>
            {leaderboardRows.length === 0 ? (
              <p className="text-sm text-gray-600">
                No learner activity yet. Leaderboards appear after students start submitting.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1 pr-2">Rank</th>
                      <th className="py-1 pr-2">Learner</th>
                      <th className="py-1 pr-2">Section</th>
                      <th className="py-1 pr-2">Completion</th>
                      <th className="py-1 pr-2">Assignments</th>
                      <th className="py-1 pr-2">Bonus candidate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardRows.slice(0, 25).map((row, index) => {
                      const bonusCandidate =
                        row.assignmentsCount > 0 &&
                        row.completionRate >= 80 &&
                        row.completedAssignments >= Math.ceil(row.assignmentsCount * 0.8);
                      return (
                        <tr key={`${row.sectionId}:${row.userId}`} className="border-t border-gray-100">
                          <td className="py-1.5 pr-2 font-semibold text-gray-800">#{index + 1}</td>
                          <td className="py-1.5 pr-2 font-mono">{row.userId}</td>
                          <td className="py-1.5 pr-2">
                            {row.sectionTitle}
                            <span className="ml-1 text-gray-400">({row.courseSlug})</span>
                          </td>
                          <td className="py-1.5 pr-2">{row.completionRate.toFixed(1)}%</td>
                          <td className="py-1.5 pr-2">
                            {row.completedAssignments}/{row.assignmentsCount}
                          </td>
                          <td className="py-1.5 pr-2">
                            {bonusCandidate ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                Eligible
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                Not yet
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
          </section>

          

          <section
            id="classroom-section-activity"
            className="scroll-mt-20 bg-white border border-gray-200 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Members, assignments, and activity</h2>
              <div className="flex items-center gap-2">
                <input
                  value={sectionSearch}
                  onChange={(event) => setSectionSearch(event.target.value)}
                  placeholder="Search section"
                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                />
                <select
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                >
                  <option value="all">All courses</option>
                  {Array.from(new Set(sections.map((panel) => panel.section.courseSlug))).map(
                    (slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={termFilter}
                  onChange={(event) => setTermFilter(event.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                >
                  <option value="all">All terms</option>
                  {terms.map((term) => (
                    <option key={term.termId} value={term.termId}>
                      {term.title}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  {sections.length}/{totalSectionsCount} loaded
                </span>
                {loadingSections && <span className="text-xs text-gray-500">Refreshing...</span>}
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Members</p>
                <p className="text-xl font-semibold text-gray-900">{summary.learners}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Add and view members inside each section card below.
                </p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Assignments / learning paths</p>
                <p className="text-xl font-semibold text-gray-900">{summary.assignmentsPublished}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Create assignments inside each section card below.
                </p>
              </div>
            </div>
            {sections.length === 0 && !loadingSections && (
              <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                <p className="font-medium">No sections yet.</p>
                <p className="mt-1">
                  Create your first section in the Getting started checklist above; members and assignment controls will appear immediately after.
                </p>
              </div>
            )}
            {sections.length > 0 && filteredSections.length === 0 && (
              <p className="text-sm text-gray-600">No sections match these filters.</p>
            )}
            {shouldVirtualizeSections && (
              <p className="mb-2 text-xs text-gray-500">
                Virtualized rendering active ({visibleSectionPanels.length}/{filteredSections.length} section cards in DOM).
              </p>
            )}
            <div
              className={shouldVirtualizeSections ? "max-h-[70vh] overflow-y-auto rounded border border-gray-200 p-3" : ""}
              onScroll={
                shouldVirtualizeSections
                  ? (event) => setSectionListScrollTop(event.currentTarget.scrollTop)
                  : undefined
              }
            >
              <div
                className="space-y-4"
                style={
                  shouldVirtualizeSections
                    ? {
                        paddingTop: sectionVirtualWindow.paddingTop,
                        paddingBottom: sectionVirtualWindow.paddingBottom,
                      }
                    : undefined
                }
              >
              {visibleSectionPanels.map((panel) => {
                const panelRiskConfig = panel.effectiveRiskConfig;
                const sectionExpanded = expandedSections[panel.section.sectionId] ?? true;
                const searchQuery = (learnerSearch[panel.section.sectionId] ?? "").trim().toLowerCase();
                const riskMode = learnerRiskFilter[panel.section.sectionId] ?? "all";
                const overdueAssignments = panel.assignments.filter(
                  (assignment) => assignment.dueAt !== null && assignment.dueAt < Date.now()
                ).length;
                const learnerRows = panel.metrics
                  .map((metric) => {
                    const learnerSummary = panel.gradeSummary.find(
                      (row) => row.userId === metric.userId
                    );
                    const completionRate = learnerSummary?.completionRate ?? 0;
                    const overdueRuleTriggered =
                      panelRiskConfig.overdueIncompleteFlagsAtRisk &&
                      overdueAssignments > 0 &&
                      completionRate < 100;
                    const attemptsRuleTriggered =
                      metric.attemptsCount >= panelRiskConfig.minAttemptsAtRisk &&
                      completionRate < panelRiskConfig.maxCompletionRateAtRisk;
                    const atRisk =
                      overdueRuleTriggered || attemptsRuleTriggered;
                    return {
                      metric,
                      completionRate,
                      atRisk,
                    };
                  })
                  .filter((row) => {
                    if (searchQuery.length > 0 && !row.metric.userId.toLowerCase().includes(searchQuery)) {
                      return false;
                    }
                    if (riskMode === "at-risk") return row.atRisk;
                    if (riskMode === "on-track") return !row.atRisk;
                    return true;
                  });

                const pageSize = 10;
                const totalPages = Math.max(1, Math.ceil(learnerRows.length / pageSize));
                const currentPage = Math.min(
                  learnerPage[panel.section.sectionId] ?? 1,
                  totalPages
                );
                const pageStart = (currentPage - 1) * pageSize;
                const visibleRows = learnerRows.slice(pageStart, pageStart + pageSize);
                const breakdownByAssignmentId = new Map(
                  panel.assignmentBreakdown.map((item) => [item.assignmentId, item])
                );

                return (
                  <div
                    key={panel.section.sectionId}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{panel.section.title}</p>
                      <p className="text-xs text-gray-500">
                        {panel.section.courseSlug} · section {panel.section.sectionId}
                      </p>
                      {!panel.error && panel.gradeSummary.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Avg completion:{" "}
                          {(
                            panel.gradeSummary.reduce(
                              (acc, row) => acc + row.completionRate,
                              0
                            ) / panel.gradeSummary.length
                          ).toFixed(1)}
                          %
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/classroom/sections/export?sectionId=${encodeURIComponent(
                          panel.section.sectionId
                        )}&format=csv`}
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                      >
                        Download CSV
                      </a>
                    </div>
                  </div>
                  {!sectionExpanded ? (
                    <p className="text-xs text-gray-500">
                      Details collapsed to improve dashboard rendering performance for large section lists.
                    </p>
                  ) : (
                    <>
                  {panel.error && <p className="text-xs text-rose-700">{panel.error}</p>}
                  {!panel.error && (
                    <div className="mt-3 rounded border border-gray-100 p-3">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Members</h3>
                      <form
                        className="grid gap-2 sm:grid-cols-4"
                        onSubmit={(event) => onAddMember(event, panel.section.sectionId)}
                      >
                        <input
                          value={memberDrafts[panel.section.sectionId]?.userId ?? ""}
                          onChange={(event) =>
                            setMemberDrafts((prev) => ({
                              ...prev,
                              [panel.section.sectionId]: {
                                ...(prev[panel.section.sectionId] ?? { role: "student", userId: "" }),
                                userId: event.target.value,
                              },
                            }))
                          }
                          placeholder="Learner user ID"
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        />
                        <select
                          value={memberDrafts[panel.section.sectionId]?.role ?? "student"}
                          onChange={(event) =>
                            setMemberDrafts((prev) => ({
                              ...prev,
                              [panel.section.sectionId]: {
                                ...(prev[panel.section.sectionId] ?? { role: "student", userId: "" }),
                                role: event.target.value as "student" | "ta" | "instructor",
                              },
                            }))
                          }
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="student">Student</option>
                          <option value="ta">Teaching assistant</option>
                          <option value="instructor">Instructor</option>
                        </select>
                        <button
                          type="submit"
                          disabled={memberBusy[panel.section.sectionId]}
                          className="bg-indigo-600 text-white rounded px-2 py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {memberBusy[panel.section.sectionId] ? "Adding..." : "Add member"}
                        </button>
                      </form>
                      {memberError[panel.section.sectionId] && (
                        <p className="mt-2 text-xs text-rose-700">{memberError[panel.section.sectionId]}</p>
                      )}
                      {panel.enrollments.length === 0 ? (
                        <p className="mt-2 text-xs text-gray-500">No members enrolled yet.</p>
                      ) : (
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-1 pr-2">User</th>
                                <th className="py-1 pr-2">Role</th>
                                <th className="py-1 pr-2">Status</th>
                                <th className="py-1">Enrolled</th>
                              </tr>
                            </thead>
                            <tbody>
                              {panel.enrollments.map((enrollment) => (
                                <tr key={enrollment.enrollmentId} className="border-t border-gray-100">
                                  <td className="py-1.5 pr-2 font-mono">{enrollment.userId}</td>
                                  <td className="py-1.5 pr-2">{enrollment.role}</td>
                                  <td className="py-1.5 pr-2">{enrollment.status}</td>
                                  <td className="py-1.5">
                                    {new Date(enrollment.enrolledAt).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {!panel.error && panel.metrics.length === 0 && (
                    <p className="text-sm text-gray-600">No learner metrics yet.</p>
                  )}
                  {!panel.error && panel.metrics.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={learnerSearch[panel.section.sectionId] ?? ""}
                          onChange={(event) =>
                            setLearnerSearchValue(panel.section.sectionId, event.target.value)
                          }
                          placeholder="Filter by learner id"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-gray-500">
                          Showing {visibleRows.length} of {learnerRows.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-1 pr-2">Learner</th>
                            <th className="py-1 pr-2">Completed</th>
                            <th className="py-1 pr-2">Attempts</th>
                            <th className="py-1 pr-2">Overdue</th>
                            <th className="py-1 pr-2">Completion rate</th>
                            <th className="py-1">Last attempt</th>
                          </tr>
                        </thead>
                          <tbody>
                            {visibleRows.map((row) => {
                              const { metric, completionRate } = row;
                              return (
                              <tr key={metric.userId} className="border-t border-gray-100">
                                <td className="py-1.5 pr-2 font-mono">{metric.userId}</td>
                                <td className="py-1.5 pr-2">{metric.completedExercises}</td>
                                <td className="py-1.5 pr-2">{metric.attemptsCount}</td>
                                <td className="py-1.5 pr-2">{overdueAssignments}</td>
                                <td className="py-1.5 pr-2">{completionRate.toFixed(1)}%</td>
                                <td className="py-1.5">
                                  {metric.lastAttemptAt
                                    ? new Date(metric.lastAttemptAt).toLocaleString()
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                          {visibleRows.length === 0 && (
                            <tr className="border-t border-gray-100">
                              <td className="py-2 text-gray-500" colSpan={6}>
                                No learners match the selected filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLearnerPage((prev) => ({
                              ...prev,
                              [panel.section.sectionId]: Math.max(1, currentPage - 1),
                            }))
                          }
                          disabled={currentPage <= 1}
                          className="border border-gray-300 rounded px-2 py-1 text-xs disabled:opacity-50"
                        >
                          Prev
                        </button>
                        <span className="text-xs text-gray-600">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLearnerPage((prev) => ({
                              ...prev,
                              [panel.section.sectionId]: Math.min(totalPages, currentPage + 1),
                            }))
                          }
                          disabled={currentPage >= totalPages}
                          className="border border-gray-300 rounded px-2 py-1 text-xs disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
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
                        <select
                          value={assignmentDrafts[panel.section.sectionId]?.chapterId ?? ""}
                          onChange={(event) => {
                            const nextChapterId = event.target.value;
                            setDraftValue(panel.section.sectionId, "chapterId", nextChapterId);
                            const exercises = getExercisesForChapter(
                              panel.section.courseSlug,
                              nextChapterId
                            );
                            setDraftValue(
                              panel.section.sectionId,
                              "exerciseId",
                              exercises[0]?.id ?? ""
                            );
                          }}
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        >
                          {(
                            getCourseBySlug(panel.section.courseSlug)?.chapters ?? []
                          ).map((chapter) => (
                            <option key={chapter.id} value={chapter.id}>
                              {chapter.title}
                            </option>
                          ))}
                        </select>
                        <select
                          value={assignmentDrafts[panel.section.sectionId]?.exerciseId ?? ""}
                          onChange={(event) =>
                            setDraftValue(
                              panel.section.sectionId,
                              "exerciseId",
                              event.target.value
                            )
                          }
                          required
                          className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                        >
                          {getExercisesForChapter(
                            panel.section.courseSlug,
                            assignmentDrafts[panel.section.sectionId]?.chapterId ?? ""
                          ).map((exercise) => (
                            <option key={exercise.id} value={exercise.id}>
                              {exercise.title}
                            </option>
                          ))}
                        </select>
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
                                <th className="py-1 pr-2">Completed</th>
                                <th className="py-1 pr-2">Rate</th>
                                <th className="py-1 pr-2">Last completion</th>
                                <th className="py-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {panel.assignments.map((assignment) => {
                                const now = Date.now();
                                const isLate =
                                  assignment.dueAt !== null && assignment.dueAt < now;
                                const hasDueDate = assignment.dueAt !== null;
                                const breakdown = breakdownByAssignmentId.get(
                                  assignment.assignmentId
                                );
                                const completedLabel = breakdown
                                  ? `${breakdown.completedLearners}/${breakdown.learnersTotal}`
                                  : "—";
                                const completionRateLabel = breakdown
                                  ? `${breakdown.completionRate.toFixed(1)}%`
                                  : "—";
                                const stalled =
                                  isLate &&
                                  breakdown !== undefined &&
                                  breakdown.completionRate <
                                    panelRiskConfig.maxCompletionRateStalledAssignment;
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
                                    <td className="py-1.5 pr-2">{completedLabel}</td>
                                    <td className="py-1.5 pr-2">{completionRateLabel}</td>
                                    <td className="py-1.5 pr-2">
                                      {breakdown?.lastCompletionAt
                                        ? new Date(breakdown.lastCompletionAt).toLocaleString()
                                        : "—"}
                                    </td>
                                    <td className="py-1.5">
                                      {stalled && (
                                        <span className="mr-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                          Stalled
                                        </span>
                                      )}
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
                    </>
                  )}
                </div>
                );
              })}
              </div>
            </div>
            {hasMoreSections && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void loadSections(sections.length, true)}
                  disabled={loadingSections}
                  className="border border-gray-300 rounded px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                  Load more sections
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
