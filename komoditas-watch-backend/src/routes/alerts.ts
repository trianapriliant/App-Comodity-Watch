import { Router } from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Alerts endpoint - coming soon',
    data: [],
  });
});

router.post('/', verifyToken, (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Create alert endpoint - coming soon',
    data: null,
  });
});

export default router;
