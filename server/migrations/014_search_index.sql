-- Full-text search across the user's editions. We index a synthetic "haystack" of
-- headline + editor_note + section topics + story titles + tldrs from the JSON column.

-- Functional GIN index on the editions.data jsonb -> text concat. Postgres can index expressions.
create index if not exists editions_search_idx
  on editions using gin (
    to_tsvector(
      'english',
      coalesce(data->>'headline', '') || ' ' ||
      coalesce(data->>'editor_note', '') || ' ' ||
      coalesce(data->>'pull_quote', '') || ' ' ||
      coalesce(data::text, '')
    )
  );
