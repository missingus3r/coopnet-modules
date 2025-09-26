const { Commission, User } = require('../models');
const { getUserId, getCooperativaId, isAdmin } = require('../utils/authUtils');
const { ensureCooperativaExists, ensureUserExists } = require('../utils/dbHelpers');
const { validateObjectId } = require('../utils/validation');
const mongoose = require('mongoose');

// Listar comisiones para socios
exports.listCommissions = async (req, res) => {
  try {
    // Get cooperativa and user info from query params or session
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const userId = getUserId(req) || req.session?.user?._id;
    const userName = req.query.userName || req.session?.user?.firstName || 'Usuario';
    const cooperativaName = req.query.cooperativaName || 'Cooperativa';
    const userIsAdmin = isAdmin(req) || req.session?.user?.role === 'cooperativa-admin';
    
    if (!cooperativaId) return res.redirect('/');
    
    // Ensure cooperativa and user exist in database
    await ensureCooperativaExists(cooperativaId, cooperativaName);
    
    if (userId) {
      const userRole = userIsAdmin ? 'cooperativa-admin' : 'user';
      await ensureUserExists(userId, userName, cooperativaId, userRole);
    }
    let commissions = [];
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      commissions = await Commission.find({ cooperativaId: cooperativaQuery })
        .populate('members.userId', 'firstName lastName')
        .lean();
    }
    // Build user object for view
    const user = req.modularUser || req.session?.user || {
      _id: userId,
      firstName: userName.split(' ')[0],
      lastName: userName.split(' ').slice(1).join(' '),
      cooperativaId: cooperativaId,
      role: userIsAdmin ? 'cooperativa-admin' : 'user'
    };
    
    res.render('commissions', {
      title: 'Comisiones',
      activePage: 'commissions',
      user,
      commissions,
      users: [],
      isAdmin: false
    });
  } catch (error) {
    console.error('Error listing commissions:', error);
    res.status(500).send('Error al cargar las comisiones');
  }
};
// Eliminar comisión (admin only)
exports.deleteCommission = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para eliminar comisiones');
      return res.redirect('/commissions');
    }
    
    const { id } = req.params;
    await Commission.findByIdAndDelete(id);
    req.flash('success_msg', 'Comisión eliminada exitosamente');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error deleting commission:', error);
    req.flash('error_msg', 'Error al eliminar la comisión');
    res.redirect('/admin/commissions');
  }
};

// Vista admin de comisiones
exports.getAdminCommissions = async (req, res) => {
  try {
    // Get cooperativa and user info from query params or session
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const userId = getUserId(req) || req.session?.user?._id;
    const userName = req.query.userName || req.session?.user?.firstName || 'Usuario';
    const cooperativaName = req.query.cooperativaName || 'Cooperativa';
    const userIsAdmin = isAdmin(req) || req.session?.user?.role === 'cooperativa-admin';
    
    if (!cooperativaId) return res.redirect('/');
    
    // Ensure cooperativa and user exist in database
    await ensureCooperativaExists(cooperativaId, cooperativaName);
    
    if (userId) {
      await ensureUserExists(userId, userName, cooperativaId, 'cooperativa-admin');
    }
    let commissions = [];
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      commissions = await Commission.find({ cooperativaId: cooperativaQuery })
        .populate('members.userId', 'firstName lastName')
        .lean();
    }
    let users = [];
    if (validateObjectId(cooperativaId)) {
      users = await User.find({ 
        cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
        role: { $ne: 'cooperativa-admin' } // Exclude admin from member lists
      })
        .select('firstName lastName')
        .lean();
    }
    // Build user object for view
    const user = req.modularUser || req.session?.user || {
      _id: userId,
      firstName: userName.split(' ')[0],
      lastName: userName.split(' ').slice(1).join(' '),
      cooperativaId: cooperativaId,
      role: 'cooperativa-admin'
    };
    
    res.render('commissions', {
      title: 'Gestión de Comisiones',
      activePage: 'admin-commissions',
      user,
      commissions,
      users,
      isAdmin: true
    });
  } catch (error) {
    console.error('Error admin commissions:', error);
    req.flash('error_msg', 'Error cargando comisiones');
    res.redirect('/admin-gestion');
  }
};

// Crear nueva comisión
exports.createCommission = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para crear comisiones');
      return res.redirect('/commissions');
    }
    
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const { name, description, stage } = req.body;
    
    // Check if a commission with the same name already exists
    let existingCommission = null;
    if (validateObjectId(cooperativaId)) {
      existingCommission = await Commission.findOne({ 
        name: name.trim(), 
        cooperativaId: new mongoose.Types.ObjectId(cooperativaId),
        isDeleted: false 
      });
    }
    
    if (existingCommission) {
      req.flash('error_msg', 'Ya existe una comisión con ese nombre');
      return res.redirect('/admin/commissions');
    }
    
    if (validateObjectId(cooperativaId)) {
      await Commission.create({ 
        name: name.trim(), 
        description: description ? description.trim() : '', 
        stage, 
        cooperativaId: new mongoose.Types.ObjectId(cooperativaId), 
        members: [] 
      });
    } else {
      throw new Error('ID de cooperativa inválido');
    }
    req.flash('success_msg', 'Comisión creada exitosamente');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error creating commission:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000 || error.name === 'MongoServerError') {
      req.flash('error_msg', 'Ya existe una comisión con ese nombre');
    } else {
      req.flash('error_msg', 'Error al crear la comisión');
    }
    res.redirect('/admin/commissions');
  }
};

// Agregar miembro a comisión
exports.addMember = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para agregar miembros a comisiones');
      return res.redirect('/commissions');
    }
    
    const { id } = req.params;
    const { userId, role, detail } = req.body;
    const commission = await Commission.findById(id);
    if (!commission) return res.redirect('/admin/commissions');
    commission.members.push({ userId, role, detail: detail || '' });
    await commission.save();
    req.flash('success_msg', 'Miembro agregado');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error adding member:', error);
    req.flash('error_msg', 'Error al agregar miembro');
    res.redirect('/admin/commissions');
  }
};

// Eliminar miembro de comisión
exports.removeMember = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para eliminar miembros de comisiones');
      return res.redirect('/commissions');
    }
    
    const { id, memberId } = req.params;
    const commission = await Commission.findById(id);
    if (!commission) return res.redirect('/admin/commissions');
    // Remove member by id
    // commission.members.pull(memberId) removes subdoc with matching _id
    commission.members.pull(memberId);
    await commission.save();
    req.flash('success_msg', 'Miembro eliminado');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error removing member:', error);
    req.flash('error_msg', 'Error al eliminar miembro');
    res.redirect('/admin/commissions');
  }
};

// Actualizar rol de miembro
exports.updateMember = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para actualizar miembros de comisiones');
      return res.redirect('/commissions');
    }
    
    const { id, memberId } = req.params;
    const { role, detail } = req.body;
    const commission = await Commission.findById(id);
    if (!commission) return res.redirect('/admin/commissions');
    const member = commission.members.id(memberId);
    if (member) {
      member.role = role;
      member.detail = detail || '';
    }
    await commission.save();
    req.flash('success_msg', 'Rol actualizado');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error updating member:', error);
    req.flash('error_msg', 'Error al actualizar rol');
    res.redirect('/admin/commissions');
  }
};

// Update commission details
exports.updateCommission = async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.user.role !== 'cooperativa-admin' && req.session.user.role !== 'superuser') {
      req.flash('error_msg', 'No tienes permisos para actualizar comisiones');
      return res.redirect('/commissions');
    }
    
    const { id } = req.params;
    const { name, description, stage } = req.body;
    
    const commission = await Commission.findById(id);
    if (!commission) {
      req.flash('error_msg', 'Comisión no encontrada');
      return res.redirect('/admin/commissions');
    }
    
    // Check if another commission with the same name already exists (excluding current commission)
    const existingCommission = await Commission.findOne({ 
      name: name.trim(), 
      cooperativaId: commission.cooperativaId,
      isDeleted: false,
      _id: { $ne: id } // Exclude current commission from the search
    });
    
    if (existingCommission) {
      req.flash('error_msg', 'Ya existe otra comisión con ese nombre');
      return res.redirect('/admin/commissions');
    }
    
    commission.name = name.trim();
    commission.description = description ? description.trim() : '';
    commission.stage = stage;
    await commission.save();
    
    req.flash('success_msg', 'Comisión actualizada exitosamente');
    res.redirect('/admin/commissions');
  } catch (error) {
    console.error('Error updating commission:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000 || error.name === 'MongoServerError') {
      req.flash('error_msg', 'Ya existe otra comisión con ese nombre');
    } else {
      req.flash('error_msg', 'Error al actualizar la comisión');
    }
    res.redirect('/admin/commissions');
  }
};