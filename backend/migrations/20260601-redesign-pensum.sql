-- Migración recomendada para rediseñar el módulo Pensum
-- Ajustes de esquema para la relación correcta Pensum <-> Materia y asociación de Estudiante a Pensum

BEGIN;

-- 1. Añadir campo nombre al pensum
ALTER TABLE pensum
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(100) NOT NULL;

-- 2. Agregar índice único sobre id_carrera + nombre del pensum
CREATE UNIQUE INDEX IF NOT EXISTS pensum_id_carrera_nombre_unique
  ON pensum (id_carrera, nombre);

-- 3. Añadir campo id_pensum en estudiante para asociar pensum
ALTER TABLE estudiante
  ADD COLUMN IF NOT EXISTS id_pensum INTEGER NOT NULL;

ALTER TABLE estudiante
  ADD CONSTRAINT estudiante_id_pensum_fkey
  FOREIGN KEY (id_pensum) REFERENCES pensum(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- 4. Eliminar la relación directa materia.id_pensum si existe
ALTER TABLE materia
  DROP CONSTRAINT IF EXISTS materia_id_pensum_fkey;
ALTER TABLE materia
  DROP COLUMN IF EXISTS id_pensum;

-- 5. Crear tabla de relación materia_pensum con semestre
CREATE TABLE IF NOT EXISTS materia_pensum (
  id SERIAL PRIMARY KEY,
  id_materia INTEGER NOT NULL REFERENCES materia(id) ON UPDATE CASCADE ON DELETE CASCADE,
  id_pensum INTEGER NOT NULL REFERENCES pensum(id) ON UPDATE CASCADE ON DELETE CASCADE,
  semestre INTEGER NOT NULL CHECK (semestre >= 1),
  UNIQUE (id_pensum, id_materia)
);

COMMIT;
