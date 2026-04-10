import type { Id } from "../../_generated/dataModel.js";
import type { QueryCtx } from "../../_generated/server.js";

const MAX_CANDIDATES = 1000;

export async function gatherCandidates(
  ctx: QueryCtx,
  tokens: Iterable<string>,
): Promise<{
  candidateIds: Map<Id<"geometries">, string>;
  truncated: boolean;
}> {
  const candidateIds = new Map<Id<"geometries">, string>();
  let truncated = false;

  for (const token of tokens) {
    if (candidateIds.size >= MAX_CANDIDATES) {
      truncated = true;
      break;
    }

    const matches = await ctx.db
      .query("geometryCells")
      .withIndex("byCellToken", (q) =>
        q.gte("cellToken", token).lt("cellToken", token + "~"),
      )
      .take(MAX_CANDIDATES - candidateIds.size);

    for (const match of matches) {
      candidateIds.set(match.geometryId, match.geometryKey);
    }

    if (candidateIds.size >= MAX_CANDIDATES) {
      truncated = true;
      break;
    }
  }

  return { candidateIds, truncated };
}
