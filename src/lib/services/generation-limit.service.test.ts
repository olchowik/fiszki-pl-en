import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { DAILY_GENERATION_LIMIT, checkDailyGenerationLimit } from "./generation-limit.service";
import type { Database } from "../../db/database.types";

// Mock Supabase client type
type MockSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        gte: (column: string, value: string) => {
          lt: (column: string, value: string) => Promise<{
            data: Array<{ input_sentences_count: number }> | null;
            error: Error | null;
          }>;
        };
      };
    };
  };
};

describe("Generation Limit Service", () => {
  const mockUserId = "test-user-id";
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DAILY_GENERATION_LIMIT constant", () => {
    it("should be set to 100 sentences per day", () => {
      expect(DAILY_GENERATION_LIMIT).toBe(100);
    });
  });

  describe("checkDailyGenerationLimit", () => {
    it("should allow generation when user has no usage today", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        10
      );

      expect(result.limitExceeded).toBe(false);
      expect(result.usedToday).toBe(0);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(100);
      expect(result.requestedCount).toBe(10);
    });

    it("should allow generation when user has partial usage", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [
                      { input_sentences_count: 30 },
                      { input_sentences_count: 20 },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        25
      );

      expect(result.limitExceeded).toBe(false);
      expect(result.usedToday).toBe(50);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(50);
      expect(result.requestedCount).toBe(25);
    });

    it("should allow generation when user is exactly at limit boundary", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [{ input_sentences_count: 90 }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        10
      );

      expect(result.limitExceeded).toBe(false);
      expect(result.usedToday).toBe(90);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(10);
      expect(result.requestedCount).toBe(10);
    });

    it("should block generation when user would exceed limit", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [{ input_sentences_count: 95 }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        10
      );

      expect(result.limitExceeded).toBe(true);
      expect(result.usedToday).toBe(95);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(5);
      expect(result.requestedCount).toBe(10);
    });

    it("should block generation when user has already reached limit", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [{ input_sentences_count: 100 }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        1
      );

      expect(result.limitExceeded).toBe(true);
      expect(result.usedToday).toBe(100);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(0);
      expect(result.requestedCount).toBe(1);
    });

    it("should handle multiple sessions correctly", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [
                      { input_sentences_count: 15 },
                      { input_sentences_count: 25 },
                      { input_sentences_count: 10 },
                      { input_sentences_count: 30 },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        20
      );

      expect(result.limitExceeded).toBe(false);
      expect(result.usedToday).toBe(80);
      expect(result.limit).toBe(DAILY_GENERATION_LIMIT);
      expect(result.remaining).toBe(20);
      expect(result.requestedCount).toBe(20);
    });

    it("should handle null data response", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: null,
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        10
      );

      expect(result.limitExceeded).toBe(false);
      expect(result.usedToday).toBe(0);
      expect(result.remaining).toBe(100);
    });

    it("should throw error when database query fails", async () => {
      const dbError = new Error("Database connection failed");
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: null,
                    error: dbError,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      await expect(
        checkDailyGenerationLimit(
          mockSupabase as unknown as SupabaseClient<Database>,
          mockUserId,
          10
        )
      ).rejects.toThrow("Failed to check daily generation limit: Database connection failed");
    });

    it("should calculate remaining correctly when at exact limit", async () => {
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [{ input_sentences_count: 100 }],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        0
      );

      expect(result.remaining).toBe(0);
      expect(result.limitExceeded).toBe(false); // 0 requested doesn't exceed
    });

    it("should handle edge case where remaining would be negative", async () => {
      // This shouldn't happen in practice, but tests the Math.max(0, ...) logic
      mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () =>
                  Promise.resolve({
                    data: [{ input_sentences_count: 150 }], // Over limit (shouldn't happen in practice)
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      } as unknown as MockSupabaseClient;

      const result = await checkDailyGenerationLimit(
        mockSupabase as unknown as SupabaseClient<Database>,
        mockUserId,
        10
      );

      expect(result.usedToday).toBe(150);
      expect(result.remaining).toBe(0); // Math.max ensures non-negative
      expect(result.limitExceeded).toBe(true);
    });
  });
});
