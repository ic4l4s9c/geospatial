import type { Polygon, Polyline, Rectangle } from "../component/types.js";
import type { GeospatialGeometry, FilterValue, FilterObject } from "./index.js";

/**
 * A query for keys within a given shape.
 */
export interface GeospatialQuery<Doc extends GeospatialGeometry> {
  /**
   * The shape to query.
   */
  shape: QueryShape;
  /**
   * An optional filter expression to apply to the query.
   */
  filter?: Doc extends GeospatialGeometry<"point">
    ? (q: PointFilterBuilder<Doc>) => GeospatialFilterExpression<Doc>
    : (q: GeospatialFilterBuilder<Doc>) => GeospatialFilterExpression<Doc>;
  /**
   * An optional limit on the number of results to return (default: 64).
   */
  limit?: number;
}

interface GeospatialFilterBuilder<Doc extends GeospatialGeometry> {
  /**
   * Require that a match's field equal a particular value. All conditions are ANDed together, so call
   * `.eq()` multiple times to further filter the set of matching documents.
   *
   * @param field The filter field.
   * @param value The value to match against.
   */
  eq<FieldName extends keyof NonNullable<Doc["filterKeys"]> & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): GeospatialFilterBuilder<Doc>;

  /**
   * Require that a match's field equal any of the provided values. This OR condition applies in addition
   * to other calls to `.eq()`. There can be at most one `.in()` call in a filter expression.
   *
   * @param field The filter field.
   * @param values The values to match against.
   */
  in<FieldName extends keyof NonNullable<Doc["filterKeys"]> & string>(
    field: FieldName,
    values: FilterValue<Doc, FieldName>[],
  ): GeospatialFilterBuilderAfterIn<Doc>;
}

interface GeospatialFilterBuilderAfterIn<Doc extends GeospatialGeometry> {
  /**
   * Require that a match's field equal a particular value. All conditions are ANDed together, so call
   * `.eq()` multiple times to further filter the set of matching documents.
   *
   * @param field The filter field.
   * @param value The value to match against.
   */
  eq<FieldName extends keyof NonNullable<Doc["filterKeys"]> & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): GeospatialFilterBuilderAfterIn<Doc>;
}

interface PointFilterBuilder<
  Doc extends GeospatialGeometry<"point">,
> extends GeospatialFilterBuilder<Doc> {
  /**
   * Require that a match's field equal a particular value. All conditions are ANDed together, so call
   * `.eq()` multiple times to further filter the set of matching documents.
   *
   * @param field The filter field.
   * @param value The value to match against.
   */
  eq<FieldName extends keyof Doc["filterKeys"] & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): PointFilterBuilder<Doc>;

  /**
   * Require that a match's field equal any of the provided values. This OR condition applies in addition
   * to other calls to `.eq()`. There can be at most one `.in()` call in a filter expression.
   *
   * @param field The filter field.
   * @param values The values to match against.
   */
  in<FieldName extends keyof Doc["filterKeys"] & string>(
    field: FieldName,
    values: FilterValue<Doc, FieldName>[],
  ): PointFilterBuilderAfterIn<Doc>;

  /**
   * Require that a match's sort key be greater than or equal to the provided value.
   *
   * @param field Must be `"sortKey"`.
   * @param value The inclusive lower bound on the sort key.
   */
  gte(field: "sortKey", value: number): PointFilterBuilder<Doc>;

  /**
   * Require that a match's sort key be less than the provided value.
   *
   * @param field Must be `"sortKey"`.
   * @param value The exclusive upper bound on the sort key.
   */
  lt(field: "sortKey", value: number): PointFilterBuilder<Doc>;
}

interface PointFilterBuilderAfterIn<
  Doc extends GeospatialGeometry<"point">,
> extends GeospatialFilterBuilderAfterIn<Doc> {
  /**
   * Require that a match's field equal a particular value. All conditions are ANDed together, so call
   * `.eq()` multiple times to further filter the set of matching documents.
   *
   * @param field The filter field.
   * @param value The value to match against.
   */
  eq<FieldName extends keyof Doc["filterKeys"] & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): PointFilterBuilderAfterIn<Doc>;

  /**
   * Require that a match's sort key be greater than or equal to the provided value.
   *
   * @param field Must be `"sortKey"`.
   * @param value The inclusive lower bound on the sort key.
   */
  gte(field: "sortKey", value: number): PointFilterBuilderAfterIn<Doc>;

  /**
   * Require that a match's sort key be less than the provided value.
   *
   * @param field Must be `"sortKey"`.
   * @param value The exclusive upper bound on the sort key.
   */
  lt(field: "sortKey", value: number): PointFilterBuilderAfterIn<Doc>;
}

type GeospatialFilterExpression<Doc extends GeospatialGeometry> =
  | GeospatialFilterBuilder<Doc>
  | GeospatialFilterBuilderAfterIn<Doc>;

export class FilterBuilderImpl<Doc extends GeospatialGeometry> {
  filterConditions: FilterObject<Doc>[] = [];
  interval?: { startInclusive?: number; endExclusive?: number };
  inDefined: boolean = false;

  eq<FieldName extends keyof NonNullable<Doc["filterKeys"]> & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): this {
    this.filterConditions.push({
      filterKey: field,
      filterValue: value,
      occur: "must",
    } as FilterObject<Doc>);
    return this;
  }

  in<FieldName extends keyof NonNullable<Doc["filterKeys"]> & string>(
    field: FieldName,
    values: FilterValue<Doc, FieldName>[],
  ): this {
    if (this.inDefined) {
      throw new Error("Invalid query: Can't have multiple `in` clauses.");
    }
    this.inDefined = true;
    for (const value of values) {
      this.filterConditions.push({
        filterKey: field,
        filterValue: value,
        occur: "should",
      } as FilterObject<Doc>);
    }
    return this;
  }

  gte(_field: "sortKey", value: number): this {
    if (!this.interval) {
      this.interval = { startInclusive: value };
    } else if (this.interval.startInclusive === undefined) {
      this.interval.startInclusive = value;
    } else {
      this.interval.startInclusive = Math.max(
        this.interval.startInclusive,
        value,
      );
    }
    return this;
  }

  lt(_field: "sortKey", value: number): this {
    if (!this.interval) {
      this.interval = { endExclusive: value };
    } else if (this.interval.endExclusive === undefined) {
      this.interval.endExclusive = value;
    } else {
      this.interval.endExclusive = Math.min(this.interval.endExclusive, value);
    }
    return this;
  }
}

export type QueryShape =
  | { type: "rectangle"; rectangle: Rectangle }
  | { type: "polygon"; polygon: Polygon }
  | { type: "polyline"; polyline: Polyline; bufferMeters: number };
