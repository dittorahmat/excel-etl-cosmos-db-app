import { Router } from 'express';
import type { Request, Response } from 'express';
import { ingestionService } from '../../services/ingestion/ingestion.service.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.get('/status/:importId', async (req: Request, res: Response) => {
  const { importId } = req.params;
  logger.info(`Checking status for import ${importId}`);

  try {
    const importData = await ingestionService.getImport(importId);

    if (!importData) {
      return res.status(404).json({ message: 'Import not found' });
    }

    return res.status(200).json(importData);
  } catch (error) {
    logger.error(`Error getting status for import ${importId}`, error);
    return res.status(500).json({ message: 'Error getting import status' });
  }
});

export { router as importRouterV2 };
