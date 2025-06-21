import { TokenPayload } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      file?: Express.Multer.File;
    }
  }
}
