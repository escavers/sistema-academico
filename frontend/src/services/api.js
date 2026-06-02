import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  profile:  ()     => api.get('/auth/profile'),
};

// ── Users ─────────────────────────────────────
export const usersApi = {
  getAll:         ()         => api.get('/users'),
  getById:        (id)       => api.get(`/users/${id}`),
  update:         (id, data) => api.put(`/users/${id}`, data),
  changePassword: (id, data) => api.put(`/users/${id}/password`, data),
  delete:         (id)       => api.delete(`/users/${id}`),
  assignRole:     (id, data) => api.put(`/users/${id}/role`, data),
};

// ── Courses ───────────────────────────────────
export const coursesApi = {
  getAll:       ()              => api.get('/courses'),
  getById:      (id)            => api.get(`/courses/${id}`),
  create:       (data)          => api.post('/courses', data),
  update:       (id, data)      => api.put(`/courses/${id}`, data),
  delete:       (id)            => api.delete(`/courses/${id}`),
  getByTeacher: (teacherId)     => api.get(`/courses/teacher/${teacherId}`),
  getByStudent: (studentId)     => api.get(`/courses/student/${studentId}`),
};

// ── Enrollments ───────────────────────────────
export const enrollmentsApi = {
  create:      (data)      => api.post('/enrollments', data),
  getByStudent:(studentId) => api.get(`/enrollments/student/${studentId}`),
  getByCourse: (courseId)  => api.get(`/enrollments/course/${courseId}`),
  cancel:      (id)        => api.put(`/enrollments/${id}/cancel`),
};

// ── Grades ────────────────────────────────────
export const gradesApi = {
  create:          (data)          => api.post('/grades', data),
  update:          (id, data)      => api.put(`/grades/${id}`, data),
  getByEnrollment: (enrollmentId)  => api.get(`/grades/enrollment/${enrollmentId}`),
  getByStudent:    (studentId)     => api.get(`/grades/student/${studentId}`),
  getByCourse:     (courseId)      => api.get(`/grades/course/${courseId}`),
};

// ── Notifications ─────────────────────────────
export const notificationsApi = {
  getByUser:     (userId) => api.get(`/notifications/user/${userId}`),
  getUnreadCount:(userId) => api.get(`/notifications/user/${userId}/unread-count`),
  markAsRead:    (id)     => api.put(`/notifications/${id}/read`),
  markAllAsRead: (userId) => api.put(`/notifications/user/${userId}/read-all`),
};

// ── Dashboard ─────────────────────────────────
export const dashboardApi = {
  student: () => api.get('/dashboard/student'),
  teacher: () => api.get('/dashboard/teacher'),
  admin:   () => api.get('/dashboard/admin'),
};

// ── Careers ───────────────────────────────────
export const careersApi = {
  getAll:  ()         => api.get('/careers'),
  getById: (id)       => api.get(`/careers/${id}`),
  create:  (data)     => api.post('/careers', data),
  update:  (id, data) => api.put(`/careers/${id}`, data),
  delete:  (id)       => api.delete(`/careers/${id}`),
};

export const modalitiesApi = {
  getAll: () => api.get('/modalities'),
};

// ── Subjects ──────────────────────────────────
export const subjectsApi = {
  getAll:  ()         => api.get('/subjects'),
  getById: (id)       => api.get(`/subjects/${id}`),
  create:  (data)     => api.post('/subjects', data),
  update:  (id, data) => api.put(`/subjects/${id}`, data),
  delete:  (id)       => api.delete(`/subjects/${id}`),
};

// ── Pensums / Curriculums ─────────────────────
export const pensumsApi = {
  getAll:         ()         => api.get('/pensums'),
  getById:        (id)       => api.get(`/pensums/${id}`),
  create:         (data)     => api.post('/pensums', data),
  update:         (id, data) => api.put(`/pensums/${id}`, data),
  updateSubjects: (id, data) => api.put(`/pensums/${id}/subjects`, data),
  delete:         (id)       => api.delete(`/pensums/${id}`),
};

// ── Academic Periods ──────────────────────────
export const periodsApi = {
  getAll:   ()         => api.get('/academic-periods'),
  getActive:()         => api.get('/academic-periods/active'),
  create:   (data)     => api.post('/academic-periods', data),
  update:   (id, data) => api.put(`/academic-periods/${id}`, data),
};

// ── Reports ───────────────────────────────────
export const reportsApi = {
  subjectsByCareer:       (careerIds = []) => api.get('/reports/subjects-by-career', { params: { careerIds: careerIds.join(',') } }),
  gradesByStudent:        (studentId) => api.get(`/reports/grades-by-student/${studentId}`),
  gradesByCourse:         (courseId)  => api.get(`/reports/grades-by-course/${courseId}`),
  academicHistory:        (studentId) => api.get(`/reports/academic-history/${studentId}`),
  enrolledByCourse:       (courseId)  => api.get(`/reports/enrolled-students/${courseId}`),
  subjectsByStudent:      (studentId) => api.get(`/reports/subjects-by-student/${studentId}`),
  subjectsByTeacher:      (teacherId) => api.get(`/reports/subjects-by-teacher/${teacherId}`),
};

export default api;
