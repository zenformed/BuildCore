export type CooldownGate = {
  readonly canRun: boolean;
  readonly markRan: () => void;
};

export function createCooldownGate(cooldownMs: number): CooldownGate {
  let lastRanAt = 0;
  return {
    get canRun(): boolean {
      return Date.now() - lastRanAt >= cooldownMs;
    },
    markRan(): void {
      lastRanAt = Date.now();
    },
  };
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
