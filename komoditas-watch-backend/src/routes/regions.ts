import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Regions endpoint - coming soon',
    data: [],
  });
});

router.get('/:id', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Region detail endpoint - coming soon',
    data: null,
  });
});

export default router;
