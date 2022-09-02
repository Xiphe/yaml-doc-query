# yaml-doc-query

lookup values along with their position in yaml documents

## install

```bash
npm i yaml-doc-query
# yarn add yaml-doc-query
```

## use

<!--
replace:
  yaml-doc-query: ./src/yamlDocQuery
-->

```ts
import { parseDocument } from 'yaml';
import { yamlDocQuery } from 'yaml-doc-query';

const yamlSource = `
one: 1
two:
 - three: 4
 - five: 5
`;
const document = parseDocument(yamlSource);
const $doc = yamlDocQuery(document);

/* use object access syntax to navigate into the document
   and end your query with () to get value and range from that node */
expect($doc.two[1].five()).toEqual({ value: 5, range: [34, 35, 36] });

/* pass source to get position instead of range */
expect(yamlDocQuery(document, yamlSource).two[0]()).toEqual({
  value: { three: 4 },
  position: { start: { line: 4, column: 3 }, end: { line: 5, column: 0 } },
});

/* receive undefined for non-existent nodes */
expect($doc.this.does.not.exist()).toEqual(undefined);
```
