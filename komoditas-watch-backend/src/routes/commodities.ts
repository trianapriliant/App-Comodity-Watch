import { Router } from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth';
import { validate, validateQuery, commoditySchemas } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Commodity:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [BERAS, JAGUNG, KEDELAI, GULA_PASIR, MINYAK_GORENG, DAGING_SAPI, DAGING_AYAM, TELUR_AYAM, CABAI_MERAH, BAWANG_MERAH, BAWANG_PUTIH, TOMAT]
 *         code:
 *           type: string
 *         unit:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         isStrategic:
 *           type: boolean
 *         imageUrl:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /commodities:
 *   get:
 *     summary: Get all commodities
 *     tags: [Commodities]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isStrategic
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of commodities
 */
router.get('/', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Commodities endpoint - coming soon',
    data: [],
  });
});

/**
 * @swagger
 * /commodities/{id}:
 *   get:
 *     summary: Get commodity by ID
 *     tags: [Commodities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Commodity details
 *       404:
 *         description: Commodity not found
 */
router.get('/:id', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Commodity detail endpoint - coming soon',
    data: null,
  });
});

/**
 * @swagger
 * /commodities:
 *   post:
 *     summary: Create new commodity
 *     tags: [Commodities]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Commodity'
 *     responses:
 *       201:
 *         description: Commodity created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, validate(commoditySchemas.create), (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Create commodity endpoint - coming soon',
    data: null,
  });
});

/**
 * @swagger
 * /commodities/{id}:
 *   put:
 *     summary: Update commodity
 *     tags: [Commodities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Commodity'
 *     responses:
 *       200:
 *         description: Commodity updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Commodity not found
 */
router.put('/:id', verifyToken, validate(commoditySchemas.update), (req, res) => {
  res.json({
    success: true,
    message: 'Update commodity endpoint - coming soon',
    data: null,
  });
});

/**
 * @swagger
 * /commodities/{id}:
 *   delete:
 *     summary: Delete commodity
 *     tags: [Commodities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Commodity deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Commodity not found
 */
router.delete('/:id', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Delete commodity endpoint - coming soon',
    data: null,
  });
});

export default router;
