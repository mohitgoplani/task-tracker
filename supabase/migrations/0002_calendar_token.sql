-- Calendar feed token: an unguessable string per user used to authorize their personal .ics feed URL.
alter table profiles add column if not exists calendar_token text unique;

-- Backfill any existing rows
update profiles set calendar_token = encode(gen_random_bytes(24), 'hex') where calendar_token is null;

-- Set the default for new rows
alter table profiles alter column calendar_token set default encode(gen_random_bytes(24), 'hex');
alter table profiles alter column calendar_token set not null;
