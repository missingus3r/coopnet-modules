const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { checkAuth, checkAdmin } = require('../middleware/auth');

// Rutas de comisiones disponibles a usuarios autenticados
router.get('/commissions', checkAuth, commissionController.listCommissions);

// Rutas de gestión (admin)
router.get('/admin/commissions', checkAuth, checkAdmin, commissionController.getAdminCommissions);
router.post('/admin/commissions', checkAuth, checkAdmin, commissionController.createCommission);
router.post('/admin/commissions/:id/members', checkAuth, checkAdmin, commissionController.addMember);
router.delete('/admin/commissions/:id/members/:memberId', checkAuth, checkAdmin, commissionController.removeMember);
router.put('/admin/commissions/:id/members/:memberId', checkAuth, checkAdmin, commissionController.updateMember);
// Update commission details
router.put('/admin/commissions/:id', checkAuth, checkAdmin, commissionController.updateCommission);
// Eliminar comisión
router.delete('/admin/commissions/:id', checkAuth, checkAdmin, commissionController.deleteCommission);

module.exports = router;