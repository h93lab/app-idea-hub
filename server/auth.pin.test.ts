import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/client";

describe("PIN Code Authentication (0566)", () => {
  it("rejects invalid PIN code", async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
      user: null,
    });

    await expect(caller.auth.loginPin({ pin: "1234" })).rejects.toThrowError(
      /Invalid PIN code/i
    );
  });

  it("successfully authenticates with correct PIN 0566", async () => {
    const cookiesSet: Record<string, string> = {};
    const caller = appRouter.createCaller({
      req: { headers: {} } as any,
      res: {
        cookie: (name: string, val: string) => {
          cookiesSet[name] = val;
        },
        clearCookie: () => {},
      } as any,
      user: null,
    });

    const result = await caller.auth.loginPin({ pin: "0566" });
    expect(result.success).toBe(true);
    expect(result.token).toBeTypeOf("string");
  });
});
