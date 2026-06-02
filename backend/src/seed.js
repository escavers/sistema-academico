const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  sequelize,
  Role,
  Modality,
  Career,
  Curriculum,
  Subject,
  SubjectCurriculum,
  AcademicPeriod,
  User,
  Student,
  StudentCareer,
  Teacher,
  Admin,
  Course,
  Schedule,
  Enrollment,
  Grade,
} = require('./models');

const createIfNotExist = async (Model, where, defaults) => {
  const [instance, created] = await Model.findOrCreate({ where, defaults });
  if (created) {
    console.log(`Created ${Model.name}:`, where);
  } else {
    console.log(`${Model.name} exists:`, where);
  }
  return instance;
};

const createUser = async ({ nombres, apellido_paterno, apellido_materno, email, nombre_usuario, contrasena, id_rol, studentData, teacherData }) => {
  const hashed = await bcrypt.hash(contrasena, 10);

  const [user, created] = await User.findOrCreate({
    where: { nombre_usuario },
    defaults: {
      nombres,
      apellido_paterno,
      apellido_materno,
      email,
      nombre_usuario,
      contrasena: hashed,
      id_rol,
    },
  });

  if (created) {
    console.log(`Created user: ${nombre_usuario}`);
  } else {
    console.log(`User exists: ${nombre_usuario}`);
  }

  if (id_rol === 3) {
    await Student.findOrCreate({ where: { id: user.id }, defaults: studentData });
  }
  if (id_rol === 2) {
    await Teacher.findOrCreate({ where: { id: user.id }, defaults: teacherData });
  }
  if (id_rol === 1) {
    await Admin.findOrCreate({ where: { id: user.id }, defaults: {} });
  }

  return user;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync();
    console.log('Sync completed');

    const adminRole = await createIfNotExist(Role, { nombre: 'Administrador' }, { descripcion: 'Rol administrador' });
    const teacherRole = await createIfNotExist(Role, { nombre: 'Docente' }, { descripcion: 'Rol docente' });
    const studentRole = await createIfNotExist(Role, { nombre: 'Estudiante' }, { descripcion: 'Rol estudiante' });

    const modalidadPresencial = await Modality.findOne({ where: { nombre: 'Presencial' } });
    if (modalidadPresencial) {
      await modalidadPresencial.update({ nombre: 'Semestral' });
    }

    const modalidadVirtual = await Modality.findOne({ where: { nombre: 'Virtual' } });
    if (modalidadVirtual) {
      await modalidadVirtual.update({ nombre: 'Anual' });
    }

    const semestralModality = await createIfNotExist(Modality, { nombre: 'Semestral' }, { max_materias_permitidas: 8 });
    const anualModality = await createIfNotExist(Modality, { nombre: 'Anual' }, { max_materias_permitidas: 8 });

    const careersData = [
      {
        codigo: 'ING-001',
        nombre: 'Ingeniería de Sistemas',
        descripcion: 'Carrera de Ingeniería de Sistemas',
      },
      {
        codigo: 'ELEC-001',
        nombre: 'Ingeniería Electrónica',
        descripcion: 'Carrera de Ingeniería Electrónica',
      },
      {
        codigo: 'ADM-001',
        nombre: 'Administración de Empresas',
        descripcion: 'Carrera de Administración de Empresas',
      },
    ];

    const careers = {};
    for (const careerData of careersData) {
      const career = await createIfNotExist(Career, { codigo: careerData.codigo }, {
        ...careerData,
        id_modalidad: semestralModality.id,
      });
      careers[careerData.codigo] = career;
    }

    const pensumData = [
      { careerCode: 'ING-001', nombre: 'Plan 2024', anio_creacion: '2024-01-01' },
      { careerCode: 'ELEC-001', nombre: 'Plan 2024', anio_creacion: '2024-06-01' },
      { careerCode: 'ADM-001', nombre: 'Plan 2024', anio_creacion: '2024-02-01' },
    ];

    const pensums = {};
    for (const item of pensumData) {
      const pensum = await createIfNotExist(Curriculum, { id_carrera: careers[item.careerCode].id, nombre: item.nombre }, {
        id_carrera: careers[item.careerCode].id,
        nombre: item.nombre,
        anio_creacion: item.anio_creacion,
        estado: true,
      });
      pensums[item.careerCode] = pensum;
    }

    const subjectsByCareer = {
      'ING-001': [
        { codigo: 'MAT101', nombre: 'Matemáticas I', creditos: 4, descripcion: 'Fundamentos de matemáticas para ingeniería', semestre: 1 },
        { codigo: 'FIS101', nombre: 'Física I', creditos: 4, descripcion: 'Principios de física en ingeniería', semestre: 1 },
        { codigo: 'PROG101', nombre: 'Programación I', creditos: 4, descripcion: 'Introducción a la programación con enfoque práctico', semestre: 1 },
        { codigo: 'ALG101', nombre: 'Algoritmos y Estructuras de Datos', creditos: 4, descripcion: 'Resolución de problemas con algoritmos básicos', semestre: 2 },
      ],
      'ELEC-001': [
        { codigo: 'ELEC101', nombre: 'Circuitos Eléctricos I', creditos: 4, descripcion: 'Introducción a los circuitos y análisis de corriente continua', semestre: 1 },
        { codigo: 'FIS102', nombre: 'Física II', creditos: 4, descripcion: 'Electromagnetismo y ondas', semestre: 1 },
        { codigo: 'SENA101', nombre: 'Señales y Sistemas', creditos: 4, descripcion: 'Fundamentos de señales continuas y discretas', semestre: 2 },
        { codigo: 'ELEC102', nombre: 'Electrónica Analógica', creditos: 4, descripcion: 'Dispositivos y amplificadores analógicos', semestre: 2 },
      ],
      'ADM-001': [
        { codigo: 'ADM101', nombre: 'Fundamentos de Administración', creditos: 3, descripcion: 'Conceptos básicos de gestión empresarial', semestre: 1 },
        { codigo: 'ECO101', nombre: 'Economía I', creditos: 3, descripcion: 'Microeconomía para la administración', semestre: 1 },
        { codigo: 'MKT101', nombre: 'Marketing', creditos: 3, descripcion: 'Principios de marketing y análisis de mercado', semestre: 2 },
        { codigo: 'CON101', nombre: 'Contabilidad Financiera', creditos: 3, descripcion: 'Registros contables y análisis financiero', semestre: 2 },
      ],
    };

    const subjectsByCode = {};
    for (const careerCode of Object.keys(subjectsByCareer)) {
      for (const subjectData of subjectsByCareer[careerCode]) {
        const subject = await createIfNotExist(Subject, { codigo: subjectData.codigo }, {
          codigo: subjectData.codigo,
          nombre: subjectData.nombre,
          creditos: subjectData.creditos,
          descripcion: subjectData.descripcion,
        });

        await createIfNotExist(SubjectCurriculum, {
          id_pensum: pensums[careerCode].id,
          id_materia: subject.id,
        }, {
          id_pensum: pensums[careerCode].id,
          id_materia: subject.id,
          semestre: subjectData.semestre,
        });

        subjectsByCode[subjectData.codigo] = subject;
      }
    }

    const periodsData = [
      { codigo: '2024-1', fecha_inicio: '2024-02-01', fecha_fin: '2024-06-30', estado: true },
      { codigo: '2024-2', fecha_inicio: '2024-08-01', fecha_fin: '2024-12-20', estado: true },
      { codigo: '2025-1', fecha_inicio: '2025-02-01', fecha_fin: '2025-06-30', estado: true },
    ];

    const periods = {};
    for (const periodData of periodsData) {
      const period = await createIfNotExist(AcademicPeriod, { codigo: periodData.codigo }, periodData);
      periods[periodData.codigo] = period;
    }

    const adminUser = await createUser({
      nombres: 'Admin',
      apellido_paterno: 'Sistema',
      apellido_materno: 'Admin',
      email: 'admin@sistema.com',
      nombre_usuario: 'admin',
      contrasena: 'Admin1234',
      id_rol: adminRole.id,
    });

    const teacherUsersData = [
      { nombres: 'Juan', apellido_paterno: 'Pérez', apellido_materno: 'Docente', email: 'juan.perez@sistema.com', nombre_usuario: 'docente1', contrasena: 'Docente123', especialidad: 'Matemáticas' },
      { nombres: 'María', apellido_paterno: 'Gómez', apellido_materno: 'Docente', email: 'maria.gomez@sistema.com', nombre_usuario: 'docente2', contrasena: 'Docente123', especialidad: 'Electrónica' },
      { nombres: 'Carlos', apellido_paterno: 'Ruiz', apellido_materno: 'Docente', email: 'carlos.ruiz@sistema.com', nombre_usuario: 'docente3', contrasena: 'Docente123', especialidad: 'Administración' },
      { nombres: 'Laura', apellido_paterno: 'Sánchez', apellido_materno: 'Docente', email: 'laura.sanchez@sistema.com', nombre_usuario: 'docente4', contrasena: 'Docente123', especialidad: 'Programación' },
    ];

    const teachers = [];
    for (const teacherData of teacherUsersData) {
      const teacherUser = await createUser({
        nombres: teacherData.nombres,
        apellido_paterno: teacherData.apellido_paterno,
        apellido_materno: teacherData.apellido_materno,
        email: teacherData.email,
        nombre_usuario: teacherData.nombre_usuario,
        contrasena: teacherData.contrasena,
        id_rol: teacherRole.id,
        teacherData: {
          especialidad: teacherData.especialidad,
          telefono: '555-1000',
        },
      });
      teachers.push(teacherUser);
    }

    const studentUsersData = [
      { nombres: 'Ana', apellido_paterno: 'García', apellido_materno: 'Estudiante', email: 'ana.garcia@sistema.com', nombre_usuario: 'estudiante1', contrasena: 'Estudiante123', matricula: 'EST-001', telefono: '555-2000', fecha_nacimiento: '2002-05-10', id_carrera: careers['ING-001'].id, id_pensum: pensums['ING-001'].id },
      { nombres: 'Pedro', apellido_paterno: 'Lopez', apellido_materno: 'Estudiante', email: 'pedro.lopez@sistema.com', nombre_usuario: 'estudiante2', contrasena: 'Estudiante123', matricula: 'EST-002', telefono: '555-2001', fecha_nacimiento: '2002-04-18', id_carrera: careers['ING-001'].id, id_pensum: pensums['ING-001'].id },
      { nombres: 'Sofía', apellido_paterno: 'Martínez', apellido_materno: 'Estudiante', email: 'sofia.martinez@sistema.com', nombre_usuario: 'estudiante3', contrasena: 'Estudiante123', matricula: 'EST-003', telefono: '555-2002', fecha_nacimiento: '2003-01-22', id_carrera: careers['ELEC-001'].id, id_pensum: pensums['ELEC-001'].id },
      { nombres: 'Luis', apellido_paterno: 'Fernández', apellido_materno: 'Estudiante', email: 'luis.fernandez@sistema.com', nombre_usuario: 'estudiante4', contrasena: 'Estudiante123', matricula: 'EST-004', telefono: '555-2003', fecha_nacimiento: '2002-08-11', id_carrera: careers['ELEC-001'].id, id_pensum: pensums['ELEC-001'].id },
      { nombres: 'Mariana', apellido_paterno: 'Rojas', apellido_materno: 'Estudiante', email: 'mariana.rojas@sistema.com', nombre_usuario: 'estudiante5', contrasena: 'Estudiante123', matricula: 'EST-005', telefono: '555-2004', fecha_nacimiento: '2001-12-05', id_carrera: careers['ADM-001'].id, id_pensum: pensums['ADM-001'].id },
      { nombres: 'Diego', apellido_paterno: 'Castillo', apellido_materno: 'Estudiante', email: 'diego.castillo@sistema.com', nombre_usuario: 'estudiante6', contrasena: 'Estudiante123', matricula: 'EST-006', telefono: '555-2005', fecha_nacimiento: '2003-03-15', id_carrera: careers['ADM-001'].id, id_pensum: pensums['ADM-001'].id },
    ];

    const students = [];
    for (const studentData of studentUsersData) {
      const studentUser = await createUser({
        nombres: studentData.nombres,
        apellido_paterno: studentData.apellido_paterno,
        apellido_materno: studentData.apellido_materno,
        email: studentData.email,
        nombre_usuario: studentData.nombre_usuario,
        contrasena: studentData.contrasena,
        id_rol: studentRole.id,
        studentData: {
          matricula: studentData.matricula,
          telefono: studentData.telefono,
          fecha_nacimiento: studentData.fecha_nacimiento,
          id_carrera: studentData.id_carrera,
          id_pensum: studentData.id_pensum,
        },
      });
      students.push(studentUser);
    }

    const coursesData = [
      { codigo_grupo: 'SYS-MAT101-A', materiaCode: 'MAT101', periodoCode: '2024-1', teacherIndex: 0, cupo_maximo: 30, estado: true },
      { codigo_grupo: 'SYS-FIS101-A', materiaCode: 'FIS101', periodoCode: '2024-1', teacherIndex: 0, cupo_maximo: 30, estado: true },
      { codigo_grupo: 'SYS-PROG101-A', materiaCode: 'PROG101', periodoCode: '2024-2', teacherIndex: 3, cupo_maximo: 24, estado: true },
      { codigo_grupo: 'ELEC-ELEC101-A', materiaCode: 'ELEC101', periodoCode: '2024-1', teacherIndex: 1, cupo_maximo: 25, estado: true },
      { codigo_grupo: 'ELEC-FIS102-A', materiaCode: 'FIS102', periodoCode: '2024-2', teacherIndex: 1, cupo_maximo: 25, estado: true },
      { codigo_grupo: 'ELEC-SENA101-A', materiaCode: 'SENA101', periodoCode: '2025-1', teacherIndex: 1, cupo_maximo: 25, estado: true },
      { codigo_grupo: 'ADM-ADM101-A', materiaCode: 'ADM101', periodoCode: '2024-1', teacherIndex: 2, cupo_maximo: 30, estado: true },
      { codigo_grupo: 'ADM-ECO101-A', materiaCode: 'ECO101', periodoCode: '2024-2', teacherIndex: 2, cupo_maximo: 30, estado: true },
      { codigo_grupo: 'ADM-MKT101-A', materiaCode: 'MKT101', periodoCode: '2025-1', teacherIndex: 2, cupo_maximo: 30, estado: true },
    ];

    const periodsByCode = periods;
    const courses = [];
    for (const courseData of coursesData) {
      const course = await createIfNotExist(Course, {
        codigo_grupo: courseData.codigo_grupo,
        id_materia: subjectsByCode[courseData.materiaCode].id,
        id_periodo_academico: periodsByCode[courseData.periodoCode].id,
        id_docente: teachers[courseData.teacherIndex].id,
        id_administrador: adminUser.id,
      }, {
        cupo_maximo: courseData.cupo_maximo,
        estado: courseData.estado,
      });
      courses.push(course);
    }

    const scheduleData = [
      { dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', aula: 'A101' },
      { dia_semana: 'Martes', hora_inicio: '10:00', hora_fin: '12:00', aula: 'B202' },
      { dia_semana: 'Miércoles', hora_inicio: '14:00', hora_fin: '16:00', aula: 'C303' },
      { dia_semana: 'Jueves', hora_inicio: '08:00', hora_fin: '10:00', aula: 'A102' },
      { dia_semana: 'Viernes', hora_inicio: '12:00', hora_fin: '14:00', aula: 'D404' },
    ];

    for (let i = 0; i < courses.length; i++) {
      const schedule = scheduleData[i % scheduleData.length];
      await createIfNotExist(Schedule, {
        id_curso: courses[i].id,
        dia_semana: schedule.dia_semana,
        hora_inicio: schedule.hora_inicio,
        hora_fin: schedule.hora_fin,
        aula: schedule.aula,
      }, {});
    }

    const enrollmentsData = [
      { studentIndex: 0, courseIndex: 0, estado: 'Inscrito' },
      { studentIndex: 0, courseIndex: 2, estado: 'Inscrito' },
      { studentIndex: 1, courseIndex: 0, estado: 'Inscrito' },
      { studentIndex: 2, courseIndex: 3, estado: 'Inscrito' },
      { studentIndex: 2, courseIndex: 4, estado: 'Inscrito' },
      { studentIndex: 3, courseIndex: 3, estado: 'Inscrito' },
      { studentIndex: 4, courseIndex: 6, estado: 'Inscrito' },
      { studentIndex: 4, courseIndex: 7, estado: 'Inscrito' },
      { studentIndex: 5, courseIndex: 6, estado: 'Inscrito' },
    ];

    const enrollments = [];
    for (const enrollmentData of enrollmentsData) {
      const enrollment = await createIfNotExist(Enrollment, {
        id_estudiante: students[enrollmentData.studentIndex].id,
        id_curso: courses[enrollmentData.courseIndex].id,
      }, {
        estado: enrollmentData.estado,
      });
      enrollments.push(enrollment);
    }

    const gradesData = [
      { enrollmentIndex: 0, nota: 92.5, observacion: 'Excelente trabajo', teacherIndex: 0 },
      { enrollmentIndex: 2, nota: 78.0, observacion: 'Buen desempeño', teacherIndex: 0 },
      { enrollmentIndex: 4, nota: 85.0, observacion: 'Progreso constante', teacherIndex: 1 },
    ];

    for (const gradeData of gradesData) {
      const enrollment = enrollments[gradeData.enrollmentIndex];
      await createIfNotExist(Grade, {
        id_inscripcion: enrollment.id,
      }, {
        nota: gradeData.nota,
        observacion: gradeData.observacion,
        fecha_registro: new Date().toISOString().slice(0, 10),
        id_docente: teachers[gradeData.teacherIndex].id,
      });
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
