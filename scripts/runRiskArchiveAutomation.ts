import { executeDueRiskAuditArchives } from "@/lib/classroom/riskAuditArchiveAutomation";

async function main() {
  const result = await executeDueRiskAuditArchives();
  const failed = result.processed.filter((item) => item.status === "failure");
  const succeeded = result.processed.filter((item) => item.status === "success");
  const skipped = result.processed.filter((item) => item.status === "skipped");

  console.log(
    `[risk-archive] executedAt=${result.executedAt} processed=${result.processed.length} success=${succeeded.length} failure=${failed.length} skipped=${skipped.length}`
  );
  for (const item of failed) {
    console.error(
      `[risk-archive] failure section=${item.sectionId} error=${item.errorMessage ?? "unknown"}`
    );
  }
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[risk-archive] ${message}`);
  process.exit(1);
});
