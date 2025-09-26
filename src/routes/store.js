const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { checkModularAuth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(checkModularAuth);

// User store routes
router.get('/', storeController.getStore);
router.get('/product/:id', storeController.getProductDetail);
router.post('/product/:id/order', storeController.createOrder);

// User orders routes
router.get('/my-orders', storeController.getMyOrders);
router.get('/order/:id', storeController.getOrderDetail);
router.put('/order/:id/cancel', storeController.cancelOrder);

module.exports = router;