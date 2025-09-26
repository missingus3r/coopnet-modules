const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { validateObjectId } = require('../utils/validation');
const mongoose = require('mongoose');

// User: Get store (product catalog)
exports.getStore = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    const category = req.query.category || 'all';

    let products = [];
    let totalProducts = 0;
    let categories = [];

    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      let query = { 
        cooperativaId: cooperativaQuery,
        status: 'active',
        isDeleted: false,
        deadlineDate: { $gte: new Date() }
      };

      if (category !== 'all') {
        query.category = category;
      }

      products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      totalProducts = await Product.countDocuments(query);

      // Get categories for filter
      categories = await Product.distinct('category', {
        cooperativaId: cooperativaQuery,
        status: 'active',
        isDeleted: false,
        deadlineDate: { $gte: new Date() }
      });
    }

    const totalPages = Math.ceil(totalProducts / limit);

    res.render('store', {
      title: 'Tienda',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      products,
      categories,
      currentCategory: category,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).render('error', {
      message: 'Error al cargar la tienda',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// User: Get product detail
exports.getProductDetail = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const productId = req.params.id;

    if (!validateObjectId(productId)) {
      return res.status(400).render('error', {
        message: 'ID de producto inválido',
        darkMode: darkMode === 'true'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      cooperativaId,
      status: 'active',
      isDeleted: false
    }).populate('createdBy', 'firstName lastName');

    if (!product) {
      return res.status(404).render('error', {
        message: 'Producto no encontrado',
        darkMode: darkMode === 'true'
      });
    }

    // Check if user has existing orders for this product
    const existingOrder = await Order.findOne({
      userId,
      productId,
      status: { $in: ['pending', 'processing'] },
      isDeleted: false
    });

    res.render('product-detail', {
      title: product.name,
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      product,
      existingOrder
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el producto',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// User: Create order
exports.createOrder = async (req, res) => {
  try {
    const { cooperativaId, userId } = req.query;
    const productId = req.params.id;
    const { quantity, typeQuantities, deliveryAddress, contactPhone, deliveryInstructions } = req.body;

    if (!validateObjectId(productId) || !validateObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const product = await Product.findOne({
      _id: productId,
      cooperativaId,
      status: 'active',
      isDeleted: false,
      deadlineDate: { $gte: new Date() }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado o no disponible' });
    }

    // Check if user already has a pending order for this product
    const existingOrder = await Order.findOne({
      userId,
      productId,
      status: { $in: ['pending', 'processing'] },
      isDeleted: false
    });

    if (existingOrder) {
      return res.status(400).json({ success: false, message: 'Ya tienes un pedido pendiente para este producto' });
    }

    let totalPrice = 0;
    let orderQuantity = 0;
    let processedTypeQuantities = [];

    if (product.hasTypes && typeQuantities) {
      // Handle products with types
      try {
        const parsedTypes = typeof typeQuantities === 'string' ? JSON.parse(typeQuantities) : typeQuantities;
        
        for (const typeOrder of parsedTypes) {
          const productType = product.types.find(t => t.name === typeOrder.typeName);
          if (productType && typeOrder.quantity > 0) {
            processedTypeQuantities.push({
              typeName: typeOrder.typeName,
              typePrice: productType.price,
              quantity: parseInt(typeOrder.quantity)
            });
            totalPrice += productType.price * parseInt(typeOrder.quantity);
            orderQuantity += parseInt(typeOrder.quantity);
          }
        }

        if (processedTypeQuantities.length === 0) {
          return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un tipo de producto' });
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Formato de tipos inválido' });
      }
    } else {
      // Handle regular products
      orderQuantity = parseInt(quantity);
      if (!orderQuantity || orderQuantity < 1) {
        return res.status(400).json({ success: false, message: 'Cantidad inválida' });
      }
      totalPrice = product.price * orderQuantity;
    }

    const orderData = {
      userId,
      productId,
      cooperativaId,
      quantity: orderQuantity,
      totalPrice,
      contactPhone: contactPhone || '',
      deliveryInstructions: deliveryInstructions || ''
    };

    if (processedTypeQuantities.length > 0) {
      orderData.typeQuantities = processedTypeQuantities;
    }

    if (deliveryAddress) {
      orderData.deliveryAddress = {
        street: deliveryAddress.street || '',
        city: deliveryAddress.city || '',
        state: deliveryAddress.state || '',
        postalCode: deliveryAddress.postalCode || '',
        country: 'Uruguay'
      };
    }

    const order = new Order(orderData);
    await order.save();

    res.json({ 
      success: true, 
      message: 'Pedido creado exitosamente',
      orderId: order._id 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error al crear el pedido' });
  }
};

// User: Get my orders
exports.getMyOrders = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';

    let query = { 
      userId,
      cooperativaId,
      isDeleted: false 
    };

    if (status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('productId', 'name productReference image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $match: { userId: userId, cooperativaId: cooperativaId, isDeleted: false }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$totalPrice' }
        }
      }
    ]);

    const orderStats = {
      pending: 0,
      paid: 0,
      delivered: 0,
      cancelled: 0,
      totalSpent: 0
    };

    stats.forEach(stat => {
      orderStats[stat._id] = stat.count;
      if (['paid', 'delivered'].includes(stat._id)) {
        orderStats.totalSpent += stat.total;
      }
    });

    res.render('my-orders', {
      title: 'Mis Pedidos',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      orders,
      orderStats,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      currentStatus: status
    });
  } catch (error) {
    console.error('Error fetching my orders:', error);
    res.status(500).render('error', {
      message: 'Error al cargar tus pedidos',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// User: Get order detail
exports.getOrderDetail = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;
    const orderId = req.params.id;

    if (!validateObjectId(orderId)) {
      return res.status(400).render('error', {
        message: 'ID de pedido inválido',
        darkMode: darkMode === 'true'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
      cooperativaId,
      isDeleted: false
    }).populate('productId', 'name productReference image description');

    if (!order) {
      return res.status(404).render('error', {
        message: 'Pedido no encontrado',
        darkMode: darkMode === 'true'
      });
    }

    res.render('order-detail', {
      title: `Pedido #${order._id.toString().substr(-6)}`,
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: isAdmin === 'true',
      darkMode: darkMode === 'true',
      order
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el detalle del pedido',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// User: Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { cooperativaId, userId } = req.query;
    const orderId = req.params.id;

    if (!validateObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'ID de pedido inválido' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
      cooperativaId,
      isDeleted: false
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Solo se pueden cancelar pedidos pendientes' });
    }

    await Order.findByIdAndUpdate(orderId, {
      status: 'cancelled',
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Pedido cancelado exitosamente' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar el pedido' });
  }
};