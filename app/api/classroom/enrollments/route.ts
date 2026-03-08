import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ClassroomRole,
  SectionEnrollmentsResponse,
} from "@/lib/grading/contracts";
import {
  enrollUserInSection,
  getUserProfile,
  listClassSections,
  getSectionEnrollment,
  listSectionEnrollments,
  updateSectionEnrollmentStatus,
} from "@/lib/grading/submissionDb";
import { requireSectionStaff } from "@/app/api/classroom/_auth";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

interface EnrollPayload {
  sectionId?: string;
  userId?: string;
  role?: ClassroomRole;
}

interface UpdateEnrollmentStatusPayload {
  sectionId?: string;
  userId?: string;
  status?: "active" | "dropped";
}

function ensureSectionExists(sectionId: string) {
  const section = listClassSections().find((item) => item.sectionId === sectionId);
  if (!section) {
    throw new Error("Unknown sectionId.");
  }
}

function countActiveInstructors(sectionId: string): number {
  return listSectionEnrollments(sectionId).filter(
    (enrollment) => enrollment.role === "instructor" && enrollment.status === "active"
  ).length;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId")?.trim() ?? "";
  if (!sectionId) {
    return badRequest("Missing required query param: sectionId.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  try {
    ensureSectionExists(sectionId);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unknown sectionId.");
  }

  const enrollments = listSectionEnrollments(sectionId);
  const response: SectionEnrollmentsResponse = { enrollments };
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  let body: EnrollPayload;
  try {
    body = (await req.json()) as EnrollPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const sectionId = body.sectionId?.trim() ?? "";
  const userId = body.userId?.trim() ?? "";
  const role = body.role;
  if (!sectionId || !userId || !role) {
    return badRequest("Missing required fields: sectionId, userId, role.");
  }

  if (!["student", "instructor", "ta"].includes(role)) {
    return badRequest("role must be one of: student, instructor, ta.");
  }
  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  try {
    ensureSectionExists(sectionId);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unknown sectionId.");
  }
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }
  if (role !== "student" && actorProfile.role !== "instructor") {
    return forbidden("Only instructors can assign section staff roles.");
  }
  const existingEnrollment = getSectionEnrollment(sectionId, userId);
  if (
    existingEnrollment &&
    existingEnrollment.role === "instructor" &&
    existingEnrollment.status === "active" &&
    role !== "instructor" &&
    countActiveInstructors(sectionId) <= 1
  ) {
    return forbidden("Section must retain at least one active instructor.");
  }

  const enrollment = enrollUserInSection({
    enrollmentId: randomUUID(),
    sectionId,
    userId,
    role,
  });
  return NextResponse.json(enrollment, { status: 201 });
}

export async function PATCH(req: Request) {
  let body: UpdateEnrollmentStatusPayload;
  try {
    body = (await req.json()) as UpdateEnrollmentStatusPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const sectionId = body.sectionId?.trim() ?? "";
  const userId = body.userId?.trim() ?? "";
  const status = body.status;
  if (!sectionId || !userId || !status) {
    return badRequest("Missing required fields: sectionId, userId, status.");
  }
  if (status !== "active" && status !== "dropped") {
    return badRequest("status must be one of: active, dropped.");
  }

  const auth = requireSectionStaff(req, sectionId);
  if (!auth.ok) return auth.response;
  try {
    ensureSectionExists(sectionId);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unknown sectionId.");
  }
  const actorProfile = getUserProfile(auth.value.actorUserId);
  if (!actorProfile) {
    return forbidden("Actor profile not found.");
  }

  const existingEnrollment = getSectionEnrollment(sectionId, userId);
  if (!existingEnrollment) {
    return badRequest("Enrollment not found for sectionId/userId.");
  }
  if (existingEnrollment.role !== "student" && actorProfile.role !== "instructor") {
    return forbidden("Only instructors can change staff enrollment status.");
  }
  if (
    existingEnrollment.role === "instructor" &&
    existingEnrollment.status === "active" &&
    status === "dropped" &&
    countActiveInstructors(sectionId) <= 1
  ) {
    return forbidden("Section must retain at least one active instructor.");
  }

  const enrollment = updateSectionEnrollmentStatus({ sectionId, userId, status });
  return NextResponse.json(enrollment);
}
