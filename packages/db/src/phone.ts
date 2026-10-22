/** Postel's law: accept messy Indian numbers, store a clean +91XXXXXXXXXX. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let ten = digits;
  if (digits.length === 12 && digits.startsWith("91")) ten = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) ten = digits.slice(1);
  else if (digits.length === 13 && digits.startsWith("091")) ten = digits.slice(3);
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return "+91" + ten;
}

/** +919876543210 -> +91 98765 43210 */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
