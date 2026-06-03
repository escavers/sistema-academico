-- =========================================
-- MIGRACIÓN: Docente-Carrera, Docente-Especialidad, Materia-Carrera
-- Fecha: 2026-06-02
-- =========================================

-- 1. Tabla docente_carrera (relación M:N entre docente y carrera con licenciatura)
CREATE TABLE IF NOT EXISTS docente_carrera (
    id SERIAL PRIMARY KEY,
    id_docente INTEGER NOT NULL,
    id_carrera INTEGER NOT NULL,
    licenciatura VARCHAR(200),

    CONSTRAINT fk_docente_carrera_docente
        FOREIGN KEY (id_docente)
        REFERENCES docente(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_docente_carrera_carrera
        FOREIGN KEY (id_carrera)
        REFERENCES carrera(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT unique_docente_carrera UNIQUE (id_docente, id_carrera)
);

-- 2. Tabla docente_especialidad (especialidades por docente vinculadas a carrera)
CREATE TABLE IF NOT EXISTS docente_especialidad (
    id SERIAL PRIMARY KEY,
    id_docente INTEGER NOT NULL,
    id_carrera INTEGER NOT NULL,
    especialidad VARCHAR(200) NOT NULL,

    CONSTRAINT fk_docente_especialidad_docente
        FOREIGN KEY (id_docente)
        REFERENCES docente(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_docente_especialidad_carrera
        FOREIGN KEY (id_carrera)
        REFERENCES carrera(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3. Agregar columna id_carrera a tabla materia
ALTER TABLE materia ADD COLUMN IF NOT EXISTS id_carrera INTEGER;

ALTER TABLE materia
    ADD CONSTRAINT fk_materia_carrera
    FOREIGN KEY (id_carrera)
    REFERENCES carrera(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_docente_carrera_docente ON docente_carrera(id_docente);
CREATE INDEX IF NOT EXISTS idx_docente_carrera_carrera ON docente_carrera(id_carrera);
CREATE INDEX IF NOT EXISTS idx_docente_especialidad_docente ON docente_especialidad(id_docente);
CREATE INDEX IF NOT EXISTS idx_materia_carrera ON materia(id_carrera);
