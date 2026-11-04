export interface EntityCandidate {
  id: string;
  label: string;
  description: string | null;
  sitelinkCount: number | null;
}

export interface EntityLookup {
  lookup(input: string): Promise<EntityCandidate[]>;
}

/**
 * Deterministic, fixture-based mock entity lookup used in development and
 * tests. No network calls. Fixtures cover a small set of Indian entities.
 */
export class MockEntityLookup implements EntityLookup {
  private fixtures: Record<string, EntityCandidate[]> = {
    ganga: [
      {
        id: "Q123",
        label: "Ganga",
        description: "River flowing through India and Bangladesh",
        sitelinkCount: 45,
      },
    ],
    yamuna: [
      {
        id: "Q456",
        label: "Yamuna",
        description: "Major river in northern India",
        sitelinkCount: 32,
      },
    ],
    ganges: [
      {
        id: "Q123",
        label: "Ganga",
        description: "River flowing through India and Bangladesh",
        sitelinkCount: 45,
      },
    ],
    varanasi: [
      {
        id: "Q789",
        label: "Varanasi",
        description: "City on the banks of the Ganga",
        sitelinkCount: 28,
      },
    ],
    banaras: [
      {
        id: "Q789",
        label: "Varanasi",
        description: "City on the banks of the Ganga",
        sitelinkCount: 28,
      },
    ],
  };

  async lookup(input: string): Promise<EntityCandidate[]> {
    const normalized = input.trim().toLowerCase();
    return this.fixtures[normalized] ?? [];
  }
}

export function createEntityLookup(): EntityLookup {
  return new MockEntityLookup();
}
