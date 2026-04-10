import { expect, test } from "vitest";
import { encodeCursor, decodeCursor } from "./cursor.js";

test("encodeCursor and decodeCursor with pointId", () => {
  const sortKey = 123456789;
  const pointId = "abc123";
  const cursor = encodeCursor({ sortKey, secondary: pointId });
  const decoded = decodeCursor(cursor);
  expect(decoded.sortKey).toEqual(sortKey);
  expect(decoded.secondary).toEqual(pointId);
});

test("cursor order matches sortKey then secondary", () => {
  const cursors = [
    encodeCursor({ sortKey: 1, secondary: "a" }),
    encodeCursor({ sortKey: 1, secondary: "b" }),
    encodeCursor({ sortKey: 2, secondary: "a" }),
    encodeCursor({ sortKey: 2, secondary: "b" }),
  ];
  const decoded = cursors.map((c) => decodeCursor(c));
  expect(decoded).toEqual([
    { sortKey: 1, secondary: "a" },
    { sortKey: 1, secondary: "b" },
    { sortKey: 2, secondary: "a" },
    { sortKey: 2, secondary: "b" },
  ]);
});
