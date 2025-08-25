const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

// Create Order (COD)
router.post('/create', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            created_at: new Date(),
            status: 'pending',
            booking_code: `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            delivery_code: `DL${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        };

        const docRef = await db.collection('orders').add(orderData);

        res.json({
            success: true,
            order_id: docRef.id,
            booking_code: orderData.booking_code,
            delivery_code: orderData.delivery_code,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// Get Orders by Customer
router.get('/customer/:customer_id', async (req, res) => {
    try {
        const { customer_id } = req.params;
        const { limit = 50, status } = req.query;

        let query = db.collection('orders')
            .where('customer_id', '==', customer_id)
            .orderBy('created_at', 'desc')
            .limit(parseInt(limit));

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();
        const orders = [];

        snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        res.json({
            success: true,
            orders,
            count: orders.length
        });

    } catch (error) {
        console.error('Fetch orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
});

// Update Order Status
router.put('/:order_id/status', async (req, res) => {
    try {
        const { order_id } = req.params;
        const { status, notes } = req.body;

        const updateData = {
            status,
            updated_at: new Date()
        };

        if (notes) updateData.notes = notes;

        await db.collection('orders').doc(order_id).update(updateData);

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
});

module.exports = router;
