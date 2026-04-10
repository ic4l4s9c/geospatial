import * as d64 from "./d64.js";

export type Cursor<
  _SortKey extends number = number,
  _Id extends string = string,
> = string;

function encodeNumber(sortKey: number): ArrayBuffer {
  const buf = new ArrayBuffer(9);
  const view = new DataView(buf);

  view.setUint8(0, 0x0d);

  const littleEndian = true;
  view.setFloat64(1, sortKey, littleEndian);

  let sortKeyUint64 = view.getBigUint64(1, littleEndian);

  if ((sortKeyUint64 & (1n << 63n)) !== 0n) {
    sortKeyUint64 = ~sortKeyUint64;
  } else {
    sortKeyUint64 |= 1n << 63n;
  }
  view.setBigUint64(1, sortKeyUint64, littleEndian);

  return buf;
}

function decodeNumber(buf: ArrayBuffer): number {
  const view = new DataView(buf);
  if (view.getUint8(0) !== 0x0d) {
    throw new Error(`Invalid cursor header`);
  }
  const littleEndian = true;
  let encodedUint64 = view.getBigUint64(1, littleEndian);
  if ((encodedUint64 & (1n << 63n)) !== 0n) {
    encodedUint64 &= ~(1n << 63n);
  } else {
    encodedUint64 = ~encodedUint64;
  }
  view.setBigUint64(1, encodedUint64, littleEndian);
  return view.getFloat64(1, littleEndian);
}

export function encodeCursor<
  SortKey extends number,
  Id extends string,
>(cursor: { sortKey: SortKey; secondary: Id }): Cursor<SortKey, Id> {
  const buf = encodeNumber(cursor.sortKey);
  return `${d64.encode(buf)}:${cursor.secondary}`;
}

export function decodeCursor<SortKey extends number, Id extends string>(
  cursor: Cursor<SortKey, Id>,
): { sortKey: SortKey; secondary: Id } {
  const pieces = cursor.split(":");
  if (pieces.length !== 2) {
    throw new Error(
      `Invalid cursor ${cursor}: Expected two parts separated by a colon`,
    );
  }
  const [encodedSortKey, secondary] = pieces;
  const buf = d64.decode(encodedSortKey);
  if (buf.byteLength !== 9) {
    throw new Error(
      `Invalid cursor ${cursor}: Expected 9 bytes, got ${buf.byteLength}`,
    );
  }
  const sortKey = decodeNumber(buf);
  return { sortKey: sortKey as SortKey, secondary: secondary as Id };
}

export function encodeBound<SortKey extends number>(
  sortKey: SortKey,
): Cursor<SortKey, ""> {
  return encodeCursor<SortKey, "">({ sortKey, secondary: "" });
}
