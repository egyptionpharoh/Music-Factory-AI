const express = require('express');
const router = express.Router();

const User = require('../models/User');
const verifyAdmin = require('../middleware/verifyAdmin');

// =========================================
// Get All Users
// =========================================
router.get('/users', verifyAdmin, async (req, res) => {
    try {

        const users = await User.find(
            {},
            'email role status createdAt'
        ).sort({ createdAt: -1 });

        res.status(200).json({ users });

    } catch (error) {

        console.error('Admin Users Error:', error);

        res.status(500).json({
            message: 'حدث خطأ أثناء جلب المستخدمين'
        });
    }
});


// =========================================
// Change User Status
// =========================================
router.patch('/change-status', verifyAdmin, async (req, res) => {

    try {

        const { userId, newStatus } = req.body;

        // الحالات المسموح بها فقط
        const allowedStatuses = ['active', 'blocked'];

        if (!userId || !newStatus) {
            return res.status(400).json({
                message: 'البيانات مطلوبة'
            });
        }

        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                message: 'حالة غير مسموحة'
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { status: newStatus },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'المستخدم غير موجود'
            });
        }

        res.status(200).json({
            message: `تم تغيير الحالة إلى ${newStatus}`,
            user: {
                id: updatedUser._id,
                status: updatedUser.status
            }
        });

    } catch (error) {

        console.error('Change Status Error:', error);

        res.status(500).json({
            message: 'حدث خطأ أثناء تحديث الحالة'
        });
    }
});

module.exports = router;