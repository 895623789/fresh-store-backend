const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { db } = require('../config/firebase');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Payment Order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes = {} } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency,
            receipt: receipt || `order_${Date.now()}`,
            notes: {
                ...notes,
                created_by: 'fresh_store_backend'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID // Safe to send key_id
        });

    } catch (error) {
        console.error('Payment order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
});

// Verify Payment
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            order_details
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment verified successfully

            // Save order to Firebase if order_details provided
            if (order_details) {
                const orderData = {
                    ...order_details,
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    payment_status: 'paid',
                    payment_method: 'online',
                    verified_at: new Date(),
                    created_at: new Date()
                };

                await db.collection('orders').add(orderData);
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// Get Payment Details
router.get('/payment/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const payment = await razorpay.payments.fetch(payment_id);

        res.json({
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                created_at: payment.created_at
            }
        });
    } catch (error) {
        console.error('Fetch payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details',
            error: error.message
        });
    }
});

// Refund Payment
router.post('/refund', async (req, res) => {
    try {
        const { payment_id, amount, reason = 'requested_by_customer' } = req.body;

        const refundData = {
            amount: amount ? Math.round(amount * 100) : undefined // Convert to paise
        };

        const refund = await razorpay.payments.refund(payment_id, refundData);

        res.json({
            success: true,
            refund_id: refund.id,
            amount: refund.amount,
            status: refund.status
        });
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
});

module.exports = router;
