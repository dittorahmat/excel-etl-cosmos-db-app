import { Router } from 'express';
import { config } from 'dotenv';

// Load environment variables
config();

const router = Router();

/**
 * @openapi
 * /api/auth/status:
 *   get:
 *     summary: Check if authentication is required
 *     description: Returns whether authentication is enabled on the server
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authentication status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authRequired:
 *                   type: boolean
 *                   description: Whether authentication is required
 *                 authType:
 *                   type: string
 *                   description: Type of authentication (e.g., 'jwt', 'api-key', 'none')
 */
router.get('/status', (req, res) => {
    const authRequired = process.env.AUTH_ENABLED === 'true';
    
    res.json({
        authRequired,
        authType: authRequired ? 'jwt' : 'none'
    });
});

export default router;
