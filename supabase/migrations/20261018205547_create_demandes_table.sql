/*
# Create demandes table for the assistante de direction tool

## Purpose
Stores every demande (request) entered by the assistant, with all form fields,
an auto-generated 3-letter short identifier, and a workflow status.

## New Tables
- `demandes`
  - `id` (uuid, primary key)
  - `short_id` (text, unique, 3 uppercase letters, auto-generated)
  - `demandeur` (text, who sent the request)
  - `date_demande` (date, when the request was sent)
  - `destinataires` (text, recipients of the original email)
  - `objet` (text, subject of the request)
  - `contenu` (text, full body of the original email — stored but never shown in the form)
  - `type_demande` (text, one of: 'actions à réaliser', 'arbitrage', 'préparation dossier', 'autre')
  - `type_precision` (text, optional free-text precision linked to the type)
  - `pilote` (text, one of: 'Dir ressources', 'DRH', 'DSI', 'DELIS', 'IMP', 'PCA', 'ORGA', 'ATT. dir', 'chargé appui strat')
  - `sous_pilote` (text, only when pilote = 'DRH': one of 'recrut/carrière et GEPP', 'GAPP', 'relations sociales et situations ind.', 'formation')
  - `priorite` (boolean, whether the priority checkbox was ticked)
  - `niveau_priorite` (text, 'P1' | 'P2' | 'P3' | null)
  - `echeance` (date, due date — auto-computed from priority or manually entered)
  - `observations` (text, free-text observations)
  - `statut` (text, 'à traiter' | 'en cours' | 'terminé', defaults to 'à traiter')
  - `user_id` (uuid, owner, defaults to the authenticated user)
  - `created_at` (timestamptz, defaults to now())

## New Functions
- `generate_short_id()` — returns a unique 3-uppercase-letter code, retrying until unused.
- BEFORE INSERT trigger on `demandes` calls `generate_short_id()` to set `short_id`.

## Security
- RLS enabled on `demandes`.
- CRUD policies restricted to the single authorized account: fatou08528@gmail.com.
  The check uses `auth.jwt() ->> 'email'` so only that exact Google/email account can
  read or write rows, regardless of who else might sign up.
- Owner column `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy
  the WITH CHECK predicate.
*/

CREATE TABLE IF NOT EXISTS demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text UNIQUE NOT NULL DEFAULT 'AAA',
  demandeur text NOT NULL DEFAULT '',
  date_demande date,
  destinataires text DEFAULT '',
  objet text NOT NULL DEFAULT '',
  contenu text DEFAULT '',
  type_demande text NOT NULL DEFAULT 'autre',
  type_precision text DEFAULT '',
  pilote text DEFAULT '',
  sous_pilote text DEFAULT '',
  priorite boolean NOT NULL DEFAULT false,
  niveau_priorite text,
  echeance date,
  observations text DEFAULT '',
  statut text NOT NULL DEFAULT 'à traiter',
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE demandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_demandes_authorized" ON demandes;
CREATE POLICY "select_demandes_authorized"
ON demandes FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "insert_demandes_authorized" ON demandes;
CREATE POLICY "insert_demandes_authorized"
ON demandes FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "update_demandes_authorized" ON demandes;
CREATE POLICY "update_demandes_authorized"
ON demandes FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'fatou08528@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "delete_demandes_authorized" ON demandes;
CREATE POLICY "delete_demandes_authorized"
ON demandes FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

CREATE INDEX IF NOT EXISTS demandes_statut_idx ON demandes (statut);
CREATE INDEX IF NOT EXISTS demandes_echeance_idx ON demandes (echeance);
CREATE INDEX IF NOT EXISTS demandes_short_id_idx ON demandes (short_id);

CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_id text;
  attempts integer := 0;
BEGIN
  LOOP
    new_id := upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 3));
    -- Keep it letters-only by mapping hex chars to A-Z space
    new_id := translate(new_id, '0123456789', 'JKLMNPQRST');
    SELECT NOT EXISTS (SELECT 1 FROM demandes WHERE short_id = new_id) INTO attempts;
    IF attempts THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS demandes_set_short_id ON demandes;

CREATE OR REPLACE FUNCTION set_demande_short_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = 'AAA' OR NEW.short_id = '' THEN
    NEW.short_id := generate_short_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER demandes_set_short_id
BEFORE INSERT ON demandes
FOR EACH ROW
EXECUTE FUNCTION set_demande_short_id();
