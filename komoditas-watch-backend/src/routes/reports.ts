import { Router } from 'express';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Reports endpoint - coming soon',
    data: [],
  });
});

router.post('/', verifyToken, (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Create report endpoint - coming soon',
    data: null,
  });
});

export default router;
