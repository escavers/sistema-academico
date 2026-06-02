const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = require('./config/database');
const { errorHandler } = require('./middlewares/error.middleware');
const { Modality } = require('./models');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const gradeRoutes = require('./routes/grade.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const careerRoutes = require('./routes/career.routes');
const subjectRoutes = require('./routes/subject.routes');
const curriculumRoutes = require('./routes/curriculum.routes');
const academicPeriodRoutes = require('./routes/academicPeriod.routes');
const reportRoutes = require('./routes/report.routes');
const modalityRoutes = require('./routes/modality.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test DB connection
db.authenticate()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

// Sync models (development only)
require('./models');
const normalizeModalities = async () => {
  try {
    await Modality.findOrCreate({ where: { nombre: 'Semestral' }, defaults: { max_materias_permitidas: 8 } });
    await Modality.findOrCreate({ where: { nombre: 'Anual' }, defaults: { max_materias_permitidas: 8 } });

    const presencial = await Modality.findOne({ where: { nombre: 'Presencial' } });
    if (presencial) await presencial.update({ nombre: 'Semestral' });
    const virtual = await Modality.findOne({ where: { nombre: 'Virtual' } });
    if (virtual) await virtual.update({ nombre: 'Anual' });
  } catch (err) {
    console.error('Failed to normalize modalities:', err);
  }
};

db.sync({ alter: true })
  .then(async () => {
    console.log('Database synchronized');
    await normalizeModalities();
  })
  .catch(err => console.error('Sync error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/pensums', curriculumRoutes);
app.use('/api/academic-periods', academicPeriodRoutes);
app.use('/api/modalities', modalityRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
