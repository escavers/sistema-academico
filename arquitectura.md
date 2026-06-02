# 🏛️ Arquitectura del Sistema — Plataforma Educativa Web

## 1. Estilo Arquitectónico Principal

### **MVC (Model - View - Controller)**

Se adoptará el patrón **MVC** como arquitectura principal del sistema. Este patrón divide la aplicación en tres capas bien definidas, garantizando separación de responsabilidades, facilidad de mantenimiento y escalabilidad.

```
┌────────────────────────────────────────────────────────────────┐
│                          USUARIO                               │
└────────────────────────────┬───────────────────────────────────┘
                             │ Interacción (clic, formulario)
┌────────────────────────────▼───────────────────────────────────┐
│                         VIEW (Vista)                           │
│               React.js — Interfaz de usuario                   │
│         Renderiza datos, captura eventos del usuario           │
└────────────────────────────┬───────────────────────────────────┘
                             │ Envía solicitudes HTTP (Axios)
┌────────────────────────────▼───────────────────────────────────┐
│                      CONTROLLER (Controlador)                  │
│               Express.js — Rutas y Controladores               │
│    Recibe peticiones, aplica lógica, llama al modelo           │
└────────────────────────────┬───────────────────────────────────┘
                             │ Consulta / Actualiza datos
┌────────────────────────────▼───────────────────────────────────┐
│                        MODEL (Modelo)                          │
│            Sequelize ORM + PostgreSQL                          │
│     Representa los datos, aplica reglas de integridad          │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Descripción de Cada Capa MVC

### 🖼️ VIEW — Vista (Frontend React.js)
- Representa la **interfaz de usuario**
- Muestra datos recibidos del controlador vía API REST
- Captura acciones del usuario (formularios, botones, navegación)
- Se adapta según el **rol** (Estudiante / Docente / Administrador)
- **No contiene lógica de negocio**

### 🎮 CONTROLLER — Controlador (Express.js)
- Actúa como **intermediario** entre Vista y Modelo
- Recibe las peticiones HTTP y las enruta al controlador correcto
- Valida datos de entrada
- Llama al modelo para obtener o modificar datos
- Devuelve respuestas en formato **JSON**

### 🗄️ MODEL — Modelo (Sequelize + PostgreSQL)
- Representa las **entidades del dominio** (Users, Courses, Grades…)
- Encapsula las **reglas de integridad** de los datos
- Realiza las operaciones CRUD sobre la base de datos
- Define las relaciones entre tablas (FK, N:M, 1:N)

---

## 3. Stack Tecnológico

### 🖥️ Frontend (View)
| Tecnología | Rol en MVC | Justificación |
|------------|-----------|--------------|
| **React.js** | Vista | Componentes reutilizables, SPA, reactivo |
| **React Router** | Vista | Navegación entre vistas según rol |
| **Axios** | Vista → Controller | Comunicación HTTP con la API |
| **Context API** | Vista | Estado global de sesión y rol |
| **CSS / Tailwind** | Vista | Estilos responsivos y modernos |
| **React PDF / SheetJS** | Vista | Descarga de reportes en cliente |

### ⚙️ Backend (Controller + Model)
| Tecnología | Rol en MVC | Justificación |
|------------|-----------|--------------|
| **Node.js + Express.js** | Controller | Servidor de rutas y controladores |
| **JWT** | Controller | Autenticación stateless y segura |
| **bcrypt** | Controller | Encriptación de contraseñas |
| **Sequelize ORM** | Model | Abstracción del acceso a BD |
| **PostgreSQL** | Model | Base de datos relacional robusta |
| **PDFKit / ExcelJS** | Controller | Generación de reportes en servidor |
| **Nodemailer** | Controller | Notificaciones por correo electrónico |

---

## 4. Estructura de Carpetas MVC

```
📁 proyecto-educativo/
│
├── 📁 frontend/                          ← VIEW
│   └── 📁 src/
│       ├── 📁 components/               # Componentes UI reutilizables
│       │   ├── Navbar/
│       │   ├── Sidebar/
│       │   ├── CourseCard/
│       │   └── NotificationBell/
│       ├── 📁 pages/                    # Vistas por módulo y rol
│       │   ├── Auth/                    # Login, Registro
│       │   ├── Dashboard/               # Panel por rol
│       │   ├── Courses/                 # Listado, detalle, inscripción
│       │   ├── Grades/                  # Notas por curso/alumno
│       │   ├── Profile/                 # Perfil y edición
│       │   ├── Reports/                 # Generación PDF/Excel
│       │   └── Admin/                   # Gestión de usuarios
│       ├── 📁 context/                  # AuthContext, NotifContext
│       ├── 📁 services/                 # Llamadas Axios a la API
│       └── 📁 routes/                   # Rutas protegidas por rol
│
├── 📁 backend/                           ← CONTROLLER + MODEL
│   └── 📁 src/
│       ├── 📁 routes/                   # Definición de endpoints REST
│       │   ├── auth.routes.js
│       │   ├── users.routes.js
│       │   ├── courses.routes.js
│       │   ├── grades.routes.js
│       │   └── reports.routes.js
│       │
│       ├── 📁 controllers/              ← CONTROLLER
│       │   ├── authController.js        # RF01, RF02, RF11
│       │   ├── userController.js        # RF03, RF09
│       │   ├── courseController.js      # RF04, RF05, RF06
│       │   ├── gradeController.js       # RF07
│       │   ├── dashboardController.js   # RF08
│       │   ├── notifController.js       # RF10
│       │   └── reportController.js      # RF12
│       │
│       ├── 📁 models/                   ← MODEL
│       │   ├── User.js
│       │   ├── Course.js
│       │   ├── Enrollment.js
│       │   ├── Grade.js
│       │   ├── Schedule.js
│       │   └── Notification.js
│       │
│       ├── 📁 middlewares/              # Auth JWT, RBAC, errores
│       ├── 📁 config/                   # BD, JWT, env
│       └── 📁 reports/                  # Generadores PDF/Excel
│
├── 📁 database/
│   ├── migrations/                      # Esquema versionado
│   └── seeders/                         # Datos de prueba
│
└── README.md
```

---

## 5. Flujo MVC — Ejemplo: Inscripción a un Curso (RF05)

```
VIEW                    CONTROLLER                    MODEL
 │                           │                           │
 │ [Alumno clic "Inscribirse"]│                           │
 │──── POST /api/enrollments ►│                           │
 │     { courseId, userId }   │                           │
 │                            │── Verifica JWT ──────────►│
 │                            │── Valida rol (Estudiante) │
 │                            │── ¿Ya inscrito? ─────────►│
 │                            │◄── false ─────────────────│
 │                            │── ¿Solapamiento horario? ►│
 │                            │◄── false ─────────────────│
 │                            │── Crea Enrollment ───────►│
 │                            │◄── Enrollment creado ─────│
 │                            │── Crea Notificación ─────►│
 │◄── 201 Created (JSON) ─────│                           │
 │ [Muestra mensaje éxito]    │                           │
```

---

## 6. Mapeo de Requisitos a Controladores MVC

| Requisito | Controlador | Modelo(s) |
|-----------|------------|----------|
| RF01 – Registro | `authController` | `User` |
| RF02 – Login/Sesión | `authController` | `User` |
| RF03 – Perfil | `userController` | `User` |
| RF04 – Gestión cursos | `courseController` | `Course`, `Schedule` |
| RF05 – Inscripción | `courseController` | `Enrollment`, `Schedule` |
| RF06 – Ver cursos | `courseController` | `Course`, `Enrollment` |
| RF07 – Calificaciones | `gradeController` | `Grade`, `Enrollment` |
| RF08 – Dashboard | `dashboardController` | `Course`, `Grade`, `Notif.` |
| RF09 – Gestión usuarios | `userController` | `User` |
| RF10 – Notificaciones | `notifController` | `Notification` |
| RF11 – Logout | `authController` | — (invalida JWT) |
| RF12 – Reportes | `reportController` | Todos los modelos |

---

## 7. Control de Acceso por Rol (RBAC en el Controller)

```
Middleware: verifyToken()  →  verifyRole(['admin'])
                           →  verifyRole(['docente'])
                           →  verifyRole(['estudiante'])

┌──────────────────┬──────────────────┬───────────────────────┐
│   ADMINISTRADOR  │     DOCENTE       │      ESTUDIANTE        │
├──────────────────┼──────────────────┼───────────────────────┤
│ ✅ Crear cursos  │ ✅ Ver sus cursos │ ✅ Ver cursos disp.   │
│ ✅ Editar cursos │ ✅ Registrar notas│ ✅ Inscribirse         │
│ ✅ Crear usuarios│ ✅ Editar notas   │ ✅ Ver sus notas       │
│ ✅ Asignar roles │ ✅ Ver sus alumnos│ ✅ Ver perfil propio   │
│ ✅ Reportes admin│ ✅ Generar report.│ ✅ Historial académico │
└──────────────────┴──────────────────┴───────────────────────┘
```

---

## 8. Modelos de Datos (MODEL)

### Entidades y Relaciones

```
Users ──────────────── Enrollments ──────────────── Courses
  │         (1:N)           │ (N:1)           (1:N)    │
  │                         │                          │
  │                      Grades                   Schedules
  │                    (1:1 por Enrollment)
  │
  └──────────────── Notifications (1:N)
```

### Reglas de Integridad (en el Model)
| Regla | Implementación |
|-------|---------------|
| Sin inscripción duplicada | `UNIQUE(user_id, course_id)` en Enrollment |
| Sin solapamiento de horarios | Validación en Controller antes de crear Enrollment |
| Contraseña segura | `bcrypt` en el Controller, hash guardado en Model |
| Soft delete de usuarios | Campo `is_active: boolean` en User |

---

## 9. Estrategia de Reportes RF12 (Patrón Factory en Controller)

| Reporte | Rol | Formato |
|---------|-----|---------|
| Materias por carrera | Admin | PDF / Excel |
| Notas por alumno | Docente | PDF / Excel |
| Notas por curso | Docente | PDF / Excel |
| Historial académico | Alumno | PDF / Excel |
| Notas de todas las materias | Alumno | PDF / Excel |
| Alumnos inscritos a un curso | Docente | PDF / Excel |
| Materias del alumno | Alumno | PDF / Excel |
| Materias del docente | Docente | PDF / Excel |

> El `reportController` usa el patrón **Factory Method**: decide si generar PDF (PDFKit) o Excel (ExcelJS) según el parámetro `?format=pdf` o `?format=excel`.

---

## 10. Principios de Calidad Aplicados

| Principio | Aplicación en MVC |
|-----------|------------------|
| **SOLID** | Cada Controller tiene una única responsabilidad |
| **DRY** | Middlewares reutilizables (auth, roles, errores) |
| **KISS** | Rutas simples, Controllers delgados |
| **Seguridad** | JWT + RBAC en cada endpoint del Controller |
| **Manejo de errores** | Middleware global → respuestas JSON estandarizadas |

---

*Documento generado para: Programación IV — Ph. D. Luigi Antequera Tamari*
*Plataforma Educativa Web Integral — Arquitectura MVC*
