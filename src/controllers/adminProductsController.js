const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { validateObjectId, toObjectId } = require('../utils/validation');
const { safeCooperativaId, createSafeQuery } = require('../utils/modularHelpers');
const mongoose = require('mongoose');

// Generate unique reference number
function generateReference(type = 'PROD') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${type}-${timestamp}-${random}`;
}

// Admin: Get products dashboard
exports.getProductsDashboard = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    // Handle demo/test IDs by showing empty results but not crashing
    let products = [];
    let orders = [];
    let totalProducts = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = [];

    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      products = await Product.find({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

      orders = await Order.find({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      })
      .populate('userId', 'firstName lastName')
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

      // Statistics
      totalProducts = await Product.countDocuments({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      });

      totalOrders = await Order.countDocuments({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      });

      pendingOrders = await Order.countDocuments({ 
        cooperativaId: cooperativaQuery,
        status: 'pending',
        isDeleted: false 
      });

      totalRevenue = await Order.aggregate([
        {
          $match: {
            cooperativaId: cooperativaQuery,
            status: { $in: ['paid', 'delivered'] },
            isDeleted: false
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' }
          }
        }
      ]);
    }
    // If cooperativaId is not a valid ObjectId, we return empty arrays (demo mode)

    res.render('admin-products', {
      title: 'Gestión de Productos',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      products,
      orders,
      stats: {
        totalProducts,
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0] ? totalRevenue[0].total : 0
      }
    });
  } catch (error) {
    console.error('Error fetching products dashboard:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el panel de productos',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Admin: Get all products
exports.getProducts = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let products = [];
    let totalProducts = 0;

    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      products = await Product.find({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      totalProducts = await Product.countDocuments({ 
        cooperativaId: cooperativaQuery,
        isDeleted: false 
      });
    }

    const totalPages = Math.ceil(totalProducts / limit);

    res.render('admin-products-list', {
      title: 'Lista de Productos',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      products,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).render('error', {
      message: 'Error al cargar los productos',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Admin: Get product form (create/edit)
exports.getProductForm = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    const productId = req.params.id;
    let product = null;

    if (productId && productId !== 'new') {
      if (!validateObjectId(productId)) {
        return res.status(400).render('error', {
          message: 'ID de producto inválido',
          darkMode: darkMode === 'true'
        });
      }

      product = await Product.findOne({
        _id: productId,
        cooperativaId,
        isDeleted: false
      });

      if (!product) {
        return res.status(404).render('error', {
          message: 'Producto no encontrado',
          darkMode: darkMode === 'true'
        });
      }
    }

    res.render('admin-product-form', {
      title: product ? 'Editar Producto' : 'Nuevo Producto',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      product,
      isEdit: !!product
    });
  } catch (error) {
    console.error('Error loading product form:', error);
    res.status(500).render('error', {
      message: 'Error al cargar el formulario',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Admin: Save product (create/update)
exports.saveProduct = async (req, res) => {
  try {
    const { cooperativaId, userId, isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const { 
      name, 
      description, 
      price, 
      deadlineDate, 
      minimumOrdersRequired,
      hasTypes,
      types,
      stock,
      units,
      category,
      specifications
    } = req.body;

    const productId = req.params.id;

    const productData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      deadlineDate: new Date(deadlineDate),
      minimumOrdersRequired: parseInt(minimumOrdersRequired) || 0,
      hasTypes: hasTypes === 'true',
      stock: parseInt(stock) || 0,
      units: units || 'unidad',
      category: category || 'otros',
      specifications: specifications ? specifications.trim() : '',
      updatedAt: new Date()
    };

    // Handle types if product has types
    if (productData.hasTypes && types) {
      try {
        const parsedTypes = typeof types === 'string' ? JSON.parse(types) : types;
        productData.types = parsedTypes.map(type => ({
          name: type.name.trim(),
          price: parseFloat(type.price)
        }));
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Formato de tipos inválido' });
      }
    } else {
      productData.types = [];
    }

    if (productId && productId !== 'new') {
      // Update existing product
      const existingProduct = await Product.findOne({
        _id: productId, 
        cooperativaId,
        isDeleted: false 
      });

      if (!existingProduct) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      await Product.findOneAndUpdate(
        { 
          _id: productId, 
          cooperativaId,
          isDeleted: false 
        },
        productData,
        { new: true, runValidators: true }
      );

      res.json({ success: true, message: 'Producto actualizado exitosamente' });
    } else {
      // Create new product
      productData.cooperativaId = cooperativaId;
      productData.createdBy = userId;
      productData.productReference = generateReference('PROD');

      const product = new Product(productData);
      await product.save();

      res.json({ success: true, message: 'Producto creado exitosamente', productId: product._id });
    }
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ success: false, message: 'Error al guardar el producto' });
  }
};

// Admin: Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { cooperativaId, isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const productId = req.params.id;

    if (!validateObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'ID de producto inválido' });
    }

    const product = await Product.findOneAndUpdate(
      { 
        _id: productId, 
        cooperativaId,
        isDeleted: false 
      },
      { 
        isDeleted: true,
        updatedAt: new Date()
      }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto' });
  }
};

// Admin: Get all orders
exports.getOrders = async (req, res) => {
  try {
    const { cooperativaId, cooperativaName, userName, userId, isAdmin, darkMode } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).render('error', {
        message: 'No tienes permisos para acceder a esta página',
        darkMode: darkMode === 'true'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';

    let query = { 
      cooperativaId,
      isDeleted: false 
    };

    if (status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName')
      .populate('productId', 'name productReference')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render('admin-orders', {
      title: 'Gestión de Pedidos',
      cooperativaName,
      userName,
      userId,
      cooperativaId,
      isAdmin: true,
      darkMode: darkMode === 'true',
      orders,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      currentStatus: status
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).render('error', {
      message: 'Error al cargar los pedidos',
      error: error.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { cooperativaId, isAdmin } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const orderId = req.params.id;
    const { status, notes } = req.body;

    if (!validateObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'ID de pedido inválido' });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Set payment date if marking as paid
    if (status === 'paid') {
      updateData.paymentDate = new Date();
    }

    // Set delivery date if marking as delivered
    if (status === 'delivered') {
      updateData.deliveryDate = new Date();
    }

    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId, 
        cooperativaId,
        isDeleted: false 
      },
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    res.json({ success: true, message: 'Estado del pedido actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el pedido' });
  }
};