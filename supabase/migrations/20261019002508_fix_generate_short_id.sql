/*
# Fix generate_short_id boolean/integer type error

## Problem
The `generate_short_id()` function declared `attempts integer` but assigned
`NOT EXISTS (...)` (a boolean) into it. Postgres tried to parse the boolean
text representation "t" as an integer, raising:
  invalid input syntax for type integer: "t"
This blocked every insert of a new demande.

## Fix
- Declare the loop sentinel as `boolean` instead of `integer`.
- Renamed to `is_unique` for clarity.

No schema changes. No data changes. Existing demandes keep their short_ids.
*/

CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_id text;
  is_unique boolean := false;
BEGIN
  LOOP
    new_id := upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 3));
    new_id := translate(new_id, '0123456789', 'JKLMNPQRST');
    SELECT NOT EXISTS (SELECT 1 FROM demandes WHERE short_id = new_id) INTO is_unique;
    IF is_unique THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;
