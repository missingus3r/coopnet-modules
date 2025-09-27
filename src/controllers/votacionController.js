const Vote = require('../models/Vote');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getUserId, getCooperativaId, isAdmin } = require('../utils/authUtils');
const { ensureCooperativaExists, ensureUserExists } = require('../utils/dbHelpers');
const { validateObjectId } = require('../utils/validation');

// GET /votaciones
exports.getVotaciones = async (req, res) => {
  try {
    // Get cooperativa and user info from query params or session
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const userId = getUserId(req) || req.session?.user?._id;
    const userName = req.query.userName || req.session?.user?.firstName || 'Usuario';
    const cooperativaName = req.query.cooperativaName || 'Cooperativa';
    const userIsAdmin = isAdmin(req) || req.session?.user?.isAdmin === true;
    
    if (!cooperativaId) return res.redirect('/');
    
    // Ensure cooperativa and user exist in database
    await ensureCooperativaExists(cooperativaId, cooperativaName);
    
    if (userId) {
      const userRole = userIsAdmin ? 'cooperativa-admin' : 'user';
      await ensureUserExists(userId, userName, cooperativaId, userRole);
    }
    
    let votes = [];
    let participants = [];
    
    if (validateObjectId(cooperativaId)) {
      const cooperativaQuery = new mongoose.Types.ObjectId(cooperativaId);
      
      votes = await Vote.find({ cooperativa: cooperativaQuery })
        .sort({ createdAt: -1 })
        .lean();
      
      // Get participants for proposer dropdown (exclude admin)
      participants = await User.find({ 
        cooperativaId: cooperativaQuery,
        role: { $ne: 'cooperativa-admin' } // Exclude admin from voting members
      })
        .select('firstName lastName')
        .lean();
    }
    
    // Split active and past
    const now = Date.now();
    const active = [];
    const past = [];
    votes.forEach(v => {
      const expire = new Date(v.createdAt).getTime() + v.duration * 60000;
      if (now < expire) active.push(v);
      else past.push(v);
    });
    // Build user object for view
    const user = req.modularUser || req.session?.user || {
      _id: userId,
      firstName: userName.split(' ')[0],
      lastName: userName.split(' ').slice(1).join(' '),
      cooperativaId: cooperativaId,
      role: userIsAdmin ? 'cooperativa-admin' : 'user'
    };
    
    res.render('votaciones', { active, past, user, participants });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      message: 'No se pudieron cargar las votaciones',
      error: err.message,
      darkMode: req.query.darkMode === 'true'
    });
  }
};

// POST /votaciones (create)
exports.createVotacion = async (req, res) => {
  try {
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const { title, details, duration, proposer } = req.body;
    
    if (!title || !duration) {
      return res.status(400).json({ success: false, message: 'Título y duración son requeridos' });
    }
    
    if (!validateObjectId(cooperativaId)) {
      return res.status(400).json({ success: false, message: 'ID de cooperativa inválido' });
    }
    
    const durationNum = parseInt(duration, 10);
    const vote = new Vote({
      title,
      details,
      duration: durationNum,
      proposer: proposer || null, // Make proposer optional
      cooperativa: cooperativaId
    });
    await vote.save();
    res.json({ success: true, message: 'Votación creada exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al crear la votación' });
  }
};

// GET /votaciones/:id/detalles
exports.getDetails = async (req, res) => {
  try {
    const voteId = req.params.id;
    
    if (!validateObjectId(voteId)) {
      return res.status(400).json({ error: 'ID de votación inválido' });
    }
    
    // Load vote and its votes with user info
    const voteDoc = await Vote.findById(voteId)
      .populate('votes.user', 'firstName lastName')
      .populate('votes.representedBy', 'firstName lastName')
      .lean();
    if (!voteDoc) return res.status(404).json({ error: 'Votación no encontrada' });
    
    let participants = [];
    if (validateObjectId(voteDoc.cooperativa)) {
      // Load all participants of this cooperativa (exclude admin)
      participants = await User.find({ 
        cooperativaId: voteDoc.cooperativa,
        role: { $ne: 'cooperativa-admin' } // Exclude admin from voting details
      })
        .select('firstName lastName')
        .sort({ lastName: 1, firstName: 1 })
        .lean();
    }
    // Map votes by user ID
    const voteMap = {};
    // Build a map of userId -> vote info
    (voteDoc.votes || []).forEach(v => {
      // Determine user ID as string (handle populated user objects)
      let uid;
      if (v.user) {
        // If populated, v.user is an object with _id
        if (v.user._id) uid = v.user._id.toString();
        else uid = v.user.toString();
      }
      if (uid) {
        voteMap[uid] = {
          option: v.option,
          representedByName: v.representedBy
            ? `${v.representedBy.firstName} ${v.representedBy.lastName}`
            : ''
        };
      }
    });
    // Build details list including non-voters
    const details = participants.map(p => {
      const uid = p._id.toString();
      if (voteMap[uid]) {
        return {
          userName: `${p.firstName} ${p.lastName}`,
          option: voteMap[uid].option,
          representedByName: voteMap[uid].representedByName
        };
      }
      return {
        userName: `${p.firstName} ${p.lastName}`,
        option: 'NO VOTO',
        representedByName: ''
      };
    });
    res.json({ success: true, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
};

// POST /votaciones/:id/vote
exports.vote = async (req, res) => {
  try {
    const voteId = req.params.id;
    // option: user's choice; represent: optional proxy target id
    const { option, represent } = req.body;
    if (!['Sí','No','Abstención'].includes(option)) {
      return res.status(400).json({ error: 'Opción inválida' });
    }
    const voteDoc = await Vote.findById(voteId);
    if (!voteDoc) return res.status(404).json({ error: 'Votación no encontrada' });
    // Check active (vote still open)
    const expire = voteDoc.createdAt.getTime() + voteDoc.duration * 60000;
    if (Date.now() >= expire) return res.status(400).json({ error: 'Votación cerrada' });
    // Determine current user's ID (string)
    const userId = getUserId(req);
    // Validate representation if provided
    let representId = represent;
    if (representId) {
      if (!mongoose.Types.ObjectId.isValid(representId)) {
        return res.status(400).json({ error: 'Representante inválido' });
      }
      if (representId === userId) {
        return res.status(400).json({ error: 'No puedes representarte a ti mismo' });
      }
      const repUser = await User.findOne({ 
        _id: representId, 
        cooperativaId: voteDoc.cooperativa,
        role: { $ne: 'cooperativa-admin' } // Admin cannot be represented
      });
      if (!repUser) {
        return res.status(400).json({ error: 'Socio no válido' });
      }
    }
    // Upsert direct vote
    const directVote = voteDoc.votes.find(v => v.user.toString() === userId && !v.representedBy);
    if (directVote) {
      directVote.option = option;
      directVote.votedAt = Date.now();
    } else {
      // Push a new direct vote for this user
      voteDoc.votes.push({ user: new mongoose.Types.ObjectId(String(userId)), option });
    }
    // Handle proxy representation
    const repIndex = voteDoc.votes.findIndex(v => v.representedBy?.toString() === userId);
    if (representId) {
      if (repIndex >= 0) {
        const existingRep = voteDoc.votes[repIndex];
        if (existingRep.user.toString() === representId) {
          existingRep.option = option;
          existingRep.votedAt = Date.now();
        } else {
          voteDoc.votes.splice(repIndex, 1);
          voteDoc.votes.push({
            user: new mongoose.Types.ObjectId(String(representId)),
            option,
            representedBy: new mongoose.Types.ObjectId(String(userId))
          });
        }
      } else {
        voteDoc.votes.push({
          user: new mongoose.Types.ObjectId(String(representId)),
          option,
          representedBy: new mongoose.Types.ObjectId(String(userId))
        });
      }
    } else if (repIndex >= 0) {
      voteDoc.votes.splice(repIndex, 1);
    }
    await voteDoc.save();
    const counts = voteDoc.getCounts();
    res.json({ success: true, counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar voto' });
  }
};

// DELETE /votaciones/:id
exports.deleteVotacion = async (req, res) => {
  try {
    const voteId = req.params.id;
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    
    if (!validateObjectId(voteId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    
    // Only delete if belongs to this cooperativa
    const result = await Vote.deleteOne({ _id: voteId, cooperativa: cooperativaId });
    if (result.deletedCount && result.deletedCount > 0) {
      return res.json({ success: true, message: 'Votación eliminada exitosamente' });
    }
    return res.status(404).json({ success: false, message: 'Votación no encontrada o acceso denegado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al eliminar votación' });
  }
};
// PUT /votaciones/:id - Edit an existing votación (admin only)
exports.editVotacion = async (req, res) => {
  try {
    const voteId = req.params.id;
    const cooperativaId = getCooperativaId(req) || req.session?.user?.cooperativaId;
    const { title, details, duration, proposer } = req.body;
    
    if (!title || !duration) {
      return res.status(400).json({ success: false, message: 'Título y duración son requeridos' });
    }
    
    if (!validateObjectId(voteId) || !validateObjectId(cooperativaId)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    
    const voteDoc = await Vote.findOne({ _id: voteId, cooperativa: cooperativaId });
    if (!voteDoc) {
      return res.status(404).json({ success: false, message: 'Votación no encontrada o acceso denegado' });
    }
    // Only allow editing while active
    const expire = voteDoc.createdAt.getTime() + voteDoc.duration * 60000;
    if (Date.now() >= expire) {
      return res.status(400).json({ success: false, message: 'No se puede editar una votación cerrada' });
    }
    voteDoc.title = title;
    voteDoc.details = details;
    voteDoc.duration = parseInt(duration, 10);
    voteDoc.proposer = proposer || voteDoc.proposer;
    await voteDoc.save();
    res.json({ success: true, message: 'Votación actualizada exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al actualizar la votación' });
  }
};