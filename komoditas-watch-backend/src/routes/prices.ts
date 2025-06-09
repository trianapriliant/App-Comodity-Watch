import { Router } from 'express';
import { verifyToken, optionalAuth, canInputData } from '../middleware/auth';
import { validate, validateQuery, priceSchemas } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /prices:
 *   get:
 *     summary: Get price data with filters
 *     tags: [Prices]
 *     parameters:
 *       - in: query
 *         name: commodityId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: priceType
 *         schema:
 *           type: string
 *           enum: [KONSUMEN, PRODUSEN, WHOLESALE, RETAIL]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Price data
 */
router.get('/', optionalAuth, validateQuery(priceSchemas.filter), (req, res) => {
  res.json({
    success: true,
    message: 'Prices endpoint - coming soon',
    data: [],
  });
});

router.get('/:id', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Price detail endpoint - coming soon',
    data: null,
  });
});

router.post('/', verifyToken, canInputData, validate(priceSchemas.create), (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Create price endpoint - coming soon',
    data: null,
  });
});

router.put('/:id', verifyToken, canInputData, validate(priceSchemas.update), (req, res) => {
  res.json({
    success: true,
    message: 'Update price endpoint - coming soon',
    data: null,
  });
});

router.delete('/:id', verifyToken, canInputData, (req, res) => {
  res.json({
    success: true,
    message: 'Delete price endpoint - coming soon',
    data: null,
  });
});

export default router;
