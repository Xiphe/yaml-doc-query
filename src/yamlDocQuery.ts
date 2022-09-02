import { Node, Document, Range, isScalar, isAlias } from 'yaml';
import { isMap, isSeq } from 'yaml';

export interface Point {
  line: number;
  column: number;
}
export interface Position {
  start: Point;
  end: Point;
}
export type YmlPosQuery = {
  (start?: Point, firstCol?: number):
    | {
        value: unknown;
        position?: Position;
      }
    | undefined;
  [key: string | number | symbol]: YmlPosQuery;
};
export type YmlRangeQuery = {
  ():
    | {
        value: unknown;
        range?: Range;
      }
    | undefined;
  [key: string | number | symbol]: YmlRangeQuery;
};

export function yamlDocQuery(
  document: Document,
  offset?: number,
): YmlRangeQuery;
export function yamlDocQuery(
  document: Document,
  source: string,
  offset?: number,
): YmlPosQuery;
export function yamlDocQuery(
  document: Document,
  a?: string | number,
  b?: number,
): YmlPosQuery | YmlRangeQuery {
  const source = typeof a === 'string' ? a : undefined;
  const offset = typeof a === 'number' ? a : typeof b === 'number' ? b : 0;
  return process(document.contents, document, offset, source);
}

export default yamlDocQuery;

export function process(
  node: Node | null | undefined,
  document: Document,
  offset: number = 0,
  source?: string,
): any {
  if (isAlias(node)) {
    node = node.resolve(document);
  }

  return new Proxy(
    (start?: Point, firstCol?: number) => {
      if (!node) {
        return undefined;
      }

      const range = node.range
        ? (node.range.map((v) => v + offset) as Range)
        : node.range;

      if (!range) {
        return { value: node?.toJSON() };
      }

      if (typeof source === 'string') {
        return {
          value: node?.toJSON(),
          position: toPosition(range, source, start, firstCol),
        };
      }

      return {
        value: node?.toJSON(),
        range,
      };
    },
    {
      get(_, prop): any {
        if (isMap<Node, Node>(node)) {
          return process(
            node.items.find(({ key }) => {
              if (!isScalar(key)) {
                throw new RangeError(
                  `Unexpected ${key.constructor.name}`,
                  key.range || undefined,
                );
              }
              if (!isValidIndexType(key.value)) {
                throw new RangeError(
                  `Unexpected ${typeof key.value}`,
                  key.range || undefined,
                );
              }

              return (
                (typeof key.value === 'number'
                  ? String(key.value)
                  : key.value) === prop
              );
            })?.value,
            document,
            offset,
            source,
          );
        }

        if (isSeq<Node>(node)) {
          return process(node.items[prop as any], document, offset, source);
        }

        if (!node) {
          return process(node, document, offset, source);
        }
      },
    },
  );
}

export function toPosition(
  range: Range,
  source: string,
  start: Point = { line: 1, column: 0 },
  firstCol: number = start.column,
): Position {
  source
    .substring(0, range[0])
    .split('')
    .forEach((char) => {
      if (char === '\n') {
        start.line += 1;
        start.column = firstCol;
      } else {
        start.column += 1;
      }
    });

  const end = { ...start };
  source
    .substring(range[0], range[1])
    .split('')
    .forEach((char) => {
      if (char === '\n') {
        end.line += 1;
        end.column = firstCol;
      } else {
        end.column += 1;
      }
    });

  return { start, end };
}

export class RangeError extends Error {
  range?: Range;
  constructor(message: string, range?: Range) {
    super(message);
    this.range = range;
    Object.setPrototypeOf(this, RangeError.prototype);
  }
}

function isValidIndexType(v: unknown): v is string | number | symbol {
  return ['string', 'number', 'symbol'].includes(typeof v);
}
