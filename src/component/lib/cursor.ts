import * as d64 from "./d64.js";

export type Cursor<
  _SortKey extends number = number,
  _Id extends string = string,
> = string;

export function encodeCursor<SortKey extends number, Id extends string>(
  sortKey: SortKey,
  id: Id,
): Cursor<SortKey, Id> {
  const buf = new ArrayBuffer(9);
  const view = new DataView(buf);

  // Write `0x0D` as the header.
  view.setUint8(0, 0x0d);

  // Use big-endian encoding to maintain lexicographic ordering
  const littleEndian = false;
  view.setFloat64(1, sortKey, littleEndian);

  let sortKeyUint64 = view.getBigUint64(1, littleEndian);

  // Flip all the bits if the sign bit is set.
  if ((sortKeyUint64 & (1n << 63n)) !== 0n) {
    sortKeyUint64 = ~sortKeyUint64;
  }
  // Otherwise, just flip the sign bit.
  else {
    sortKeyUint64 |= 1n << 63n;
  }
  view.setBigUint64(1, sortKeyUint64, littleEndian);

  return `${d64.encode(buf)}:${id}`;
}

export function decodeCursor<SortKey extends number, Id extends string>(
  cursor: Cursor<SortKey, Id>,
): {
  sortKey: SortKey;
  id: Id;
} {
  const pieces = cursor.split(":");
  if (pieces.length !== 2) {
    throw new Error(
      `Invalid cursor ${cursor}: Expected two parts separated by a colon`,
    );
  }
  const [encodedSortKey, id] = pieces;
  const buf = d64.decode(encodedSortKey);
  if (buf.byteLength !== 9) {
    throw new Error(
      `Invalid cursor ${cursor}: Expected 9 bytes, got ${buf.byteLength}`,
    );
  }
  const view = new DataView(buf);
  if (view.getUint8(0) !== 0x0d) {
    throw new Error(
      `Invalid cursor ${cursor}: Expected header 0x0D, got ${view.getUint8(0)}`,
    );
  }
  // Use big-endian encoding to match encoding
  const littleEndian = false;
  let encodedUint64 = view.getBigUint64(1, littleEndian);
  // If the sign bit was set, just turn it off.
  if ((encodedUint64 & (1n << 63n)) !== 0n) {
    encodedUint64 &= ~(1n << 63n);
  }
  // Otherwise, flip all the bits.
  else {
    encodedUint64 = ~encodedUint64;
  }
  view.setBigUint64(1, encodedUint64, littleEndian);
  const sortKey = view.getFloat64(1, littleEndian);

  return { sortKey: sortKey as SortKey, id: id as Id };
}

export function encodeBound<SortKey extends number>(
  sortKey: SortKey,
): Cursor<SortKey, ""> {
  return encodeCursor<SortKey, "">(sortKey, "");
}
