export function isTimeoutErrorMessage(message = "") {
  return String(message || "").toLowerCase().includes("took too long");
}
