const { sequelize, User, Course, Enrollment, Grade, Notification, Subject, Student, Teacher } = require('../models');

const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const enrollmentsCount = await Enrollment.count({
      where: { id_estudiante: studentId, estado: 'Inscrito' },
    });

    const grades = await Grade.findAll({
      include: [{
        model: Enrollment,
        as: 'inscripcion',
        where: { id_estudiante: studentId },
        required: true,
      }],
    });

    const avgGrade = grades.length
      ? (grades.reduce((sum, g) => sum + parseFloat(g.nota), 0) / grades.length).toFixed(2)
      : null;

    const recentNotifications = await Notification.findAll({
      where: { id_usuario: studentId },
      order: [['fecha_envio', 'DESC']],
      limit: 5,
    });

    const currentEnrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId, estado: 'Inscrito' },
      include: [{
        model: Course,
        as: 'curso',
        include: [{ model: Subject, as: 'materia' }],
      }],
      limit: 5,
    });

    res.json({ enrollmentsCount, averageGrade: avgGrade, recentNotifications, currentEnrollments });
  } catch (error) {
    next(error);
  }
};

const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const courses = await Course.findAll({
      where: { id_docente: teacherId, estado: true },
      include: [{ model: Subject, as: 'materia' }],
    });

    const courseIds = courses.map(c => c.id);
    const totalStudents = await Enrollment.count({
      where: { id_curso: courseIds, estado: 'Inscrito' },
    });

    const recentNotifications = await Notification.findAll({
      where: { id_usuario: teacherId },
      order: [['fecha_envio', 'DESC']],
      limit: 5,
    });

    // Add enrollment count to each course
    const coursesWithCount = await Promise.all(
      courses.map(async (c) => {
        const count = await Enrollment.count({ where: { id_curso: c.id, estado: 'Inscrito' } });
        return { ...c.toJSON(), studentCount: count };
      })
    );

    res.json({
      assignedCoursesCount: courses.length,
      totalStudents,
      recentNotifications,
      courses: coursesWithCount,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const [totalUsers, totalCourses, totalEnrollments, totalStudents, totalTeachers] = await Promise.all([
      User.count({ where: { estado: true } }),
      Course.count({ where: { estado: true } }),
      Enrollment.count({ where: { estado: 'Inscrito' } }),
      Student.count(),
      Teacher.count(),
    ]);

    const recentNotifications = await Notification.findAll({
      where: { id_usuario: adminId },
      order: [['fecha_envio', 'DESC']],
      limit: 5,
    });

    res.json({ totalUsers, totalCourses, totalEnrollments, totalStudents, totalTeachers, recentNotifications });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudentDashboard, getTeacherDashboard, getAdminDashboard };
