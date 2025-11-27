import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();
const notificationController = new NotificationController();

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Send a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationDto'
 *     responses:
 *       201:
 *         description: Notification queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
// ✅ Protected route: Requires authentication and ADMIN/INSTRUCTOR role
router.post('/', authMiddleware, authorize('ADMIN', 'INSTRUCTOR'), (req, res) =>
  notificationController.send(req, res)
);

export default router;
