const { Notification } = require('../models');

const create = async (req, res, next) => {
  try {
    const { titulo, mensaje, id_usuario } = req.body;
    if (!titulo || !mensaje || !id_usuario) {
      return res.status(400).json({ message: 'titulo, mensaje e id_usuario son requeridos' });
    }
    const notif = await Notification.create({ titulo, mensaje, id_usuario });
    res.status(201).json({ message: 'Notificación creada', notification: notif });
  } catch (error) {
    next(error);
  }
};

const getByUser = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { id_usuario: req.params.userId },
      order: [['fecha_envio', 'DESC']],
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findByPk(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada' });
    await notif.update({ estado: true });
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update({ estado: true }, { where: { id_usuario: req.params.userId } });
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { id_usuario: req.params.userId, estado: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByUser, markAsRead, markAllAsRead, getUnreadCount };
