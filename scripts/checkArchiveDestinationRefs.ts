function normalizeRefName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseRefList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => normalizeRefName(item))
    .filter((item) => item.length > 0);
}

function parseHostAllowlist(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );
}

function envKeyForRef(refName: string): string {
  return `CLASSROOM_RISK_ARCHIVE_DESTINATION_${refName.toUpperCase()}`;
}

function main() {
  const configuredRefs = parseRefList("CLASSROOM_RISK_ARCHIVE_DESTINATION_REF_NAMES");
  const revokedRefs = parseRefList("CLASSROOM_RISK_ARCHIVE_DESTINATION_REVOKED_REF_NAMES");
  const configuredSet = new Set(configuredRefs);
  const webhookAllowHosts = parseHostAllowlist("CLASSROOM_RISK_ARCHIVE_WEBHOOK_ALLOW_HOSTS");
  const uploadAllowHosts = parseHostAllowlist("CLASSROOM_RISK_ARCHIVE_UPLOAD_ALLOW_HOSTS");

  const errors: string[] = [];

  for (const refName of revokedRefs) {
    if (!configuredSet.has(refName)) {
      errors.push(
        `Revoked destination ref '${refName}' is not present in CLASSROOM_RISK_ARCHIVE_DESTINATION_REF_NAMES.`
      );
    }
  }

  for (const refName of configuredRefs) {
    const envKey = envKeyForRef(refName);
    const rawValue = process.env[envKey]?.trim() ?? "";
    if (!rawValue) {
      errors.push(`Missing destination URL for ref '${refName}' (${envKey}).`);
      continue;
    }

    let url: URL;
    try {
      url = new URL(rawValue);
    } catch {
      errors.push(`Invalid URL for ref '${refName}' (${envKey}).`);
      continue;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(
        `Invalid protocol for ref '${refName}' (${envKey}): expected http/https, got ${url.protocol}`
      );
      continue;
    }

    if (webhookAllowHosts.size > 0 || uploadAllowHosts.size > 0) {
      const host = url.host.toLowerCase();
      const allowed =
        webhookAllowHosts.has(host) ||
        uploadAllowHosts.has(host) ||
        (webhookAllowHosts.size === 0 && uploadAllowHosts.size === 0);
      if (!allowed) {
        errors.push(
          `Ref '${refName}' host '${host}' is not in webhook/upload allowlists.`
        );
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[archive-refs] ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[archive-refs] OK configured=${configuredRefs.length} revoked=${revokedRefs.length}`
  );
}

main();
