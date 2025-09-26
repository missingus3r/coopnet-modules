const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { checkModularAuth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(checkModularAuth);

// Public news routes
router.get('/', newsController.getNews);
router.get('/:id', newsController.getNewsDetail);
router.post('/:id/like', newsController.toggleLike);

// Admin news routes
router.get('/admin', newsController.getAdminNews);
router.get('/edit/:id', newsController.getEditNews);
router.post('/:id', newsController.saveNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;