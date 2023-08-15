import { parseDocument } from 'yaml';
import { yamlDocQuery as $ } from './yamlDocQuery';

describe('yamlDocQuery', () => {
  it('provides values and their positions', () => {
    expect($(parseDocument('string'))()).toEqual({
      value: 'string',
      range: [0, 6, 6],
    });
  });

  it('provides multi line values and their positions', () => {
    expect($(parseDocument('key:\n  - value\n  - value2'))()).toEqual({
      value: { key: ['value', 'value2'] },
      range: [0, 25, 25],
    });
  });

  it('respects parent offset', () => {
    expect($(parseDocument('null'), 5)()).toEqual({
      value: null,
      range: [5, 9, 9],
    });
  });

  it('gets nested elements', () => {
    const $doc = $(parseDocument('{ one: ["_", "_", { three: 3 }] }'));

    expect($doc.one[2].three()).toEqual({
      value: 3,
      range: [27, 28, 29],
    });
    expect($doc.one[0]()).toEqual({
      value: '_',
      range: [8, 11, 11],
    });
    expect($doc.two[2].three()).toEqual(undefined);
  });

  it('handles aliases', () => {
    expect($(parseDocument('[ &x { X: 42 }, Y, *x ]'))[2].X()).toEqual({
      range: [10, 12, 13],
      value: 42,
    });
  });

  it('handles aliases leaves', () => {
    expect($(parseDocument('[ &x { X: 42 }, Y, *x ]'))[2]()).toEqual({
      range: [5, 14, 14],
      value: { X: 42 },
    });
  });

  it('handles aliases merge keys', () => {
    expect($(parseDocument('[ &x { X: 42 }, Y, <<: *x ]', {merge: true}))[2].X()).toEqual({
      range: [10, 12, 13],
      value: 42,
    });
  });

  it('handles aliases merge keys properties', () => {
    expect($(parseDocument(`foo: &BAR
  bar: 42
yo:
  <<: *BAR
  mama: 4`, {merge: true})).yo.mama()).toEqual({
      range: [43, 44, 44],
      value: 4,
    });
  });

  it('handles aliases merge keys override properties', () => {
    expect($(parseDocument(`foo: &BAR
  bar: 42
yo:
  <<: *BAR
  bar: 69
  mama: 4`, {merge: true})).yo.bar()).toEqual({
      range: [42, 44, 45],
      value: 69,
    });
  });

  it('gets position when source is made available', () => {
    const source = `
one:
 - two
 - three: four
`;
    const $doc = $(parseDocument(source), source);

    expect($doc.one[1].three()).toEqual({
      value: 'four',
      position: {
        end: {
          column: 14,
          line: 4,
        },
        start: {
          column: 10,
          line: 4,
        },
      },
    });
  });
});
