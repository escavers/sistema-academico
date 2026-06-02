-- =========================================
-- TABLA ROL
-- =========================================

CREATE TABLE rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- =========================================
-- TABLA USUARIO
-- =========================================

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    contrasena TEXT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    id_rol INTEGER NOT NULL,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA ESTUDIANTE
-- =========================================

CREATE TABLE estudiante (
    id INTEGER PRIMARY KEY,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_estudiante_usuario
        FOREIGN KEY (id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA DOCENTE
-- =========================================

CREATE TABLE docente (
    id INTEGER PRIMARY KEY,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),

    CONSTRAINT fk_docente_usuario
        FOREIGN KEY (id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA ADMINISTRADOR
-- =========================================

CREATE TABLE administrador (
    id INTEGER PRIMARY KEY,

    CONSTRAINT fk_admin_usuario
        FOREIGN KEY (id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA NOTIFICACION
-- =========================================

CREATE TABLE notificacion (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    estado BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,

    CONSTRAINT fk_notificacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA PERIODO ACADEMICO
-- =========================================

CREATE TABLE periodo_academico (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado BOOLEAN DEFAULT TRUE
);

-- =========================================
-- TABLA MODALIDAD
-- =========================================

CREATE TABLE modalidad (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    max_materias_permitidas INTEGER NOT NULL
);

-- =========================================
-- TABLA CARRERA
-- =========================================

CREATE TABLE carrera (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN DEFAULT TRUE,
    id_modalidad INTEGER NOT NULL,

    CONSTRAINT fk_carrera_modalidad
        FOREIGN KEY (id_modalidad)
        REFERENCES modalidad(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA PENSUM
-- =========================================

CREATE TABLE pensum (
    id SERIAL PRIMARY KEY,
    anio_creacion DATE NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    id_carrera INTEGER NOT NULL,

    CONSTRAINT fk_pensum_carrera
        FOREIGN KEY (id_carrera)
        REFERENCES carrera(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA MATERIA
-- =========================================

CREATE TABLE materia (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    creditos INTEGER NOT NULL,
    descripcion TEXT,
    id_pensum INTEGER,

    CONSTRAINT fk_materia_pensum
        FOREIGN KEY (id_pensum)
        REFERENCES pensum(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE materia_pensum (
    id SERIAL PRIMARY KEY,
    id_materia INTEGER NOT NULL,
    id_pensum INTEGER NOT NULL,

    CONSTRAINT fk_materia_pensum_materia
        FOREIGN KEY (id_materia)
        REFERENCES materia(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_materia_pensum_pensum
        FOREIGN KEY (id_pensum)
        REFERENCES pensum(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT unique_materia_pensum UNIQUE (id_materia, id_pensum)
);

-- =========================================
-- TABLA CURSO
-- =========================================

CREATE TABLE curso (
    id SERIAL PRIMARY KEY,
    codigo_grupo VARCHAR(50) NOT NULL,
    cupo_maximo INTEGER NOT NULL,
    estado BOOLEAN DEFAULT TRUE,

    id_materia INTEGER NOT NULL,
    id_periodo_academico INTEGER NOT NULL,
    id_docente INTEGER NOT NULL,
    id_administrador INTEGER NOT NULL,

    CONSTRAINT fk_curso_materia
        FOREIGN KEY (id_materia)
        REFERENCES materia(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_curso_periodo
        FOREIGN KEY (id_periodo_academico)
        REFERENCES periodo_academico(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_curso_docente
        FOREIGN KEY (id_docente)
        REFERENCES docente(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_curso_admin
        FOREIGN KEY (id_administrador)
        REFERENCES administrador(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA HORARIO
-- =========================================

CREATE TABLE horario (
    id SERIAL PRIMARY KEY,
    dia_semana VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50) NOT NULL,
    id_curso INTEGER NOT NULL,

    CONSTRAINT fk_horario_curso
        FOREIGN KEY (id_curso)
        REFERENCES curso(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =========================================
-- TABLA INSCRIPCION
-- =========================================

CREATE TABLE inscripcion (
    id SERIAL PRIMARY KEY,
    fecha_inscripcion DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(30) NOT NULL,

    id_estudiante INTEGER NOT NULL,
    id_curso INTEGER NOT NULL,

    CONSTRAINT fk_inscripcion_estudiante
        FOREIGN KEY (id_estudiante)
        REFERENCES estudiante(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_inscripcion_curso
        FOREIGN KEY (id_curso)
        REFERENCES curso(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT uq_estudiante_curso
        UNIQUE(id_estudiante, id_curso)
);

-- =========================================
-- TABLA CALIFICACION
-- =========================================

CREATE TABLE calificacion (
    id SERIAL PRIMARY KEY,
    nota NUMERIC(5,2) NOT NULL,
    observacion TEXT,
    fecha_registro DATE DEFAULT CURRENT_DATE,

    id_inscripcion INTEGER NOT NULL UNIQUE,
    id_docente INTEGER NOT NULL,

    CONSTRAINT fk_calificacion_inscripcion
        FOREIGN KEY (id_inscripcion)
        REFERENCES inscripcion(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_calificacion_docente
        FOREIGN KEY (id_docente)
        REFERENCES docente(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_nota
        CHECK (nota >= 0 AND nota <= 100)
);

-- =========================================
-- INDICES
-- =========================================

CREATE INDEX idx_usuario_email
ON usuario(email);

CREATE INDEX idx_usuario_nombre_usuario
ON usuario(nombre_usuario);

CREATE INDEX idx_materia_codigo
ON materia(codigo);

CREATE INDEX idx_curso_codigo_grupo
ON curso(codigo_grupo);

-- =========================================
-- DATOS INICIALES
-- =========================================

INSERT INTO rol(nombre, descripcion)
VALUES
('Administrador', 'Control total del sistema'),
('Docente', 'Gestiona cursos y calificaciones'),
('Estudiante', 'Participa en cursos');

INSERT INTO modalidad(nombre, max_materias_permitidas)
VALUES
('Semestral', 8),
('Anual', 16);

-- =========================================
-- USUARIOS DE EJEMPLO
-- =========================================

INSERT INTO usuario(nombres, apellido_paterno, apellido_materno, email, nombre_usuario, contrasena, estado, id_rol)
VALUES
('Administrador', 'Sistema', 'Uno', 'admin@instituto.edu', 'admin', '$2b$10$X/JHcGPQz.lG4GeX8.xV7eI3YJPKCXL06sDKy6Kl4dgzHRRl30RXK', true, 1),
('Pedro', 'Martínez', 'Gómez', 'pedro.martinez@instituto.edu', 'pmartinez', '$2b$10$UfrbsbDOzKIwlIr9b4034.ETPeHHYd7Ilajopc2R0bht5ANYO5ixG', true, 2),
('María', 'López', 'Sánchez', 'maria.lopez@instituto.edu', 'mlopez', '$2b$10$QIzUTNIIUHGS71Hs17AN2erwFPZvyqQBSDfpQiqq8zOqUlj8adhte', true, 3);

INSERT INTO administrador(id)
VALUES (1);

INSERT INTO docente(id, especialidad, telefono)
VALUES (2, 'Matemáticas', '+50312345678');

INSERT INTO estudiante(id, matricula, telefono, fecha_nacimiento)
VALUES (3, '2026001', '+50398765432', '2004-05-20');

SELECT setval(pg_get_serial_sequence('usuario', 'id'), COALESCE(MAX(id), 1)) FROM usuario;