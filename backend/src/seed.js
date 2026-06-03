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
  Teacher,
  Admin,
  Course,
  Schedule,
  Enrollment,
  Grade,
  Notification,
  TeacherCareer,
  TeacherSpecialty,
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

const normalize = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '');

const generateCareerSubjects = (prefix, careerName, semesterNames) => {
  return semesterNames.flatMap((names, semesterIndex) =>
    names.map((name, subjectIndex) => ({
      codigo: `${prefix}${String((semesterIndex + 1) * 100 + subjectIndex + 1)}`,
      nombre: name,
      creditos: [4, 4, 4, 3, 3, 2][subjectIndex % 6],
      descripcion: `Asignatura de ${careerName}: ${name}`,
      semestre: semesterIndex + 1,
    }))
  );
};

const scheduleDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const scheduleTimes = [
  { hora_inicio: '08:00', hora_fin: '10:00' },
  { hora_inicio: '10:00', hora_fin: '12:00' },
  { hora_inicio: '14:00', hora_fin: '16:00' },
  { hora_inicio: '16:30', hora_fin: '18:30' },
  { hora_inicio: '18:45', hora_fin: '20:45' },
];
const schedulesForCourse = scheduleDays.flatMap((dia) => scheduleTimes.map((horario) => ({ dia_semana: dia, ...horario })));

const hasScheduleConflict = (existing, next) => {
  return existing.dia_semana === next.dia_semana
    && next.hora_inicio < existing.hora_fin
    && next.hora_fin > existing.hora_inicio;
};

const courseConflicts = (courseSchedule, selectedSchedules) => selectedSchedules.some((schedule) => hasScheduleConflict(schedule, courseSchedule));

const buildStudentUser = (index, careerCode, careerId, pensumId) => {
  const firstNames = ['Ana', 'Pedro', 'Sofía', 'Luis', 'Mariana', 'Diego', 'Lucía', 'Carlos', 'Valentina', 'Andrés', 'Fernanda', 'Javier', 'Camila', 'Ricardo', 'Natalia', 'Miguel', 'Gabriela', 'Santiago', 'Paula', 'Hugo', 'Isabella', 'Tomás', 'Daniela', 'Nicolás', 'Martina', 'Esteban', 'Alejandra', 'Matías', 'Carla', 'Sebastián'];
  const lastNames = ['García', 'López', 'Martínez', 'Fernández', 'Ruiz', 'Rojas', 'Gómez', 'Torres', 'Sánchez', 'Castillo', 'Vargas', 'Ortiz', 'Hernández', 'Paredes', 'Molina'];
  const fn = firstNames[index % firstNames.length];
  const ln1 = lastNames[(index + 3) % lastNames.length];
  const ln2 = lastNames[(index + 7) % lastNames.length];
  const username = `${normalize(fn).toLowerCase()}${normalize(ln1).toLowerCase()}${index + 1}`;
  const birthYear = 2000 + Math.floor(index / 10);
  const birthMonth = String((index % 12) + 1).padStart(2, '0');
  const birthDay = String(((index * 3) % 28) + 1).padStart(2, '0');

  return {
    nombres: fn,
    apellido_paterno: ln1,
    apellido_materno: ln2,
    email: `${username}@universidad.edu`,
    nombre_usuario: username,
    contrasena: 'Estudiante123',
    matricula: `EST${String(index + 1).padStart(3, '0')}`,
    telefono: `555-${2000 + index}`,
    fecha_nacimiento: `${birthYear}-${birthMonth}-${birthDay}`,
    id_carrera: careerId,
    id_pensum: pensumId,
  };
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

    const semestralModality = await createIfNotExist(Modality, { nombre: 'Semestral' }, { max_materias_permitidas: 8 });
    await createIfNotExist(Modality, { nombre: 'Anual' }, { max_materias_permitidas: 8 });

    const careersData = [
      { codigo: 'ING-001', nombre: 'Ingeniería de Sistemas', descripcion: 'Formación en sistemas de información, desarrollo de software y redes' },
      { codigo: 'ELEC-001', nombre: 'Ingeniería Electrónica', descripcion: 'Formación en electrónica, comunicaciones y automatización industrial' },
      { codigo: 'ADM-001', nombre: 'Administración de Empresas', descripcion: 'Formación en gestión empresarial, finanzas y liderazgo organizacional' },
      { codigo: 'PSI-001', nombre: 'Psicología Organizacional', descripcion: 'Formación en comportamiento humano, desarrollo organizacional y talento humano' },
      { codigo: 'DIS-001', nombre: 'Diseño Gráfico', descripcion: 'Formación en diseño visual, comunicación y producción digital' },
      { codigo: 'COU-001', nombre: 'Contaduría Pública', descripcion: 'Formación en contabilidad, auditoría y finanzas corporativas' },
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
      { careerCode: 'PSI-001', nombre: 'Plan 2024', anio_creacion: '2024-03-01' },
      { careerCode: 'DIS-001', nombre: 'Plan 2024', anio_creacion: '2024-04-01' },
      { careerCode: 'COU-001', nombre: 'Plan 2024', anio_creacion: '2024-05-01' },
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

    const careerCodeToId = Object.fromEntries(Object.entries(careers).map(([code, career]) => [code, career.id]));

    const subjectsByCareer = {
      'ING-001': [
        { codigo: 'MAT101', nombre: 'Matemáticas I', creditos: 4, descripcion: 'Fundamentos de matemáticas para ingeniería', semestre: 1 },
        { codigo: 'FIS101', nombre: 'Física I', creditos: 4, descripcion: 'Principios de física en ingeniería', semestre: 1 },
        { codigo: 'PROG101', nombre: 'Programación I', creditos: 4, descripcion: 'Introducción a la programación con enfoque práctico', semestre: 1 },
        { codigo: 'LOG101', nombre: 'Lógica y Algoritmos', creditos: 4, descripcion: 'Pensamiento lógico y resolución de problemas', semestre: 1 },
        { codigo: 'COM101', nombre: 'Comunicación Técnica', creditos: 3, descripcion: 'Redacción y comunicación en contextos técnicos', semestre: 1 },
        { codigo: 'DIG101', nombre: 'Tecnologías Digitales', creditos: 3, descripcion: 'Herramientas digitales y colaboración en línea', semestre: 1 },
        { codigo: 'ALG101', nombre: 'Álgebra Lineal', creditos: 4, descripcion: 'Matriz, vectores y aplicaciones en ingeniería', semestre: 2 },
        { codigo: 'INGFIS102', nombre: 'Física II', creditos: 4, descripcion: 'Ondas, termodinámica y electromagnetismo', semestre: 2 },
        { codigo: 'PROG102', nombre: 'Programación II', creditos: 4, descripcion: 'Programación orientada a objetos y buenas prácticas', semestre: 2 },
        { codigo: 'DAT101', nombre: 'Estructuras de Datos', creditos: 4, descripcion: 'Colecciones, árboles y algoritmos eficientes', semestre: 2 },
        { codigo: 'EST101', nombre: 'Estadística para Ingeniería', creditos: 3, descripcion: 'Análisis de datos y probabilidades', semestre: 2 },
        { codigo: 'ETI101', nombre: 'Ética Profesional', creditos: 2, descripcion: 'Responsabilidad y ética en ingeniería', semestre: 2 },
        { codigo: 'BD101', nombre: 'Bases de Datos', creditos: 4, descripcion: 'Modelado y gestión de información', semestre: 3 },
        { codigo: 'RED101', nombre: 'Redes de Computadoras', creditos: 4, descripcion: 'Comunicación de datos y protocolos de red', semestre: 3 },
        { codigo: 'SOFT101', nombre: 'Ingeniería de Software I', creditos: 4, descripcion: 'Procesos y ciclo de vida del software', semestre: 3 },
        { codigo: 'INGECO101', nombre: 'Economía para Ingeniería', creditos: 3, descripcion: 'Principios económicos aplicados a proyectos', semestre: 3 },
        { codigo: 'MAT102', nombre: 'Matemáticas II', creditos: 4, descripcion: 'Cálculo y ecuaciones diferenciales básicas', semestre: 3 },
        { codigo: 'TEC101', nombre: 'Herramientas de Programación', creditos: 3, descripcion: 'Lenguajes y entornos de desarrollo modernos', semestre: 3 },
        { codigo: 'PROG201', nombre: 'Programación III', creditos: 4, descripcion: 'Desarrollo avanzado de aplicaciones', semestre: 4 },
        { codigo: 'SECU101', nombre: 'Seguridad Informática', creditos: 4, descripcion: 'Principios de seguridad en sistemas y redes', semestre: 4 },
        { codigo: 'ADS101', nombre: 'Análisis y Diseño de Sistemas', creditos: 4, descripcion: 'Modelos y diagramas para soluciones de software', semestre: 4 },
        { codigo: 'AGI101', nombre: 'Metodologías Ágiles', creditos: 3, descripcion: 'Scrum, Kanban y gestión de proyectos iterativos', semestre: 4 },
        { codigo: 'PROJ101', nombre: 'Ingeniería de Proyectos', creditos: 3, descripcion: 'Planificación y gestión de proyectos tecnológicos', semestre: 4 },
        { codigo: 'ELECBAS101', nombre: 'Electrónica Básica', creditos: 3, descripcion: 'Componentes electrónicos y circuitos simples', semestre: 4 },
        { codigo: 'IA101', nombre: 'Inteligencia Artificial', creditos: 4, descripcion: 'Fundamentos de IA y aprendizaje automático', semestre: 5 },
        { codigo: 'CAL101', nombre: 'Gestión de Calidad', creditos: 3, descripcion: 'Control y mejora continua de procesos', semestre: 5 },
        { codigo: 'EMP101', nombre: 'Emprendimiento Tecnológico', creditos: 3, descripcion: 'Creación de startups y productos innovadores', semestre: 5 },
        { codigo: 'MODE101', nombre: 'Modelos y Simulación', creditos: 3, descripcion: 'Simulación de sistemas físicos y digitales', semestre: 5 },
        { codigo: 'ARQ101', nombre: 'Arquitectura de Software', creditos: 4, descripcion: 'Diseño de software escalable y modular', semestre: 5 },
        { codigo: 'IO101', nombre: 'Investigación Operativa', creditos: 3, descripcion: 'Optimización y toma de decisiones', semestre: 5 },
        { codigo: 'PROY101', nombre: 'Proyecto de Software I', creditos: 4, descripcion: 'Desarrollo de un proyecto completo de software', semestre: 6 },
        { codigo: 'OPT101', nombre: 'Optimización', creditos: 3, descripcion: 'Técnicas de optimización matemática y heurísticas', semestre: 6 },
        { codigo: 'EMB101', nombre: 'Sistemas Embebidos', creditos: 4, descripcion: 'Arquitectura y programación de sistemas embebidos', semestre: 6 },
        { codigo: 'BIG101', nombre: 'Big Data y Analítica', creditos: 4, descripcion: 'Procesamiento de grandes volúmenes de datos', semestre: 6 },
        { codigo: 'WEB101', nombre: 'Tecnologías Web', creditos: 3, descripcion: 'Desarrollo de aplicaciones web modernas', semestre: 6 },
        { codigo: 'DIR101', nombre: 'Habilidades Directivas', creditos: 2, descripcion: 'Liderazgo y trabajo en equipo en proyectos', semestre: 6 },
      ],
      'ELEC-001': [
        { codigo: 'ELEC101', nombre: 'Circuitos Eléctricos I', creditos: 4, descripcion: 'Introducción a los circuitos y análisis de corriente continua', semestre: 1 },
        { codigo: 'FIS102', nombre: 'Física II', creditos: 4, descripcion: 'Electromagnetismo y ondas', semestre: 1 },
        { codigo: 'SENA101', nombre: 'Señales y Sistemas', creditos: 4, descripcion: 'Fundamentos de señales continuas y discretas', semestre: 1 },
        { codigo: 'ELEC102', nombre: 'Electrónica Analógica', creditos: 4, descripcion: 'Dispositivos y amplificadores analógicos', semestre: 1 },
        { codigo: 'ELECMAT101', nombre: 'Matemáticas para Electrónica', creditos: 4, descripcion: 'Álgebra y cálculo aplicados a electrónica', semestre: 1 },
        { codigo: 'ELECPROG101', nombre: 'Programación para Ingenieros', creditos: 3, descripcion: 'Fundamentos de programación para sistemas electrónicos', semestre: 1 },
        { codigo: 'ELEC201', nombre: 'Circuitos Eléctricos II', creditos: 4, descripcion: 'Cálculo de circuitos de AC y resonancia', semestre: 2 },
        { codigo: 'ELEC203', nombre: 'Electrónica Digital', creditos: 4, descripcion: 'Lógica digital y diseño de circuitos digitales', semestre: 2 },
        { codigo: 'ELEC204', nombre: 'Instrumentación', creditos: 3, descripcion: 'Medición y sensores en sistemas electrónicos', semestre: 2 },
        { codigo: 'ELEC205', nombre: 'Sistemas de Control', creditos: 4, descripcion: 'Control automático y realimentación', semestre: 2 },
        { codigo: 'ELEC206', nombre: 'Semiconductores', creditos: 3, descripcion: 'Dispositivos semiconductores y diodos', semestre: 2 },
        { codigo: 'ELEC207', nombre: 'Análisis de Señales', creditos: 3, descripcion: 'Procesamiento de señales analógicas', semestre: 2 },
        { codigo: 'ELEC301', nombre: 'Sistemas Embebidos', creditos: 4, descripcion: 'Diseño y programación de microcontroladores', semestre: 3 },
        { codigo: 'ELEC302', nombre: 'Electrónica de Potencia', creditos: 4, descripcion: 'Convertidores y fuentes de energía', semestre: 3 },
        { codigo: 'ELEC303', nombre: 'Telecomunicaciones', creditos: 4, descripcion: 'Comunicación analógica y digital', semestre: 3 },
        { codigo: 'ELEC304', nombre: 'Redes de Datos', creditos: 4, descripcion: 'Protocolos y topologías de redes', semestre: 3 },
        { codigo: 'ELEC305', nombre: 'Automatización Industrial', creditos: 3, descripcion: 'Control de procesos y sistemas PLC', semestre: 3 },
        { codigo: 'ELEC306', nombre: 'Microcontroladores', creditos: 4, descripcion: 'Programación y arquitectura de microcontroladores', semestre: 3 },
        { codigo: 'ELEC401', nombre: 'Dispositivos Programables', creditos: 4, descripcion: 'FPGA y diseño digital programable', semestre: 4 },
        { codigo: 'ELEC402', nombre: 'Sensores y Actuadores', creditos: 3, descripcion: 'Interfaz entre computación y el mundo físico', semestre: 4 },
        { codigo: 'ELEC403', nombre: 'Procesamiento Digital de Señales', creditos: 4, descripcion: 'Transformadas y filtrado digital', semestre: 4 },
        { codigo: 'ELEC404', nombre: 'Control Avanzado', creditos: 4, descripcion: 'Sistemas de control moderno y robusto', semestre: 4 },
        { codigo: 'ELEC405', nombre: 'Diseño de PCB', creditos: 3, descripcion: 'Diseño de tarjetas de circuitos impresos', semestre: 4 },
        { codigo: 'ELEC406', nombre: 'Energías Renovables', creditos: 3, descripcion: 'Generación y gestión de energía sostenible', semestre: 4 },
        { codigo: 'ELEC501', nombre: 'Robótica', creditos: 4, descripcion: 'Sistemas robóticos y sistemas autónomos', semestre: 5 },
        { codigo: 'ELEC502', nombre: 'Electrónica de Audio', creditos: 3, descripcion: 'Diseño de circuitos de audio y amplificadores', semestre: 5 },
        { codigo: 'ELEC503', nombre: 'Sistemas de Comunicaciones', creditos: 4, descripcion: 'Redes de comunicación moderna y móviles', semestre: 5 },
        { codigo: 'ELEC504', nombre: 'Proyectos Electrónicos', creditos: 4, descripcion: 'Desarrollo práctico de proyectos electrónicos', semestre: 5 },
        { codigo: 'ELEC505', nombre: 'Gestión de Mantenimiento', creditos: 3, descripcion: 'Planificación de mantenimiento y confiabilidad', semestre: 5 },
        { codigo: 'ELEC506', nombre: 'Normativas Técnicas', creditos: 2, descripcion: 'Normas y estándares de la industria electrónica', semestre: 5 },
        { codigo: 'ELEC601', nombre: 'Proyecto de Ingeniería Electrónica', creditos: 4, descripcion: 'Proyecto integrador de carrera', semestre: 6 },
        { codigo: 'ELEC602', nombre: 'Seguridad Industrial', creditos: 3, descripcion: 'Riesgos y medidas de seguridad en instalaciones', semestre: 6 },
        { codigo: 'ELEC603', nombre: 'Internet de las Cosas', creditos: 4, descripcion: 'Sistemas IoT y conectividad', semestre: 6 },
        { codigo: 'ELEC604', nombre: 'Robótica Avanzada', creditos: 4, descripcion: 'Robots móviles y control avanzado', semestre: 6 },
        { codigo: 'ELEC605', nombre: 'Sistemas de Potencia', creditos: 4, descripcion: 'Transmisión y distribución de energía', semestre: 6 },
        { codigo: 'ELEC606', nombre: 'Optimización de Circuitos', creditos: 3, descripcion: 'Análisis y mejora de diseños electrónicos', semestre: 6 },
      ],
      'ADM-001': [
        { codigo: 'ADM101', nombre: 'Fundamentos de Administración', creditos: 3, descripcion: 'Conceptos básicos de gestión empresarial', semestre: 1 },
        { codigo: 'ECO101', nombre: 'Economía I', creditos: 3, descripcion: 'Microeconomía para la administración', semestre: 1 },
        { codigo: 'MKT101', nombre: 'Marketing', creditos: 3, descripcion: 'Principios de marketing y análisis de mercado', semestre: 1 },
        { codigo: 'CON101', nombre: 'Contabilidad Financiera', creditos: 3, descripcion: 'Registros contables y análisis financiero', semestre: 1 },
        { codigo: 'SOC101', nombre: 'Sociología Empresarial', creditos: 2, descripcion: 'Entorno social y organización empresarial', semestre: 1 },
        { codigo: 'ADMC101', nombre: 'Comunicación Organizacional', creditos: 2, descripcion: 'Comunicación interna y externa en empresas', semestre: 1 },
        { codigo: 'ADM102', nombre: 'Matemáticas para Administración', creditos: 3, descripcion: 'Cálculo y algebra enfocados a negocios', semestre: 2 },
        { codigo: 'ADMSTA101', nombre: 'Estadística I', creditos: 3, descripcion: 'Análisis estadístico para la toma de decisiones', semestre: 2 },
        { codigo: 'ADMLAW101', nombre: 'Derecho Laboral', creditos: 3, descripcion: 'Marco legal del trabajo y relaciones laborales', semestre: 2 },
        { codigo: 'HRM101', nombre: 'Gestión de Recursos Humanos', creditos: 3, descripcion: 'Selección, motivación y desarrollo del personal', semestre: 2 },
        { codigo: 'FIN101', nombre: 'Finanzas I', creditos: 3, descripcion: 'Fundamentos de finanzas y análisis de inversiones', semestre: 2 },
        { codigo: 'ORG101', nombre: 'Comportamiento Organizacional', creditos: 3, descripcion: 'Cultura y dinámicas dentro de las organizaciones', semestre: 2 },
        { codigo: 'MKT102', nombre: 'Marketing Digital', creditos: 3, descripcion: 'Estrategias digitales y redes sociales', semestre: 3 },
        { codigo: 'ADM103', nombre: 'Administración de Operaciones', creditos: 3, descripcion: 'Procesos productivos y gestión de operaciones', semestre: 3 },
        { codigo: 'ECO102', nombre: 'Economía II', creditos: 3, descripcion: 'Macroeconomía y políticas económicas', semestre: 3 },
        { codigo: 'FIN102', nombre: 'Análisis Financiero', creditos: 3, descripcion: 'Interpretación de estados financieros', semestre: 3 },
        { codigo: 'NEG101', nombre: 'Negocios Internacionales', creditos: 3, descripcion: 'Comercio exterior y mercado global', semestre: 3 },
        { codigo: 'LID101', nombre: 'Liderazgo y Gestión', creditos: 3, descripcion: 'Habilidades directivas y motivacionales', semestre: 3 },
        { codigo: 'AUD101', nombre: 'Auditoría', creditos: 3, descripcion: 'Revisión y control de procesos contables', semestre: 4 },
        { codigo: 'LOG102', nombre: 'Logística y Distribución', creditos: 3, descripcion: 'Cadena de suministro y gestión logística', semestre: 4 },
        { codigo: 'STR101', nombre: 'Planificación Estratégica', creditos: 3, descripcion: 'Estrategia empresarial y análisis competitivo', semestre: 4 },
        { codigo: 'CAL201', nombre: 'Gestión de Calidad', creditos: 3, descripcion: 'Modelos y normas de calidad empresarial', semestre: 4 },
        { codigo: 'ADMEMP101', nombre: 'Emprendimiento', creditos: 3, descripcion: 'Creación y gestión de nuevos negocios', semestre: 4 },
        { codigo: 'RSE101', nombre: 'Responsabilidad Social', creditos: 2, descripcion: 'Sostenibilidad y ética empresarial', semestre: 4 },
        { codigo: 'ADM104', nombre: 'Innovación Empresarial', creditos: 3, descripcion: 'Técnicas para innovar en la organización', semestre: 5 },
        { codigo: 'ADMPROY101', nombre: 'Gestión de Proyectos', creditos: 3, descripcion: 'Planeación y seguimiento de proyectos empresariales', semestre: 5 },
        { codigo: 'SUST101', nombre: 'Desarrollo Sustentable', creditos: 3, descripcion: 'Negocios sostenibles y medio ambiente', semestre: 5 },
        { codigo: 'ADMSIG101', nombre: 'Sistemas de Información', creditos: 3, descripcion: 'Herramientas para la gestión de la información', semestre: 5 },
        { codigo: 'CAM101', nombre: 'Gestión del Cambio', creditos: 3, descripcion: 'Implementación de cambios organizacionales', semestre: 5 },
        { codigo: 'ETH101', nombre: 'Ética Empresarial', creditos: 2, descripcion: 'Valores y responsabilidad en los negocios', semestre: 5 },
        { codigo: 'GOB101', nombre: 'Gobernanza Corporativa', creditos: 3, descripcion: 'Estructura y control de las empresas', semestre: 6 },
        { codigo: 'EVT101', nombre: 'Organización de Eventos', creditos: 2, descripcion: 'Diseño y planificación de eventos corporativos', semestre: 6 },
        { codigo: 'ADMEC101', nombre: 'Comercio Electrónico', creditos: 3, descripcion: 'Modelos de negocio en línea y e-commerce', semestre: 6 },
        { codigo: 'LID201', nombre: 'Liderazgo Avanzado', creditos: 3, descripcion: 'Liderazgo estratégico y desarrollo de equipos', semestre: 6 },
        { codigo: 'FIN201', nombre: 'Finanzas Corporativas', creditos: 3, descripcion: 'Decisiones financieras en empresas grandes', semestre: 6 },
        { codigo: 'ADMDIR101', nombre: 'Dirección Estratégica', creditos: 4, descripcion: 'Visión y dirección de empresas competitivas', semestre: 6 },
      ],
      'PSI-001': generateCareerSubjects('PSI', 'Psicología Organizacional', [
        ['Introducción a la Psicología', 'Psicología del Desarrollo', 'Neurociencias', 'Métodos de Investigación', 'Ética Profesional', 'Comunicación Interpersonal'],
        ['Psicología Social', 'Evaluación Psicológica', 'Psicología Educativa', 'Psicopatología', 'Psicología Organizacional', 'Redacción Académica'],
        ['Psicología del Trabajo', 'Psicología de la Salud', 'Entrevista Clínica', 'Psicología del Aprendizaje', 'Herramientas de Intervención', 'Estadística para Psicología'],
        ['Psicoterapia de Grupo', 'Psicología Positiva', 'Intervención en Crisis', 'Neuropsicología Básica', 'Psicología de las Organizaciones', 'Psicología del Deporte'],
        ['Gestión del Talento Humano', 'Evaluación de Programas Psicológicos', 'Psicología Comunitaria', 'Psicología del Consumo', 'Psicología Forense', 'Técnicas de Coaching'],
        ['Proyecto de Intervención Psicológica', 'Ética y Deontología Profesional', 'Planificación de Servicios Psicológicos', 'Evaluación Psicosocial', 'Comunicación Organizacional', 'Sistemas de Apoyo Psicológico'],
      ]),
      'DIS-001': generateCareerSubjects('DIS', 'Diseño Gráfico', [
        ['Fundamentos del Diseño', 'Dibujo Técnico', 'Tipografía I', 'Historia del Diseño', 'Comunicación Visual', 'Fotografía Básica'],
        ['Tipografía II', 'Color y Composición', 'Diseño Editorial', 'Dibujo Digital', 'Sistemas de Información Visual', 'Producción Gráfica'],
        ['Diseño de Identidad', 'Interacción Humano-Computadora', 'Ilustración Digital', 'Diseño Web', 'Herramientas de Prototipado', 'Marketing Visual'],
        ['Empaques y Señalética', 'Motion Graphics', 'Diseño de publicaciones', 'Diseño de Experiencias', 'Narrativa Visual', 'Investigación de Usuario'],
        ['Producción Audiovisual', 'Diseño Editorial Avanzado', 'Branding Estratégico', 'Gestión de Proyectos Creativos', 'Accesibilidad en Diseño', 'Portafolio Profesional'],
        ['Proyecto de Diseño Integrado', 'Tendencias de Diseño', 'Dirección de Arte', 'Estrategias de Comunicación Visual', 'Emprendimiento Creativo', 'Ética en el Diseño'],
      ]),
      'COU-001': generateCareerSubjects('COU', 'Contaduría Pública', [
        ['Contabilidad Básica', 'Matemáticas Financieras', 'Economía Introductoria', 'Derecho Comercial', 'Comunicación Empresarial', 'Sistemas Contables'],
        ['Contabilidad Intermedia', 'Análisis Financiero', 'Impuestos I', 'Costos y Presupuestos', 'Auditoría Básica', 'Estadística para Negocios'],
        ['Contabilidad de Costos', 'Finanzas Corporativas', 'Impuestos II', 'Derecho Laboral', 'Control Interno', 'Tecnologías Contables'],
        ['Auditoría Financiera', 'Planeación Fiscal', 'Contabilidad Gerencial', 'Gestión de Tesorería', 'Normas Internacionales', 'Ética Profesional'],
        ['Evaluación de Proyectos', 'Presupuestos Avanzados', 'Auditoría de Sistemas', 'Contabilidad de Sociedades', 'Gestión de Riesgos', 'Responsabilidad Social'],
        ['Proyecto de Contaduría', 'Auditoría Forense', 'Normas de Información Financiera', 'Control de Gestión', 'Estrategia Fiscal', 'Tecnología y Auditoría'],
      ]),
    };

    const subjectsByCode = {};
    for (const careerCode of Object.keys(subjectsByCareer)) {
      for (const subjectData of subjectsByCareer[careerCode]) {
        const subject = await createIfNotExist(Subject, { codigo: subjectData.codigo }, {
          codigo: subjectData.codigo,
          nombre: subjectData.nombre,
          creditos: subjectData.creditos,
          descripcion: subjectData.descripcion,
          id_carrera: careerCodeToId[careerCode],
        });

        if (!subject.id_carrera) {
          await subject.update({ id_carrera: careerCodeToId[careerCode] });
        }

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

    const subjectPrerequisites = {
      PROG102: 'PROG101',
      DAT101: 'PROG102',
      BD101: 'DAT101',
      ADS101: 'PROG102',
      ARQ101: 'ADS101',
      ELEC203: 'ELEC101',
      ELEC301: 'ELEC203',
      ELEC404: 'ELEC205',
      ELEC601: 'ELEC504',
      FIN102: 'FIN101',
      AUD101: 'CON101',
      STR101: 'ADM103',
      ADMPROY101: 'ADMEMP101',
      FIN201: 'FIN102',
      PSI203: 'PSI102',
      PSI304: 'PSI203',
      PSI505: 'PSI404',
      DIS203: 'DIS102',
      DIS404: 'DIS303',
      COU203: 'COU102',
      COU404: 'COU303',
    };

    for (const [subjectCode, prereqCode] of Object.entries(subjectPrerequisites)) {
      const subject = subjectsByCode[subjectCode];
      const prereq = subjectsByCode[prereqCode];
      if (subject && prereq) {
        await subject.update({ id_prerequisito: prereq.id });
      }
    }

    const periodsData = [
      { codigo: '2024-1', fecha_inicio: '2024-02-01', fecha_fin: '2024-06-30', estado: true },
      { codigo: '2024-2', fecha_inicio: '2024-08-01', fecha_fin: '2024-12-20', estado: true },
      { codigo: '2025-1', fecha_inicio: '2025-02-01', fecha_fin: '2025-06-30', estado: true },
      { codigo: '2025-2', fecha_inicio: '2025-08-01', fecha_fin: '2025-12-20', estado: true },
      { codigo: '2026-1', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-30', estado: true },
      { codigo: '2026-2', fecha_inicio: '2026-08-01', fecha_fin: '2026-12-20', estado: true },
    ];

    const periods = {};
    for (const periodData of periodsData) {
      const period = await createIfNotExist(AcademicPeriod, { codigo: periodData.codigo }, periodData);
      periods[periodData.codigo] = period;
    }

    const adminUser = await createUser({
      nombres: 'Administrador',
      apellido_paterno: 'Sistema',
      apellido_materno: 'Central',
      email: 'admin@sistema.com',
      nombre_usuario: 'admin',
      contrasena: 'Admin1234',
      id_rol: adminRole.id,
    });

    const teachersData = [
      { nombres: 'Juan', apellido_paterno: 'Pérez', apellido_materno: 'García', email: 'juan.perez@universidad.edu', nombre_usuario: 'docente1', contrasena: 'Docente123', especialidad: 'Matemáticas', carreras: ['ING-001'], especialidades: ['Cálculo y Álgebra Lineal', 'Matemática Discreta'] },
      { nombres: 'María', apellido_paterno: 'Gómez', apellido_materno: 'Sánchez', email: 'maria.gomez@universidad.edu', nombre_usuario: 'docente2', contrasena: 'Docente123', especialidad: 'Electrónica', carreras: ['ELEC-001'], especialidades: ['Circuitos Analógicos', 'Sistemas de Control'] },
      { nombres: 'Carlos', apellido_paterno: 'Ruiz', apellido_materno: 'Vargas', email: 'carlos.ruiz@universidad.edu', nombre_usuario: 'docente3', contrasena: 'Docente123', especialidad: 'Administración', carreras: ['ADM-001'], especialidades: ['Finanzas', 'Gestión de Operaciones'] },
      { nombres: 'Laura', apellido_paterno: 'Sánchez', apellido_materno: 'Molina', email: 'laura.sanchez@universidad.edu', nombre_usuario: 'docente4', contrasena: 'Docente123', especialidad: 'Programación', carreras: ['ING-001', 'ELEC-001'], especialidades: ['Desarrollo de Software', 'Microcontroladores'] },
      { nombres: 'Marcos', apellido_paterno: 'Vega', apellido_materno: 'Luna', email: 'marcos.vega@universidad.edu', nombre_usuario: 'docente5', contrasena: 'Docente123', especialidad: 'Redes', carreras: ['ING-001', 'ELEC-001'], especialidades: ['Redes de Computadoras', 'Telecomunicaciones'] },
      { nombres: 'Valentina', apellido_paterno: 'Morales', apellido_materno: 'Cruz', email: 'valentina.morales@universidad.edu', nombre_usuario: 'docente6', contrasena: 'Docente123', especialidad: 'Gestión Humana', carreras: ['ADM-001'], especialidades: ['Recursos Humanos', 'Liderazgo'] },
      { nombres: 'Diego', apellido_paterno: 'Ramos', apellido_materno: 'Flores', email: 'diego.ramos@universidad.edu', nombre_usuario: 'docente7', contrasena: 'Docente123', especialidad: 'Análisis de Datos', carreras: ['ING-001', 'ADM-001'], especialidades: ['Big Data', 'Data Analytics'] },
      { nombres: 'Fernanda', apellido_paterno: 'Herrera', apellido_materno: 'Ortiz', email: 'fernanda.herrera@universidad.edu', nombre_usuario: 'docente8', contrasena: 'Docente123', especialidad: 'Calidad', carreras: ['ADM-001', 'ELEC-001'], especialidades: ['Gestión de Calidad', 'Seguridad Industrial'] },
      { nombres: 'Ana', apellido_paterno: 'Paredes', apellido_materno: 'Castillo', email: 'ana.paredes@universidad.edu', nombre_usuario: 'docente9', contrasena: 'Docente123', especialidad: 'Psicología', carreras: ['PSI-001'], especialidades: ['Psicología Organizacional', 'Psicología del Trabajo'] },
      { nombres: 'Sofía', apellido_paterno: 'Díaz', apellido_materno: 'Montoya', email: 'sofia.diaz@universidad.edu', nombre_usuario: 'docente10', contrasena: 'Docente123', especialidad: 'Diseño', carreras: ['DIS-001'], especialidades: ['Diseño Editorial', 'Tipografía'] },
      { nombres: 'Andrés', apellido_paterno: 'Cano', apellido_materno: 'Benítez', email: 'andres.cano@universidad.edu', nombre_usuario: 'docente11', contrasena: 'Docente123', especialidad: 'Contabilidad', carreras: ['COU-001'], especialidades: ['Contabilidad Financiera', 'Auditoría'] },
    ];

    const teachers = [];
    for (const teacher of teachersData) {
      const teacherUser = await createUser({
        nombres: teacher.nombres,
        apellido_paterno: teacher.apellido_paterno,
        apellido_materno: teacher.apellido_materno,
        email: teacher.email,
        nombre_usuario: teacher.nombre_usuario,
        contrasena: teacher.contrasena,
        id_rol: teacherRole.id,
        teacherData: {
          especialidad: teacher.especialidad,
          telefono: `555-${1000 + teachers.length}`,
        },
      });
      teachers.push(teacherUser);

      for (const careerCode of teacher.carreras) {
        await createIfNotExist(TeacherCareer, {
          id_docente: teacherUser.id,
          id_carrera: careers[careerCode].id,
        }, {
          id_docente: teacherUser.id,
          id_carrera: careers[careerCode].id,
          licenciatura: careers[careerCode].nombre,
        });
      }

      for (const especialidad of teacher.especialidades) {
        const careerCode = teacher.carreras[0];
        await createIfNotExist(TeacherSpecialty, {
          id_docente: teacherUser.id,
          id_carrera: careers[careerCode].id,
          especialidad,
        }, {
          id_docente: teacherUser.id,
          id_carrera: careers[careerCode].id,
          especialidad,
        });
      }
    }

    const studentUsers = [];
    const careerCodes = Object.keys(careers);
    const studentCount = careerCodes.length * 10;
    for (let i = 0; i < studentCount; i += 1) {
      const careerCode = careerCodes[Math.floor(i / 10)];
      const studentData = buildStudentUser(i, careerCode, careers[careerCode].id, pensums[careerCode].id);
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
      studentUsers.push(studentUser);
    }

    const courseSections = ['A', 'B', 'C'];
    const classroomTemplates = ['A101', 'A102', 'B201', 'B202', 'C301', 'C303', 'D401', 'D404'];
    const periodOrder = ['2024-1', '2024-2', '2025-1', '2025-2', '2026-1', '2026-2'];
    const courses = [];

    const teacherMap = {
      'ING-001': [teachers[0], teachers[3], teachers[4], teachers[6]],
      'ELEC-001': [teachers[1], teachers[3], teachers[4], teachers[7]],
      'ADM-001': [teachers[2], teachers[5], teachers[6], teachers[7]],
      'PSI-001': [teachers[8], teachers[0], teachers[6]],
      'DIS-001': [teachers[9], teachers[3], teachers[4]],
      'COU-001': [teachers[10], teachers[2], teachers[5]],
    };

    let courseIndex = 0;
    for (const careerCode of Object.keys(subjectsByCareer)) {
      const careerIndex = Object.keys(subjectsByCareer).indexOf(careerCode);
      for (const subject of subjectsByCareer[careerCode]) {
        for (let idx = 0; idx < 3; idx += 1) {
          const periodCode = periodOrder[(subject.semestre - 1 + idx) % periodOrder.length];
          const section = courseSections[idx % courseSections.length];
          const courseCode = `${careerCode.split('-')[0]}-${subject.codigo}-${section}`;
          const teacher = teacherMap[careerCode][idx % teacherMap[careerCode].length];
          const schedule = schedulesForCourse[(careerIndex * 18 + subject.semestre * 3 + idx) % schedulesForCourse.length];
          const course = await createIfNotExist(Course, {
            codigo_grupo: `${courseCode}-${periodCode}`,
            id_materia: subjectsByCode[subject.codigo].id,
            id_periodo_academico: periods[periodCode].id,
            id_docente: teacher.id,
            id_administrador: adminUser.id,
          }, {
            cupo_maximo: 30,
            estado: true,
          });

          await createIfNotExist(Schedule, {
            id_curso: course.id,
            dia_semana: schedule.dia_semana,
            hora_inicio: schedule.hora_inicio,
            hora_fin: schedule.hora_fin,
            aula: classroomTemplates[courseIndex % classroomTemplates.length],
          }, {});

          courses.push({ course, materia: subjectsByCode[subject.codigo], careerCode, schedule });
          courseIndex += 1;
        }
      }
    }

    const studentEnrollments = [];
    const coursesByCareer = Object.keys(careers).reduce((acc, careerCode) => {
      acc[careerCode] = courses.filter((item) => item.careerCode === careerCode);
      return acc;
    }, {});

    for (const [studentIndex, student] of studentUsers.entries()) {
      const studentProfile = await Student.findOne({ where: { id: student.id } });
      const careerCode = Object.keys(careerCodeToId).find((code) => careerCodeToId[code] === studentProfile.id_carrera);
      const availableCourses = coursesByCareer[careerCode] || [];
      const careerStudentIndex = studentIndex % 10;
      const currentSemester = Math.min(6, 2 + Math.floor(careerStudentIndex / 2));
      const completedSlots = availableCourses.filter((item) => item.materia.semestre < currentSemester);
      const passedSubjects = new Set();

      const completedCount = 1 + Math.floor(Math.random() * 3);
      const completedCourses = completedSlots.sort(() => 0.5 - Math.random()).slice(0, completedCount);
      for (const completed of completedCourses) {
        const enrollment = await createIfNotExist(Enrollment, {
          id_estudiante: student.id,
          id_curso: completed.course.id,
        }, {
          estado: 'Aprobado',
          fecha_inscripcion: new Date().toISOString().slice(0, 10),
        });
        await createIfNotExist(Grade, {
          id_inscripcion: enrollment.id,
        }, {
          nota: 70 + Math.floor(Math.random() * 26),
          observacion: 'Aprobado',
          fecha_registro: new Date().toISOString().slice(0, 10),
          id_docente: completed.course.id_docente,
        });
        passedSubjects.add(completed.materia.id);
      }

      const desiredCount = 5 + Math.floor(Math.random() * 3);
      const selectedSchedules = [];
      const selectedCourseIds = new Set();
      const sortedCandidates = availableCourses
        .filter((item) => item.materia.semestre <= currentSemester)
        .sort((a, b) => a.materia.semestre - b.materia.semestre || a.course.id - b.course.id);

      for (const candidate of sortedCandidates) {
        if (selectedCourseIds.size >= desiredCount) break;
        if (candidate.materia.id_prerequisito && !passedSubjects.has(candidate.materia.id_prerequisito)) continue;
        if (courseConflicts(candidate.schedule, selectedSchedules)) continue;
        if (selectedCourseIds.has(candidate.course.id)) continue;

        const enrollment = await createIfNotExist(Enrollment, {
          id_estudiante: student.id,
          id_curso: candidate.course.id,
        }, {
          estado: 'Inscrito',
          fecha_inscripcion: new Date().toISOString().slice(0, 10),
        });
        studentEnrollments.push({ enrollment, course: candidate.course });
        selectedCourseIds.add(candidate.course.id);
        selectedSchedules.push(candidate.schedule);
      }
    }

    for (const { enrollment, course } of studentEnrollments) {
      if (Math.random() < 0.85) {
        const gradeValue = Math.round((50 + Math.random() * 50) * 100) / 100;
        await createIfNotExist(Grade, {
          id_inscripcion: enrollment.id,
        }, {
          nota: gradeValue,
          observacion: gradeValue >= 70 ? 'Aprobado con buen desempeño' : 'Necesita mejorar contenido clave',
          fecha_registro: new Date().toISOString().slice(0, 10),
          id_docente: course.id_docente,
        });
      }
    }

    const notifications = [
      'Tu calificación ha sido actualizada en el curso seleccionado.',
      'Recuerda completar las tareas pendientes antes de la fecha límite.',
      'Se ha publicado el listado de horarios para el próximo periodo.',
      'Se ha notificado un cambio en el aula de tu curso.',
      'Tu inscripción ha sido confirmada.',
    ];

    for (const student of studentUsers.slice(0, 20)) {
      for (let i = 0; i < 2; i += 1) {
        await createIfNotExist(Notification, {
          titulo: `Aviso académico ${i + 1}`,
          id_usuario: student.id,
        }, {
          mensaje: notifications[(student.id + i) % notifications.length],
          estado: i === 0,
          fecha_envio: new Date(Date.now() - i * 86400000).toISOString(),
          id_usuario: student.id,
        });
      }
    }

    for (const teacher of teachers) {
      await createIfNotExist(Notification, {
        titulo: 'Asignación de curso registrada',
        id_usuario: teacher.id,
      }, {
        mensaje: 'Se ha publicado un nuevo curso en tu carga académica para el siguiente periodo.',
        estado: false,
        fecha_envio: new Date().toISOString(),
        id_usuario: teacher.id,
      });
    }

    await createIfNotExist(Notification, {
      titulo: 'Mantenimiento programado',
      id_usuario: adminUser.id,
    }, {
      mensaje: 'El sistema estará en mantenimiento programado este fin de semana.',
      estado: true,
      fecha_envio: new Date().toISOString(),
      id_usuario: adminUser.id,
    });

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
