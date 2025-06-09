import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Predictions endpoint - coming soon',
    data: [],
  });
});

export default router;
