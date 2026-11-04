import { describe, expect, it } from "vitest";
import { MockEntityLookup, type EntityCandidate } from "@/lib/entity-lookup";

describe("MockEntityLookup", () => {
  const lookup = new MockEntityLookup();

  it("known entity returns candidates with id, label, description, sitelinkCount", async () => {
    const results = await lookup.lookup("ganga");
    expect(results.length).toBeGreaterThan(0);
    const c = results[0];
    expect(c.id).toBe("Q123");
    expect(c.label).toBe("Ganga");
    expect(typeof c.description).toBe("string");
    expect(typeof c.sitelinkCount).toBe("number");
  });

  it("alias resolves to same entity (ganges → Ganga)", async () => {
    const ganga = await lookup.lookup("ganga");
    const ganges = await lookup.lookup("ganges");
    expect(ganges.length).toBe(ganga.length);
    expect(ganges[0]?.id).toBe(ganga[0]?.id);
    expect(ganges[0]?.label).toBe(ganga[0]?.label);
  });

  it("unknown entity returns empty array", async () => {
    const results = await lookup.lookup("asdfghjkl");
    expect(results).toEqual([]);
  });

  it("candidate shape conforms to EntityCandidate", async () => {
    const results = await lookup.lookup("varanasi");
    expect(results.length).toBeGreaterThan(0);
    const c: EntityCandidate = results[0];
    expect(typeof c.id).toBe("string");
    expect(typeof c.label).toBe("string");
    expect(c.description == null || typeof c.description === "string").toBe(true);
    expect(c.sitelinkCount == null || typeof c.sitelinkCount === "number").toBe(true);
  });
});
