import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Scrapers endpoint - coming soon',
    data: [],
  });
});

router.post('/:name/run', verifyToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Run scraper endpoint - coming soon',
    data: null,
  });
});

export default router;
