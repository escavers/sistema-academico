const sequelize = require('../config/database');

const Role = require('./Role');
const User = require('./User');
const Student = require('./Student');
const Teacher = require('./Teacher');
const Admin = require('./Admin');
const Notification = require('./Notification');
const AcademicPeriod = require('./AcademicPeriod');
const Modality = require('./Modality');
const Career = require('./Career');
const Curriculum = require('./Curriculum');
const Subject = require('./Subject');
const Course = require('./Course');
const SubjectCurriculum = require('./SubjectCurriculum');
const StudentCareer = require('./StudentCareer');
const Schedule = require('./Schedule');
const Enrollment = require('./Enrollment');
const Grade = require('./Grade');
const BlacklistedToken = require('./BlacklistedToken');
const TeacherCareer = require('./TeacherCareer');
const TeacherSpecialty = require('./TeacherSpecialty');

// ── Role <-> User ───────────────────────────────────────────────────────────
Role.hasMany(User, { foreignKey: 'id_rol', as: 'usuarios' });
User.belongsTo(Role, { foreignKey: 'id_rol', as: 'rol' });

// ── User <-> Student / Teacher / Admin (1:1 via shared PK) ──────────────────
User.hasOne(Student, { foreignKey: 'id', as: 'estudiante' });
User.hasOne(Teacher, { foreignKey: 'id', as: 'docente' });
User.hasOne(Admin, { foreignKey: 'id', as: 'administrador' });

Student.belongsTo(User, { foreignKey: 'id', as: 'usuario' });
Teacher.belongsTo(User, { foreignKey: 'id', as: 'usuario' });
Admin.belongsTo(User, { foreignKey: 'id', as: 'usuario' });

// ── User <-> Notification ───────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'id_usuario', as: 'notificaciones' });
Notification.belongsTo(User, { foreignKey: 'id_usuario', as: 'usuario' });

// ── Modality <-> Career ─────────────────────────────────────────────────────
Modality.hasMany(Career, { foreignKey: 'id_modalidad', as: 'carreras' });
Career.belongsTo(Modality, { foreignKey: 'id_modalidad', as: 'modalidad' });

// ── Career <-> Curriculum ───────────────────────────────────────────────────
Career.hasMany(Curriculum, { foreignKey: 'id_carrera', as: 'pensums' });
Curriculum.belongsTo(Career, { foreignKey: 'id_carrera', as: 'carrera' });

// ── Student -> Career (1:Many) ──────────────────────────────────────────────
Student.belongsTo(Career, { foreignKey: 'id_carrera', as: 'carrera' });
Career.hasMany(Student, { foreignKey: 'id_carrera', as: 'estudiantes' });

// ── Student -> Curriculum (Pensum) ──────────────────────────────────────────
Student.belongsTo(Curriculum, { foreignKey: 'id_pensum', as: 'pensum' });
Curriculum.hasMany(Student, { foreignKey: 'id_pensum', as: 'estudiantes' });

// ── Curriculum <-> Subject (many-to-many via materia_pensum) ───────────────
Curriculum.belongsToMany(Subject, {
  through: SubjectCurriculum,
  foreignKey: 'id_pensum',
  otherKey: 'id_materia',
  as: 'materias',
});
Subject.belongsToMany(Curriculum, {
  through: SubjectCurriculum,
  foreignKey: 'id_materia',
  otherKey: 'id_pensum',
  as: 'pensums',
});

Curriculum.hasMany(SubjectCurriculum, { foreignKey: 'id_pensum', as: 'materiaPensums' });
SubjectCurriculum.belongsTo(Curriculum, { foreignKey: 'id_pensum', as: 'pensum' });
Subject.hasMany(SubjectCurriculum, { foreignKey: 'id_materia', as: 'subjectPensums' });
SubjectCurriculum.belongsTo(Subject, { foreignKey: 'id_materia', as: 'materia' });

// ── Subject -> Career (direct link) ─────────────────────────────────────────
Subject.belongsTo(Career, { foreignKey: 'id_carrera', as: 'carrera' });
Career.hasMany(Subject, { foreignKey: 'id_carrera', as: 'materias' });

// ── Subject -> Prerequisite (self reference) ─────────────────────────────────
Subject.belongsTo(Subject, { foreignKey: 'id_prerequisito', as: 'prerequisito' });
Subject.hasMany(Subject, { foreignKey: 'id_prerequisito', as: 'dependientes' });

// ── Subject <-> Course ──────────────────────────────────────────────────────
Subject.hasMany(Course, { foreignKey: 'id_materia', as: 'cursos' });
Course.belongsTo(Subject, { foreignKey: 'id_materia', as: 'materia' });

// ── AcademicPeriod <-> Course ───────────────────────────────────────────────
AcademicPeriod.hasMany(Course, { foreignKey: 'id_periodo_academico', as: 'cursos' });
Course.belongsTo(AcademicPeriod, { foreignKey: 'id_periodo_academico', as: 'periodo_academico' });

// ── Teacher <-> Course ──────────────────────────────────────────────────────
Teacher.hasMany(Course, { foreignKey: 'id_docente', as: 'cursos' });
Course.belongsTo(Teacher, { foreignKey: 'id_docente', as: 'docente' });

// ── Admin <-> Course ────────────────────────────────────────────────────────
Admin.hasMany(Course, { foreignKey: 'id_administrador', as: 'cursos' });
Course.belongsTo(Admin, { foreignKey: 'id_administrador', as: 'administrador' });

// ── Course <-> Schedule ─────────────────────────────────────────────────────
Course.hasMany(Schedule, { foreignKey: 'id_curso', as: 'horarios' });
Schedule.belongsTo(Course, { foreignKey: 'id_curso', as: 'curso' });

// ── Course <-> Enrollment ───────────────────────────────────────────────────
Course.hasMany(Enrollment, { foreignKey: 'id_curso', as: 'inscripciones' });
Enrollment.belongsTo(Course, { foreignKey: 'id_curso', as: 'curso' });

// ── Student <-> Enrollment ──────────────────────────────────────────────────
Student.hasMany(Enrollment, { foreignKey: 'id_estudiante', as: 'inscripciones' });
Enrollment.belongsTo(Student, { foreignKey: 'id_estudiante', as: 'estudiante' });

// ── Enrollment <-> Grade ────────────────────────────────────────────────────
Enrollment.hasOne(Grade, { foreignKey: 'id_inscripcion', as: 'calificacion' });
Grade.belongsTo(Enrollment, { foreignKey: 'id_inscripcion', as: 'inscripcion' });

// ── Teacher <-> Grade ───────────────────────────────────────────────────────
Teacher.hasMany(Grade, { foreignKey: 'id_docente', as: 'calificaciones' });
Grade.belongsTo(Teacher, { foreignKey: 'id_docente', as: 'docente_calificador' });

// ── Teacher <-> Career (many-to-many via docente_carrera) ───────────────────
Teacher.belongsToMany(Career, {
  through: TeacherCareer,
  foreignKey: 'id_docente',
  otherKey: 'id_carrera',
  as: 'carreras',
});
Career.belongsToMany(Teacher, {
  through: TeacherCareer,
  foreignKey: 'id_carrera',
  otherKey: 'id_docente',
  as: 'docentes',
});
Teacher.hasMany(TeacherCareer, { foreignKey: 'id_docente', as: 'docenteCarreras' });
TeacherCareer.belongsTo(Teacher, { foreignKey: 'id_docente', as: 'docente' });
TeacherCareer.belongsTo(Career, { foreignKey: 'id_carrera', as: 'carrera' });

// ── Teacher <-> Specialty ───────────────────────────────────────────────────
Teacher.hasMany(TeacherSpecialty, { foreignKey: 'id_docente', as: 'especialidades' });
TeacherSpecialty.belongsTo(Teacher, { foreignKey: 'id_docente', as: 'docente' });
TeacherSpecialty.belongsTo(Career, { foreignKey: 'id_carrera', as: 'carrera' });
Career.hasMany(TeacherSpecialty, { foreignKey: 'id_carrera', as: 'docenteEspecialidades' });

module.exports = {
  sequelize,
  Role,
  User,
  Student,
  Teacher,
  Admin,
  Notification,
  AcademicPeriod,
  Modality,
  Career,
  Curriculum,
  Subject,
  SubjectCurriculum,
  Course,
  StudentCareer,
  Schedule,
  Enrollment,
  Grade,
  BlacklistedToken,
  TeacherCareer,
  TeacherSpecialty,
};
