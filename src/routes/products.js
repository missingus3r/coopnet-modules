const express = require('express');
const router = express.Router();
const adminProductsController = require('../controllers/adminProductsController');
const { checkModularAuth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(checkModularAuth);

// Admin products routes (require isAdmin=true)
router.get('/', adminProductsController.getProductsDashboard);
router.get('/list', adminProductsController.getProducts);
router.get('/form/:id', adminProductsController.getProductForm);
router.post('/:id', adminProductsController.saveProduct);
router.delete('/:id', adminProductsController.deleteProduct);

// Admin orders routes
router.get('/orders', adminProductsController.getOrders);
router.put('/orders/:id/status', adminProductsController.updateOrderStatus);

module.exports = router;