const { Op } = require('sequelize');
const { Attachment, Message, sequelize } = require('../models');
const { lockConversationAccess } = require('../services/groupPermission.service');
const { domainError } = require('../utils/groupPermissions');

const listConversationMedia = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 30);
    const type = req.query.type ?? 'image';
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(page) || page < 1
      || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
      || !Number.isSafeInteger((page - 1) * limit) || !['image', 'video'].includes(type)) {
      throw domainError(400, 'INVALID_MEDIA_QUERY', 'Bộ lọc ảnh/video không hợp lệ.');
    }
    // Serialize with leave/recall to keep membership and the returned snapshot consistent.
    const data = await sequelize.transaction(async (transaction) => {
      await lockConversationAccess(id, req.user.id, transaction);
      const include = [{ model: Message, as: 'message', attributes: [], required: true,
        where: { conversation_id: id, recalled: false } }];
      const query = (kind) => ({ where: { file_type: { [Op.like]: `${kind}/%` } }, include, transaction });
      const images = await Attachment.count(query('image'));
      const videos = await Attachment.count(query('video'));
      const items = await Attachment.findAll({ ...query(type),
        attributes: ['id', 'message_id', 'file_url', 'file_type', 'size', 'thumbnail_url', 'created_at'],
        order: [['id', 'DESC']], limit, offset: (page - 1) * limit,
      });
      const total = type === 'image' ? images : videos;
      return { items, counts: { images, videos }, page, limit, total, has_more: page * limit < total };
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

module.exports = { listConversationMedia };
