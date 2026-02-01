import { describe, it, expect } from "vitest";
import { ZodError } from "zod";

import {
  flashcardQuerySchema,
  parseFlashcardQueryParams,
} from "./flashcard-query.schema";

describe("flashcardQuerySchema", () => {
  describe("source validation", () => {
    it("should accept 'ai' as valid source", () => {
      const result = flashcardQuerySchema.parse({ source: "ai" });
      expect(result.source).toBe("ai");
    });

    it("should accept 'manual' as valid source", () => {
      const result = flashcardQuerySchema.parse({ source: "manual" });
      expect(result.source).toBe("manual");
    });

    it("should reject invalid source values", () => {
      expect(() => {
        flashcardQuerySchema.parse({ source: "invalid" });
      }).toThrow(ZodError);
    });

    it("should allow source to be undefined", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.source).toBeUndefined();
    });
  });

  describe("search validation", () => {
    it("should accept valid search string", () => {
      const result = flashcardQuerySchema.parse({ search: "hello world" });
      expect(result.search).toBe("hello world");
    });

    it("should accept empty search string", () => {
      const result = flashcardQuerySchema.parse({ search: "" });
      expect(result.search).toBe("");
    });

    it("should accept search string at max length (200 characters)", () => {
      const maxLengthSearch = "a".repeat(200);
      const result = flashcardQuerySchema.parse({ search: maxLengthSearch });
      expect(result.search).toBe(maxLengthSearch);
    });

    it("should reject search string exceeding 200 characters", () => {
      const tooLongSearch = "a".repeat(201);
      expect(() => {
        flashcardQuerySchema.parse({ search: tooLongSearch });
      }).toThrow(ZodError);
    });

    it("should allow search to be undefined", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.search).toBeUndefined();
    });
  });

  describe("limit validation", () => {
    it("should accept valid limit as string", () => {
      const result = flashcardQuerySchema.parse({ limit: "50" });
      expect(result.limit).toBe(50);
    });

    it("should apply default limit of 100 when not provided", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.limit).toBe(100);
    });

    it("should accept minimum limit of 1", () => {
      const result = flashcardQuerySchema.parse({ limit: "1" });
      expect(result.limit).toBe(1);
    });

    it("should accept maximum limit of 500", () => {
      const result = flashcardQuerySchema.parse({ limit: "500" });
      expect(result.limit).toBe(500);
    });

    it("should reject limit below 1", () => {
      expect(() => {
        flashcardQuerySchema.parse({ limit: "0" });
      }).toThrow(ZodError);
    });

    it("should reject limit above 500", () => {
      expect(() => {
        flashcardQuerySchema.parse({ limit: "501" });
      }).toThrow(ZodError);
    });

    it("should reject non-numeric limit", () => {
      expect(() => {
        flashcardQuerySchema.parse({ limit: "abc" });
      }).toThrow(ZodError);
    });

    it("should reject float limit", () => {
      expect(() => {
        flashcardQuerySchema.parse({ limit: "50.5" });
      }).toThrow(ZodError);
    });
  });

  describe("offset validation", () => {
    it("should accept valid offset as string", () => {
      const result = flashcardQuerySchema.parse({ offset: "10" });
      expect(result.offset).toBe(10);
    });

    it("should apply default offset of 0 when not provided", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.offset).toBe(0);
    });

    it("should accept minimum offset of 0", () => {
      const result = flashcardQuerySchema.parse({ offset: "0" });
      expect(result.offset).toBe(0);
    });

    it("should accept positive offset", () => {
      const result = flashcardQuerySchema.parse({ offset: "100" });
      expect(result.offset).toBe(100);
    });

    it("should reject negative offset", () => {
      expect(() => {
        flashcardQuerySchema.parse({ offset: "-1" });
      }).toThrow(ZodError);
    });

    it("should reject non-numeric offset", () => {
      expect(() => {
        flashcardQuerySchema.parse({ offset: "abc" });
      }).toThrow(ZodError);
    });

    it("should reject float offset", () => {
      expect(() => {
        flashcardQuerySchema.parse({ offset: "10.5" });
      }).toThrow(ZodError);
    });
  });

  describe("sort validation", () => {
    it("should accept 'created_at' as valid sort field", () => {
      const result = flashcardQuerySchema.parse({ sort: "created_at" });
      expect(result.sort).toBe("created_at");
    });

    it("should accept 'updated_at' as valid sort field", () => {
      const result = flashcardQuerySchema.parse({ sort: "updated_at" });
      expect(result.sort).toBe("updated_at");
    });

    it("should apply default sort of 'created_at' when not provided", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.sort).toBe("created_at");
    });

    it("should reject invalid sort values", () => {
      expect(() => {
        flashcardQuerySchema.parse({ sort: "invalid" });
      }).toThrow(ZodError);
    });
  });

  describe("order validation", () => {
    it("should accept 'asc' as valid order", () => {
      const result = flashcardQuerySchema.parse({ order: "asc" });
      expect(result.order).toBe("asc");
    });

    it("should accept 'desc' as valid order", () => {
      const result = flashcardQuerySchema.parse({ order: "desc" });
      expect(result.order).toBe("desc");
    });

    it("should apply default order of 'desc' when not provided", () => {
      const result = flashcardQuerySchema.parse({});
      expect(result.order).toBe("desc");
    });

    it("should reject invalid order values", () => {
      expect(() => {
        flashcardQuerySchema.parse({ order: "invalid" });
      }).toThrow(ZodError);
    });
  });

  describe("combined validation", () => {
    it("should accept all valid parameters together", () => {
      const result = flashcardQuerySchema.parse({
        source: "ai",
        search: "test",
        limit: "50",
        offset: "10",
        sort: "updated_at",
        order: "asc",
      });

      expect(result.source).toBe("ai");
      expect(result.search).toBe("test");
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
      expect(result.sort).toBe("updated_at");
      expect(result.order).toBe("asc");
    });

    it("should apply all defaults when no parameters provided", () => {
      const result = flashcardQuerySchema.parse({});

      expect(result.source).toBeUndefined();
      expect(result.search).toBeUndefined();
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.sort).toBe("created_at");
      expect(result.order).toBe("desc");
    });

    it("should handle partial parameters with defaults", () => {
      const result = flashcardQuerySchema.parse({
        source: "manual",
        search: "hello",
      });

      expect(result.source).toBe("manual");
      expect(result.search).toBe("hello");
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.sort).toBe("created_at");
      expect(result.order).toBe("desc");
    });
  });
});

describe("parseFlashcardQueryParams", () => {
  it("should parse valid query parameters from URLSearchParams", () => {
    const searchParams = new URLSearchParams({
      source: "ai",
      search: "test",
      limit: "50",
      offset: "10",
      sort: "updated_at",
      order: "asc",
    });

    const result = parseFlashcardQueryParams(searchParams);

    expect(result.source).toBe("ai");
    expect(result.search).toBe("test");
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
    expect(result.sort).toBe("updated_at");
    expect(result.order).toBe("asc");
  });

  it("should apply defaults when parameters are missing", () => {
    const searchParams = new URLSearchParams({});

    const result = parseFlashcardQueryParams(searchParams);

    expect(result.source).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
    expect(result.sort).toBe("created_at");
    expect(result.order).toBe("desc");
  });

  it("should handle undefined values in URLSearchParams", () => {
    const searchParams = new URLSearchParams();
    searchParams.set("source", "ai");
    // search, limit, offset, sort, order are not set

    const result = parseFlashcardQueryParams(searchParams);

    expect(result.source).toBe("ai");
    expect(result.search).toBeUndefined();
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
    expect(result.sort).toBe("created_at");
    expect(result.order).toBe("desc");
  });

  it("should throw ZodError for invalid parameters", () => {
    const searchParams = new URLSearchParams({
      source: "invalid",
      limit: "0",
      offset: "-1",
    });

    expect(() => {
      parseFlashcardQueryParams(searchParams);
    }).toThrow(ZodError);
  });

    it("should handle empty string values as undefined", () => {
      const searchParams = new URLSearchParams({
        source: "",
        search: "",
      });

      const result = parseFlashcardQueryParams(searchParams);

      // Empty strings should be treated as undefined for optional fields
      expect(result.source).toBeUndefined();
      expect(result.search).toBeUndefined();
    });

  it("should parse numeric strings correctly", () => {
    const searchParams = new URLSearchParams({
      limit: "25",
      offset: "5",
    });

    const result = parseFlashcardQueryParams(searchParams);

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(5);
    expect(typeof result.limit).toBe("number");
    expect(typeof result.offset).toBe("number");
  });
});
