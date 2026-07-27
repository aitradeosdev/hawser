export const NATO_WORDS = [
  "ALFA",
  "BRAVO",
  "CHARLIE",
  "DELTA",
  "ECHO",
  "FOXTROT",
  "GOLF",
  "HOTEL",
  "INDIA",
  "JULIETT",
  "KILO",
  "LIMA",
  "MIKE",
  "NOVEMBER",
  "OSCAR",
  "PAPA",
  "QUEBEC",
  "ROMEO",
  "SIERRA",
  "TANGO",
  "UNIFORM",
  "VICTOR",
  "WHISKEY",
  "XRAY",
  "YANKEE",
  "ZULU",
] as const;

export type NatoWord = (typeof NATO_WORDS)[number];

export const CODE_DIGITS = 4;

function randomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

export function mintCode(): string {
  const word = NATO_WORDS[randomInt(NATO_WORDS.length)];
  let digits = "";
  for (let i = 0; i < CODE_DIGITS; i += 1) {
    digits += String(randomInt(10));
  }
  return `${word}-${digits}`;
}

export function parseCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]+)[\s-]*(\d{4})$/);
  if (!match) return null;
  const [, word, digits] = match;
  if (!(NATO_WORDS as readonly string[]).includes(word)) return null;
  return `${word}-${digits}`;
}

export function splitCode(code: string): { word: string; digits: string } {
  const [word, digits] = code.split("-");
  return { word: word ?? "", digits: digits ?? "" };
}
