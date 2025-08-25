const express = require('express');
const { auth, db } = require('../config/firebase');

const router = express.Router();

// Verify Firebase Token
router.post('/verify-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userData = userDoc.data();

        res.json({
            success: true,
            user: {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName,
                role: userData.role,
                isActive: userData.isActive
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message
        });
    }
});

// Create Custom Token
router.post('/custom-token', async (req, res) => {
    try {
        const { uid, additionalClaims = {} } = req.body;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'UID is required'
            });
        }

        const customToken = await auth.createCustomToken(uid, additionalClaims);

        res.json({
            success: true,
            customToken
        });

    } catch (error) {
        console.error('Custom token creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create custom token',
            error: error.message
        });
    }
});

module.exports = router;
