/**
 * Barcode utilities for Ngasir POS
 * Generates GS1-compliant EAN-13 barcodes for retail & in-store item tagging.
 * Prefix '200' to '299' is officially reserved by GS1 for internal in-store retail use.
 */

const L_CODE: Record<number, string> = {
  0: "0001101", 1: "0011001", 2: "0010011", 3: "0111101", 4: "0100011",
  5: "0110001", 6: "0101111", 7: "0111011", 8: "0110111", 9: "0001011"
};

const G_CODE: Record<number, string> = {
  0: "0100111", 1: "0110011", 2: "0011011", 3: "0100001", 4: "0011101",
  5: "0111001", 6: "0000101", 7: "0010001", 8: "0001001", 9: "0010111"
};

const R_CODE: Record<number, string> = {
  0: "1110010", 1: "1100110", 2: "1101100", 3: "1000010", 4: "1011100",
  5: "1001110", 6: "1010000", 7: "1000100", 8: "1001000", 9: "1110100"
};

const PARITY: Record<number, string> = {
  0: "LLLLLL", 1: "LLGLGG", 2: "LLGGLG", 3: "LLGGGL", 4: "LGLLGG",
  5: "LGGLLG", 6: "LGGGLL", 7: "LGLGLG", 8: "LGLGGL", 9: "LGGLGL"
};

/**
 * Calculates EAN-13 check digit for 12 digits
 */
export function calculateEAN13Checksum(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Generates a valid 13-digit EAN barcode for in-store retail products.
 * Uses prefix '200' (GS1 standard for restricted circulation / internal store items).
 */
export function generateProductBarcode(prefix = "200"): string {
  // Use timestamp milliseconds to ensure uniqueness + random padding
  const now = Date.now().toString().slice(-6); // 6 digits
  let randomPart = "";
  while (randomPart.length < 3) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  const first12 = (prefix + now + randomPart).slice(0, 12);
  const checksum = calculateEAN13Checksum(first12);
  return first12 + checksum.toString();
}

/**
 * Converts 13-digit EAN code to 95 binary modules ('1' for bar, '0' for space).
 * Returns null if not a valid 13-digit numeric string.
 */
export function ean13ToBits(code: string): string | null {
  if (!code || code.length !== 13 || !/^\d{13}$/.test(code)) {
    return null;
  }

  const first = parseInt(code[0], 10);
  const parityPattern = PARITY[first];
  if (!parityPattern) return null;

  let bits = "101"; // Left guard

  // Left 6 digits (indices 1 to 6)
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(code[i + 1], 10);
    const mode = parityPattern[i];
    bits += mode === "L" ? L_CODE[digit] : G_CODE[digit];
  }

  bits += "01010"; // Center guard

  // Right 6 digits (indices 7 to 12)
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(code[i + 7], 10);
    bits += R_CODE[digit];
  }

  bits += "101"; // Right guard
  return bits;
}
