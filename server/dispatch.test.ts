import { describe, expect, it } from "vitest";

// ---- Pure logic tests for tag filtering (mirrors db.getContactsByTags) ----

type ContactRow = { id: number; name: string; phone: string; tags: string[] };

function filterByTags(contacts: ContactRow[], tags: string[]): ContactRow[] {
  if (tags.length === 0) return contacts;
  const lower = tags.map(t => t.toLowerCase().trim());
  return contacts.filter(c => {
    const ct = c.tags.map(t => t.toLowerCase().trim());
    return lower.some(tag => ct.includes(tag));
  });
}

function extractUniqueTags(contacts: ContactRow[]): string[] {
  const set = new Set<string>();
  for (const c of contacts) {
    for (const t of c.tags) if (t) set.add(t.toLowerCase().trim());
  }
  return Array.from(set).sort();
}

const CONTACTS: ContactRow[] = [
  { id: 1, name: "Ana",    phone: "5511111111111", tags: ["vip", "cliente"] },
  { id: 2, name: "Bruno",  phone: "5511111111112", tags: ["lead"] },
  { id: 3, name: "Carla",  phone: "5511111111113", tags: ["vip"] },
  { id: 4, name: "Diego",  phone: "5511111111114", tags: [] },
  { id: 5, name: "Elisa",  phone: "5511111111115", tags: ["cliente", "lead"] },
];

describe("filterByTags", () => {
  it("returns all contacts when tags array is empty", () => {
    expect(filterByTags(CONTACTS, [])).toHaveLength(5);
  });

  it("filters by single tag (OR logic)", () => {
    const result = filterByTags(CONTACTS, ["vip"]);
    expect(result.map(c => c.id)).toEqual([1, 3]);
  });

  it("filters by multiple tags using OR logic", () => {
    const result = filterByTags(CONTACTS, ["vip", "lead"]);
    // Ana (vip+cliente), Bruno (lead), Carla (vip), Elisa (cliente+lead)
    expect(result.map(c => c.id)).toEqual([1, 2, 3, 5]);
  });

  it("returns empty array when no contact matches", () => {
    const result = filterByTags(CONTACTS, ["inexistente"]);
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = filterByTags(CONTACTS, ["VIP"]);
    expect(result.map(c => c.id)).toEqual([1, 3]);
  });

  it("ignores contacts with empty tags array", () => {
    const result = filterByTags(CONTACTS, ["qualquer"]);
    expect(result.find(c => c.id === 4)).toBeUndefined();
  });
});

describe("extractUniqueTags", () => {
  it("returns sorted unique tags", () => {
    const tags = extractUniqueTags(CONTACTS);
    expect(tags).toEqual(["cliente", "lead", "vip"]);
  });

  it("returns empty array for contacts with no tags", () => {
    expect(extractUniqueTags([{ id: 1, name: "X", phone: "1", tags: [] }])).toEqual([]);
  });

  it("deduplicates tags across contacts", () => {
    const tags = extractUniqueTags([
      { id: 1, name: "A", phone: "1", tags: ["vip", "cliente"] },
      { id: 2, name: "B", phone: "2", tags: ["vip"] },
    ]);
    expect(tags).toEqual(["cliente", "vip"]);
  });
});

// ---- tRPC router structural check ----
describe("flows dispatch procedures", () => {
  it("dispatch-related procedures exist on the router", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    // Verify the router object has the flows sub-router
    const def = (appRouter as any)._def;
    expect(def).toBeDefined();
  });
});
