/*
# Ajout des champs relance et pièce jointe aux demandes

## Changements
- Table `demandes` : nouveaux champs
  - `relance` (boolean, faux par défaut) : indique qu'une relance a été faite.
  - `relance_date` (date, optionnel) : date de la relance.
  - `pj_path` (text, optionnel) : chemin du fichier dans le stockage.
  - `pj_name` (text, optionnel) : nom d'origine du fichier.
  - `pj_size` (integer, optionnel) : taille du fichier en octets.
- Stockage : nouveau bucket privé `pieces-jointes` pour les fichiers joints (tous formats).

## Sécurité
- Bucket privé : aucun accès public, les liens de téléchargement sont signés et temporaires.
- Politiques sur les fichiers du bucket : lecture, ajout, modification et suppression
  réservées au même compte autorisé que la table `demandes`.

## Notes
1. Aucune donnée existante n'est modifiée ni supprimée.
2. Les colonnes ajoutées sont nullables ou ont une valeur par défaut, donc les anciennes demandes restent valides.
*/

ALTER TABLE demandes ADD COLUMN IF NOT EXISTS relance boolean NOT NULL DEFAULT false;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS relance_date date;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS pj_path text;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS pj_name text;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS pj_size integer;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pieces-jointes', 'pieces-jointes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "select_pj_authorized" ON storage.objects;
CREATE POLICY "select_pj_authorized" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pieces-jointes' AND auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "insert_pj_authorized" ON storage.objects;
CREATE POLICY "insert_pj_authorized" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pieces-jointes' AND auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "update_pj_authorized" ON storage.objects;
CREATE POLICY "update_pj_authorized" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pieces-jointes' AND auth.jwt() ->> 'email' = 'fatou08528@gmail.com')
WITH CHECK (bucket_id = 'pieces-jointes' AND auth.jwt() ->> 'email' = 'fatou08528@gmail.com');

DROP POLICY IF EXISTS "delete_pj_authorized" ON storage.objects;
CREATE POLICY "delete_pj_authorized" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pieces-jointes' AND auth.jwt() ->> 'email' = 'fatou08528@gmail.com');
