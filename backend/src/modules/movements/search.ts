import { and, ilike, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import {
  DECIMAL_DOT_PATTERN,
  GROUPED_NUMBER_PATTERN,
  SPANISH_MONTHS,
  SPANISH_SHORT_MONTHS,
  searchTokens,
} from '@moneta/shared';

export const searchDocument = (...fields: SQLWrapper[]) =>
  sql`concat_ws(' ', ${sql.join(fields, sql`, `)})`;
export function dateDocument(date: SQLWrapper) {
  return searchDocument(
    sql`${date}::text`,
    sql`to_char(${date}, 'DD/MM/YYYY')`,
    sql`concat(extract(day from ${date})::int, '/', extract(month from ${date})::int, '/', extract(year from ${date})::int)`,
    sql`concat(extract(day from ${date})::int, ' ', (${sql.param(SPANISH_SHORT_MONTHS)}::text[])[extract(month from ${date})::int], ' ', extract(year from ${date})::int)`,
    sql`concat(extract(day from ${date})::int, ' ', (${sql.param(SPANISH_MONTHS)}::text[])[extract(month from ${date})::int], ' ', extract(year from ${date})::int)`,
  );
}
export function moneyDocument(amount: SQLWrapper, kind: 'expense' | 'income') {
  const euros = sql`concat((${amount} / 100)::text, ',', lpad((${amount} % 100)::text, 2, '0'))`;
  return searchDocument(
    euros,
    sql`concat(${kind === 'expense' ? '-' : '+'}::text, ${euros})`,
    sql`'€ EUR'`,
  );
}
function normalized(document: SQLWrapper): SQL {
  const text = sql`lower(regexp_replace(normalize(${document}, NFD), ${'[\u0300-\u036f]'}, '', 'g'))`;
  const signs = sql`replace(${text}, '−', '-')`;
  const grouped = sql`regexp_replace(${signs}, ${GROUPED_NUMBER_PATTERN}, ${'\\1'}, 'g')`;
  return sql`regexp_replace(${grouped}, ${DECIMAL_DOT_PATTERN}, ${'\\1,'}, 'g')`;
}
export function searchCondition(document: SQLWrapper, query: string) {
  return and(
    ...searchTokens(query).map((token) =>
      ilike(normalized(document), `%${token.replace(/[\\%_]/g, '\\$&')}%`),
    ),
  );
}
