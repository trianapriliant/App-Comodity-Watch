import { Router } from 'express';
import { verifyToken, canInputData } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Data input endpoint - coming soon',
    data: [],
  });
});

router.post('/', verifyToken, canInputData, (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Create data input endpoint - coming soon',
    data: null,
  });
});

export default router;
