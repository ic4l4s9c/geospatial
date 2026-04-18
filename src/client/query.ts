import type { Rectangle } from "../component/validators.js";
import type { GeospatialDocument, FilterValue, FilterObject } from "./index.js";

/**
 * A query for keys within a given shape.
 */
export interface GeospatialQuery<Doc extends GeospatialDocument> {
  /**
   * The shape to query.
   */
  shape: QueryShape;
  /**
   * An optional filter expression to apply to the query.
   */
  filter?: (q: GeospatialFilterBuilder<Doc>) => GeospatialFilterExpression<Doc>;
  /**
   * An optional limit on the number of results to return (default: 64).
   */
  limit?: number;
}

interface GeospatialFilterBuilderBase<Doc extends GeospatialDocument, Self> {
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
  ): Self;

  /**
   * Require that a match's sort key be greater than or equal to the provided value.
   *
   * @param field The filter field (only "sortKey").
   * @param value The inclusive lower bound on the sort key.
   */
  gte(field: "sortKey", value: number): Self;

  /**
   * Require that a match's sort key be less than the provided value.
   *
   * @param field The filter field (only "sortKey").
   * @param value The exclusive upper bound on the sort key.
   */
  lt(field: "sortKey", value: number): Self;
}

type GeospatialFilterBuilderAfterIn<Doc extends GeospatialDocument> =
  GeospatialFilterBuilderBase<Doc, GeospatialFilterBuilderAfterIn<Doc>>;

interface GeospatialFilterBuilder<
  Doc extends GeospatialDocument,
> extends GeospatialFilterBuilderBase<Doc, GeospatialFilterBuilder<Doc>> {
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
  ): GeospatialFilterBuilderAfterIn<Doc>;
}

type GeospatialFilterExpression<Doc extends GeospatialDocument> =
  | GeospatialFilterBuilder<Doc>
  | GeospatialFilterBuilderAfterIn<Doc>;

export class FilterBuilder<Doc extends GeospatialDocument> {
  filterConditions: FilterObject<Doc>[] = [];
  interval?: { startInclusive?: number; endExclusive?: number };
  inDefined: boolean = false;

  eq<FieldName extends keyof Doc["filterKeys"] & string>(
    field: FieldName,
    value: FilterValue<Doc, FieldName>,
  ): FilterBuilder<Doc> {
    this.filterConditions.push({
      filterKey: field,
      filterValue: value,
      occur: "must",
    });
    return this;
  }
  in<FieldName extends keyof Doc["filterKeys"] & string>(
    field: FieldName,
    values: FilterValue<Doc, FieldName>[],
  ): FilterBuilder<Doc> {
    if (this.inDefined) {
      throw new Error("Invalid query: Can't have multiple `in` clauses.");
    }
    this.inDefined = true;
    for (const value of values) {
      this.filterConditions.push({
        filterKey: field,
        filterValue: value,
        occur: "should",
      });
    }
    return this;
  }
  gte(_field: "sortKey", value: number): FilterBuilder<Doc> {
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
  lt(_field: "sortKey", value: number): FilterBuilder<Doc> {
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

export type QueryShape = { type: "rectangle"; rectangle: Rectangle };
