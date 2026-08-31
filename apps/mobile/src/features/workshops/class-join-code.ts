const classCodePattern = /^[A-Z0-9]{6,10}$/;

export function normalizeWorkshopClassCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function extractWorkshopClassCode(value: string) {
  const trimmed = value.trim();
  const direct = trimmed.toUpperCase();
  if (classCodePattern.test(direct)) return direct;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // A malformed external QR value is handled as an unsupported invitation.
  }
  const match = decoded.match(/[?&]code=([a-z0-9]{6,10})(?=$|[&#\s])/i);
  return match?.[1]?.toUpperCase();
}
