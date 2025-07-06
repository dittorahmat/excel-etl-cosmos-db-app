import { Router } from 'express';
import queryRouter from './query.js';

const router = Router();

// Mount query routes
router.use('/query', queryRouter);

// Add other v2 routes here as needed
// router.use('/other', otherRouter);

export default router;
