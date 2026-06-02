const router = require('express').Router();
const reportController = require('../controllers/report.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/subjects-by-career', verifyToken, verifyRole('Administrador'), reportController.subjectsByCareer);
router.get('/grades-by-student/:studentId', verifyToken, verifyRole('Docente', 'Administrador'), reportController.gradesByStudent);
router.get('/grades-by-course/:courseId', verifyToken, verifyRole('Docente', 'Administrador'), reportController.gradesByCourse);
router.get('/academic-history/:studentId', verifyToken, reportController.studentAcademicHistory);
router.get('/enrolled-students/:courseId', verifyToken, verifyRole('Docente', 'Administrador'), reportController.enrolledStudentsByCourse);
router.get('/subjects-by-student/:studentId', verifyToken, reportController.subjectsByStudent);
router.get('/subjects-by-teacher/:teacherId', verifyToken, verifyRole('Docente', 'Administrador'), reportController.subjectsByTeacher);
router.get('/grades-all-subjects/:studentId', verifyToken, reportController.gradesByAllSubjectsStudent);

module.exports = router;
