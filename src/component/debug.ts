import { v } from "convex/values";
import { query } from "./_generated/server.js";
import { S2Bindings } from "./lib/s2Bindings.js";
import { point, rectangle } from "./types.js";

export const cells = query({
  args: {
    rectangle,
    minLevel: v.number(),
    maxLevel: v.number(),
    levelMod: v.number(),
    maxCells: v.number(),
  },
  returns: v.array(
    v.object({
      token: v.string(),
      vertices: v.array(point),
    }),
  ),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    const cells = s2.coverRectangle(
      args.rectangle,
      args.minLevel,
      args.maxLevel,
      args.levelMod,
      args.maxCells,
    );
    const result = cells.map((cell) => {
      const token = s2.cellIDToken(cell);
      const vertices = s2.cellVertexes(cell);
      return { token, vertices };
    });
    return result;
  },
});
