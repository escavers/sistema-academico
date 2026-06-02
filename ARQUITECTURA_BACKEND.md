# 📚 Documentación Arquitectura Backend - Sistema Académico

## 🏗️ Estructura de Carpetas

```
backend/
├── src/
│   ├── app.js                 # Punto de entrada, configuración de Express
│   ├── seed.js                # Script para poblar datos iniciales
│   ├── config/
│   │   └── database.js        # Configuración de Sequelize (ORM)
│   ├── controllers/           # Lógica de negocio
│   ├── models/                # Modelos Sequelize (estructura BD)
│   ├── routes/                # Definición de endpoints HTTP
│   ├── middlewares/           # Funciones intermedias (auth, errores)
│   └── services/              # (Opcional) Lógica reutilizable
├── .env                       # Variables de entorno (credenciales)
└── package.json               # Dependencias y scripts
```

---

## 🔄 Flujo de una Petición HTTP

```
1. Cliente (Postman/Frontend)
   ↓
2. Express recibe la petición
   ↓
3. Middlewares (CORS, JSON, autenticación)
   ↓
4. Router mapea la ruta al controlador
   ↓
5. Controlador consulta/modifica BD
   ↓
6. Modelo Sequelize interactúa con PostgreSQL
   ↓
7. Respuesta JSON regresa al cliente
```

### Ejemplo: `GET /api/users`

```
GET /api/users + Token
    ↓
app.use('/api/users', userRoutes)  [app.js]
    ↓
router.get('/', verifyToken, verifyRole('Administrador'), userController.getAll)  [user.routes.js]
    ↓
middleware: verifyToken         [auth.middleware.js] → valida JWT
middleware: verifyRole()        [role.middleware.js] → valida rol
    ↓
userController.getAll()         [user.controller.js] → lógica
    ↓
User.findAll({...})            [models/User.js] → consulta BD
    ↓
SELECT * FROM usuario;         [PostgreSQL]
    ↓
res.json(users)                → respuesta al cliente
```

---

## 🏛️ Arquitectura MVC

### **M - Modelos (Models)**
Define la **estructura de las tablas** en la base de datos.

```
backend/src/models/
├── User.js           → tabla: usuario
├── Role.js           → tabla: rol
├── Student.js        → tabla: estudiante (extiende usuario)
├── Teacher.js        → tabla: docente (extiende usuario)
├── Course.js         → tabla: curso
├── Subject.js        → tabla: materia
├── Enrollment.js     → tabla: inscripcion
├── Grade.js          → tabla: calificacion
└── index.js          → define relaciones entre modelos
```

**Ejemplo - User.js:**
```javascript
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombres: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  nombre_usuario: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  contrasena: { type: DataTypes.TEXT, allowNull: false },  // hasheada con bcrypt
  id_rol: { type: DataTypes.INTEGER, allowNull: false }    // referencia a rol
}, { tableName: 'usuario', timestamps: false });
```

### **V - Vistas (Routes)**
Define los **endpoints HTTP** disponibles.

```
backend/src/routes/
├── auth.routes.js        → POST /register, POST /login, GET /profile
├── user.routes.js        → GET, PUT, DELETE usuarios
├── course.routes.js      → CRUD cursos
├── enrollment.routes.js  → inscripciones
├── grade.routes.js       → calificaciones
└── ...
```

**Ejemplo - auth.routes.js:**
```javascript
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', verifyToken, authController.getProfile);
```

### **C - Controladores (Controllers)**
Contiene la **lógica de negocio**.

```
backend/src/controllers/
├── auth.controller.js       → registro, login, perfil
├── user.controller.js       → operaciones de usuarios
├── course.controller.js     → gestión de cursos
├── enrollment.controller.js → inscripción, verificación de cupo
├── grade.controller.js      → calificaciones
└── ...
```

**Ejemplo - auth.controller.js (register):**
```javascript
const register = async (req, res, next) => {
  // 1. Validar campos requeridos
  if (!nombres || !apellido_paterno || !email || !nombre_usuario || !contrasena) {
    return res.status(400).json({ message: 'Campos faltantes' });
  }
  
  // 2. Hashear contraseña con bcrypt (seguridad)
  const hashed = await bcrypt.hash(contrasena, 10);
  
  // 3. Crear usuario en BD
  const user = await User.create({
    nombres, apellido_paterno, email, nombre_usuario,
    contrasena: hashed,  // nunca guardar en texto plano
    id_rol
  });
  
  // 4. Crear rol específico (Estudiante/Docente/Admin)
  if (id_rol === 3) {
    await Student.create({ id: user.id, matricula, telefono });
  }
  
  // 5. Retornar respuesta sin contraseña
  res.status(201).json({ message: 'Usuario registrado', user });
};
```

---

## 🔐 Autenticación y Autorización

### **Flujo de Login**

```
POST /api/auth/login
{ nombre_usuario: "estudiante1", contrasena: "123456" }
    ↓
1. Buscar usuario en BD
    ↓
2. Comparar contraseña con bcrypt.compare()
    ↓
3. Si válido → generar JWT (token)
    token = jwt.sign({ id, nombre_usuario, rol }, JWT_SECRET, { expiresIn: '24h' })
    ↓
4. Enviar token al cliente
{ token: "eyJhbGciOiJIUzI1NiIs...", user: {...} }
```

### **JWT (JSON Web Token)**
Un token es un **string cifrado** que contiene:
- `id`: ID del usuario
- `nombre_usuario`: nombre de login
- `rol`: rol del usuario (Administrador, Docente, Estudiante)
- `iat` (issued at): fecha de creación
- `exp` (expiration): fecha de expiración (24 horas)

```javascript
// El cliente envía en cada petición:
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Middlewares de Seguridad**

**1. verifyToken** [auth.middleware.js]
```javascript
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];  // Extraer token
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);  // Verificar firma
    req.user = decoded;  // Guardar usuario en request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};
```

**2. verifyRole** [role.middleware.js]
```javascript
const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
};
```

**Ejemplo de uso:**
```javascript
// Solo admin puede crear usuarios
router.post('/', verifyToken, verifyRole('Administrador'), userController.create);

// Token = válido y rol = 'Administrador' → acceso permitido
// Token = inválido → error 401
// Token = válido pero rol = 'Estudiante' → error 403
```

---

## 🗄️ Modelos y Relaciones

### **Diagrama de Entidades**

```
┌─────────────────────────────────────────┐
│            ROL (1)                      │
│  ┌──────────────────────────────┐       │
│  │ id (PK)                      │       │
│  │ nombre (Administrador, ...)  │       │
│  └──────────────────────────────┘       │
│              ▲                           │
│              │ 1 a N                     │
│              │                           │
│  ┌──────────────────────────────┐       │
│  │      USUARIO (N)             │       │
│  ├──────────────────────────────┤       │
│  │ id (PK)                      │       │
│  │ nombres, apellido_paterno    │       │
│  │ email, nombre_usuario        │       │
│  │ contrasena (hashed)          │       │
│  │ id_rol (FK)                  │──────→│
│  └──────────────────────────────┘       │
│          ▲                               │
│          │ 1:1 (herencia)               │
│    ┌─────┴─────┬───────┐                │
│    │           │       │                │
│ ESTUDIANTE DOCENTE  ADMIN               │
│ matricula especialidad (solo admin)     │
│ teléfono  teléfono                      │
└─────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         PLAN ACADÉMICO                       │
├──────────────────────────────────────────────┤
│  MODALIDAD (1) ← carrera semestral o anual │
│      ↓ (1:N)                               │
│  CARRERA (ej: Ingeniería de Sistemas)      │
│      ↓ (1:N)                               │
│  PENSUM/CURRICULUM (versión del plan)      │
│      ↓ (1:N)                               │
│  MATERIA (ej: Matemáticas I)               │
│      ↓ (1:N)                               │
│  CURSO (instancia de una materia)          │
│      ↓ (1:N)                               │
│  HORARIO (día, hora, aula)                 │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│    INSCRIPCIÓN Y CALIFICACIÓN                │
├──────────────────────────────────────────────┤
│  ESTUDIANTE (N) → INSCRIPCIÓN (N) → CURSO   │
│                       ↓ (1:1)                │
│                    CALIFICACIÓN              │
│                  (nota, observación)        │
└──────────────────────────────────────────────┘
```

---

## 📋 Flujos Principales

### **1. Registro de Usuario**

```
POST /api/auth/register
Body: {
  "nombres": "Ana",
  "apellido_paterno": "García",
  "email": "ana@example.com",
  "nombre_usuario": "ana_garcia",
  "contrasena": "Segura123",
  "id_rol": 3,              // 1=Admin, 2=Docente, 3=Estudiante
  "matricula": "EST-001",   // solo si estudiante
  "telefono": "555-1234"
}
    ↓
1. Validar campos requeridos
    ↓
2. Hashear contraseña: bcrypt.hash("Segura123", 10)
    → resultado: "$2b$10$fSvqCT4lLKqVd4..."
    ↓
3. Crear usuario en tabla "usuario"
    ↓
4. Crear registro en tabla "estudiante" (id=usuario.id)
    ↓
5. Retornar usuario (sin contraseña)
```

### **2. Login**

```
POST /api/auth/login
Body: { "nombre_usuario": "ana_garcia", "contrasena": "Segura123" }
    ↓
1. Buscar usuario por nombre_usuario
    ↓
2. Comparar contraseña: bcrypt.compare("Segura123", "$2b$10$...")
    ↓
3. Si coincide → generar JWT
    payload = {
      id: 3,
      nombre_usuario: "ana_garcia",
      rol: "Estudiante",
      iat: 1234567890,
      exp: 1234654290  // +24 horas
    }
    ↓
4. Responder con token
Response: {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { id: 3, nombres: "Ana", rol: "Estudiante" }
}
```

### **3. Inscribirse a un Curso**

```
POST /api/enrollments
Headers: Authorization: Bearer <TOKEN>
Body: { "id_estudiante": 3, "id_curso": 1 }
    ↓
1. verifyToken() → valida JWT
    req.user = { id: 3, nombre_usuario: "ana_garcia", rol: "Estudiante" }
    ↓
2. Verificar que estudiante existe
    ↓
3. Verificar que curso existe y está activo
    ↓
4. Verificar que no está inscrito ya
    ↓
5. Verificar cupo máximo
    SELECT COUNT(*) FROM inscripcion 
    WHERE id_curso = 1 AND estado = 'Inscrito'
    ↓
    Si count >= cupo_maximo → error 400
    ↓
6. Verificar horarios (no choque de horas)
    ↓
7. Crear inscripción
    INSERT INTO inscripcion (id_estudiante, id_curso, estado, fecha_inscripcion)
    VALUES (3, 1, 'Inscrito', NOW())
    ↓
8. Responder con inscripción creada
Response: {
  "message": "Inscripción exitosa",
  "enrollment": { id: 1, id_estudiante: 3, id_curso: 1, estado: "Inscrito" }
}
```

### **4. Calificar a Estudiante**

```
POST /api/grades
Headers: Authorization: Bearer <TOKEN_DOCENTE>
Body: {
  "nota": 85,
  "observacion": "Buen desempeño",
  "id_inscripcion": 1,
  "id_docente": 2
}
    ↓
1. verifyToken() → valida que sea docente
    ↓
2. verifyRole('Docente') → solo docentes
    ↓
3. Validar nota (0-100)
    ↓
4. Verificar que inscripción existe
    ↓
5. Crear calificación
    INSERT INTO calificacion (nota, observacion, id_inscripcion, id_docente)
    VALUES (85, "Buen desempeño", 1, 2)
    ↓
6. Responder
Response: {
  "message": "Calificación registrada",
  "grade": { id: 1, nota: 85, id_inscripcion: 1 }
}
```

---

## 📊 Variables de Entorno (.env)

```
# Base de Datos
DB_HOST=localhost         # IP/hostname del servidor PostgreSQL
DB_PORT=5432              # Puerto (default PostgreSQL)
DB_NAME=sistema_academico # Nombre de la BD
DB_USER=postgres          # Usuario de PostgreSQL
DB_PASSWORD=root          # Contraseña

# Seguridad
JWT_SECRET=sistema_academico_secret_key_2024  # Clave para firmar JWTs
JWT_EXPIRES_IN=24h                             # Tiempo de expiración

# Servidor
PORT=3000                 # Puerto del backend
```

---

## 🔄 Patrones Clave

### **1. Inyección de Dependencias (Implícita)**
```javascript
// user.controller.js importa los modelos
const { User, Role } = require('../models');

// Usa los modelos directamente
const users = await User.findAll();
```

### **2. Callbacks vs Promises vs Async/Await**
```javascript
// Async/Await (recomendado, legible)
const getUser = async (id) => {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    throw error;
  }
};

// Promises (antiguo)
User.findByPk(id)
  .then(user => res.json(user))
  .catch(err => next(err));
```

### **3. Validación de Entrada**
```javascript
// En controlador
if (!nombres || !email) {
  return res.status(400).json({ message: 'Campo requerido' });
}

// En modelo (opcional)
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true }  // Sequelize valida
  }
});
```

### **4. Manejo de Errores**
```javascript
// Cada controlador tiene try/catch
const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    next(error);  // Pasa al middleware de errores
  }
};

// error.middleware.js lo maneja globalmente
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error del servidor' });
};
```

---

## 🚀 Stack Tecnológico

| Componente | Tecnología | Función |
|---|---|---|
| Runtime | Node.js | Ejecutar JavaScript en servidor |
| Framework Web | Express.js | Servidor HTTP, rutas, middlewares |
| ORM | Sequelize | Mapeo BD (modelos, relaciones) |
| BD | PostgreSQL | Almacenamiento persistente |
| Autenticación | JWT | Tokens seguros sin sesiones |
| Hash Contraseñas | bcrypt | Encriptación one-way |
| Env Variables | dotenv | Configuración segura |
| CORS | cors | Permitir peticiones cross-origin |

---

## 📌 Resumen

1. **Cliente** envía petición a `/api/resource` con token JWT
2. **Express** recibe y aplica middlewares
3. **Middleware de autenticación** valida JWT
4. **Middleware de autorización** valida rol
5. **Router** mapea a un controlador
6. **Controlador** ejecuta lógica (validaciones, BD)
7. **Modelo Sequelize** consulta PostgreSQL
8. **Respuesta** regresa en JSON

Todo esto sigue el patrón **MVC** para mantener código organizado y escalable.
