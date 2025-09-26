const News = require('../models/News');
const User = require('../models/User');
const { validateObjectId } = require('../utils/validation');
const mongoose = require('mongoose');

// Get all published news for users
exports.getNews = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Include both cooperative news and superadmin news (global + targeted)
    let query = {
      $or: [
        // Global superadmin news
        { createdBy: 'superadmin', isGlobal: true, status: 'published' }
      ],
      isDeleted: false
    };

    // Add cooperative-specific queries only if cooperativaId is valid
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      query.$or.push(
        // Cooperative admin news
        { cooperativaId: cooperativaQuery, status: 'published' },
        // Targeted superadmin news
        { createdBy: 'superadmin', targetCooperativas: cooperativaQuery, status: 'published' }
      );
    }

    const news = await News.find(query)
      .populate('author', 'firstName lastName')
      .sort({ 
        publishedAt: -1, 
        createdAt: -1 
      })
      .skip(skip)
      .limit(limit);

    const totalNews = await News.countDocuments(query);
    const totalPages = Math.ceil(totalNews / limit);

    res.render('news', {
      title: 'Novedades',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      news,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).render('error', {
      message: 'Error al cargar las novedades',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Get single news post
exports.getNewsDetail = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const newsId = req.params.id;

    if (!validateObjectId(newsId)) {
      return res.status(400).render('error', {
        message: 'ID de noticia inválido',
        darkMode: darkMode === 'true'
      });
    }

    // Include both cooperative news and superadmin news (global + targeted)
    let query = {
      _id: newsId,
      $or: [
        // Global superadmin news
        { createdBy: 'superadmin', isGlobal: true }
      ],
      status: 'published',
      isDeleted: false
    };

    // Add cooperative-specific queries only if cooperativaId is valid
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      query.$or.push(
        // Cooperative admin news
        { cooperativaId: cooperativaQuery },
        // Targeted superadmin news
        { createdBy: 'superadmin', targetCooperativas: cooperativaQuery }
      );
    }

    const news = await News.findOne(query).populate('author', 'firstName lastName');

    if (!news) {
      return res.status(404).render('error', {
        message: 'Novedad no encontrada',
        darkMode: darkMode === 'true'
      });
    }

    // Increment view count
    await News.findByIdAndUpdate(newsId, { $inc: { views: 1 } });

    // Check if user has liked this post
    const hasLiked = news.likes.some(like => like.userId.toString() === userId.toString());

    res.render('news-detail', {
      title: news.title,
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      news,
      hasLiked
    });
  } catch (error) {
    console.error('Error fetching news detail:', error);
    res.status(500).render('error', {
      message: 'Error al cargar la novedad',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Toggle like on news post
exports.toggleLike = async (req, res) => {
  try {
    const { cooperativaId, userId } = req.query;
    const newsId = req.params.id;

    if (!validateObjectId(newsId) || !validateObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    // Include both cooperative news and superadmin news (global + targeted)
    let query = {
      _id: newsId,
      $or: [
        // Global superadmin news
        { createdBy: 'superadmin', isGlobal: true }
      ],
      status: 'published',
      isDeleted: false
    };

    // Add cooperative-specific queries only if cooperativaId is valid
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      query.$or.push(
        // Cooperative admin news
        { cooperativaId: cooperativaQuery },
        // Targeted superadmin news
        { createdBy: 'superadmin', targetCooperativas: cooperativaQuery }
      );
    }

    const news = await News.findOne(query);

    if (!news) {
      return res.status(404).json({ success: false, message: 'Novedad no encontrada' });
    }

    const existingLikeIndex = news.likes.findIndex(like => like.userId.toString() === userId.toString());

    if (existingLikeIndex > -1) {
      // Remove like
      news.likes.splice(existingLikeIndex, 1);
      await news.save();
      res.json({ 
        success: true, 
        liked: false, 
        likeCount: news.likes.length,
        message: 'Like removido' 
      });
    } else {
      // Add like
      news.likes.push({ userId, likedAt: new Date() });
      await news.save();
      res.json({ 
        success: true, 
        liked: true, 
        likeCount: news.likes.length,
        message: 'Like agregado' 
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Error al procesar el like' });
  }
};

// Admin functions

// Get all news for admin management
exports.getAdminNews = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let news = [];
    let totalNews = 0;

    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      news = await News.find({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      })
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      totalNews = await News.countDocuments({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      });
    }

    const totalPages = Math.ceil(totalNews / limit);

    res.render('news-admin', {
      title: 'Gestión de Novedades',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      news,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Error fetching admin news:', error);
    res.status(500).render('error', {
      message: 'Error al cargar las novedades',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Get single news for editing
exports.getEditNews = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    const newsId = req.params.id;

    let news = null;
    if (newsId !== 'new') {
      if (validateObjectId(newsId) && validateObjectId(cooperativaId)) {
        news = await News.findOne({
          _id: newsId,
          cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
          isDeleted: false
        });
      }
    }

    if (newsId !== 'new' && !news) {
      return res.status(404).render('error', {
        message: 'Novedad no encontrada',
        darkMode: darkMode === 'true'
      });
    }

    res.render('news-edit', {
      title: news ? 'Editar Novedad' : 'Nueva Novedad',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      news,
      isEdit: !!news
    });
  } catch (error) {
    console.error('Error fetching news for edit:', error);
    res.status(500).render('error', {
      message: 'Error al cargar la novedad',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Create or update news
exports.saveNews = async (req, res) => {
  try {
    const { cooperativaId, userId, isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { title, content, excerpt, status, priority, tags, action } = req.body;
    const newsId = req.params.id;

    // Determine the status based on action or form field
    let finalStatus = 'draft';
    if (action === 'publish') {
      finalStatus = 'published';
    } else if (status && typeof status === 'string') {
      finalStatus = status;
    }

    const newsData = {
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt ? excerpt.trim() : '',
      status: finalStatus,
      priority: priority || 'normal',
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
      updatedAt: new Date()
    };

    if (newsId && newsId !== 'new') {
      // Update existing news
      if (!validateObjectId(newsId) || !validateObjectId(cooperativaId)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      const existingNews = await News.findOne({
        _id: newsId, 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      });

      if (!existingNews) {
        return res.status(404).json({ success: false, message: 'Novedad no encontrada' });
      }

      // Set publishedAt if status is changing to published
      if (finalStatus === 'published' && existingNews.status !== 'published' && !existingNews.publishedAt) {
        newsData.publishedAt = new Date();
      }

      await News.findOneAndUpdate(
        { 
          _id: newsId, 
          cooperativaId: cooperativaQuery,
          isDeleted: false 
        },
        newsData,
        { new: true, runValidators: true }
      );

      res.json({ success: true, message: 'Novedad actualizada exitosamente' });
    } else {
      // Create new news
      if (!validateObjectId(userId) || !validateObjectId(cooperativaId)) {
        return res.status(400).json({ success: false, message: 'ID inválido' });
      }
      
      newsData.author = userId;
      newsData.cooperativaId = cooperativaId;

      const news = new News(newsData);
      await news.save();

      res.json({ success: true, message: 'Novedad creada exitosamente', newsId: news._id });
    }
  } catch (error) {
    console.error('Error saving news:', error);
    res.status(500).json({ success: false, message: 'Error al guardar la novedad' });
  }
};

// Delete news (soft delete)
exports.deleteNews = async (req, res) => {
  try {
    const { cooperativaId, isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const newsId = req.params.id;

    if (!validateObjectId(newsId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const news = await News.findOneAndUpdate(
      { 
        _id: newsId, 
        cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
        isDeleted: false 
      },
      { 
        isDeleted: true,
        updatedAt: new Date()
      }
    );

    if (!news) {
      return res.status(404).json({ success: false, message: 'Novedad no encontrada' });
    }

    res.json({ success: true, message: 'Novedad eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar la novedad' });
  }
};