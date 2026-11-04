import { describe, expect, it } from "vitest";
import {
  normalizeInput,
  normalizeName,
  areAliasesColliding,
  hasDigits,
} from "@/lib/normalize";
import { fuzzyMatch } from "@/lib/matching";

describe("normalizeInput", () => {
  it("lowercases and trims", () => {
    expect(normalizeInput("  Ganga  ")).toBe("ganga");
  });

  it("converts & to and", () => {
    expect(normalizeInput("Himachal & Pradesh")).toBe("himachalandpradesh");
  });

  it("strips diacritics (NFKD)", () => {
    expect(normalizeInput("Déjà Vu")).toBe("dejavu");
  });

  it("removes non-letter/digit characters", () => {
    expect(normalizeInput("A.B-C!")).toBe("abc");
  });
});

describe("hasDigits", () => {
  it("detects digits", () => {
    expect(hasDigits("abc123")).toBe(true);
    expect(hasDigits("abc")).toBe(false);
  });
});

describe("fuzzyMatch", () => {
  it("returns null when input or key has digits", () => {
    expect(fuzzyMatch("abc1", "abc")).toBeNull();
    expect(fuzzyMatch("abc", "ab1")).toBeNull();
  });

  it("matches within distance 1 for short keys", () => {
    expect(fuzzyMatch("ganga", "ganga")).toBe(0);
    expect(fuzzyMatch("gangaa", "ganga")).toBe(1);
    expect(fuzzyMatch("gang", "ganga")).toBe(1);
  });

  it("allows distance 2 for keys of 9+ chars", () => {
    expect(fuzzyMatch("brahmaputra", "brahmaputtra")).toBe(1);
    expect(fuzzyMatch("brahmaputra", "brahmaputtura")).toBe(2);
    expect(fuzzyMatch("brahmaputra", "brahmaputtuura")).toBeNull();
  });

  it("returns null when distance exceeds max", () => {
    expect(fuzzyMatch("ganga", "yamuna")).toBeNull();
  });
});

describe("normalizeName", () => {
  it("is an alias of normalizeInput", () => {
    expect(normalizeName("Cauvery")).toBe(normalizeInput("Cauvery"));
  });
});

describe("areAliasesColliding", () => {
  it("detects collision with existing canonical", () => {
    expect(areAliasesColliding("Ganga", [], ["Ganga"], [])).toBe(true);
  });

  it("detects collision with existing alias", () => {
    expect(areAliasesColliding("X", ["ganges"], ["Y"], [["Ganges"]])).toBe(true);
  });

  it("returns false when no collision", () => {
    expect(areAliasesColliding("Ganga", [], ["Yamuna"], [["Kaveri"]])).toBe(false);
  });
});
