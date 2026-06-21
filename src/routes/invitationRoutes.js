// src/routes/invitationRoutes.js
const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// ===== PUBLIC ROUTES (tanpa auth) =====
// Check invitation validity
router.get('/check/:inviteCode', invitationController.checkInvitation);

// Accept invitation (tanpa auth, tapi dengan validasi)
router.post('/accept/:inviteCode', invitationController.acceptInvitation);

// ===== PROTECTED ROUTES (dengan auth) =====
// Get all invitations
router.get('/', auth.authenticate, role.isAdmin, invitationController.getInvitations);

// Get invitation by ID
router.get('/:id', auth.authenticate, role.isAdmin, invitationController.getInvitationById);

// Get invitation stats
router.get('/stats/overview', auth.authenticate, role.isAdmin, invitationController.getInvitationStats);

// Send invitation
router.post('/send', auth.authenticate, role.isAdmin, invitationController.sendInvitation);

// Bulk send invitations
router.post('/bulk-send', auth.authenticate, role.isAdmin, invitationController.bulkSendInvitations);

// Resend invitation
router.post('/resend/:id', auth.authenticate, role.isAdmin, invitationController.resendInvitation);

// Cancel invitation
router.post('/cancel/:id', auth.authenticate, role.isAdmin, invitationController.cancelInvitation);

module.exports = router;
