import 'express';
import multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: multer.File;
      files?: { [fieldname: string]: multer.File[] } | multer.File[];
      securityInfo?: {
        ip: string;
        userAgent: string;
        timestamp: Date;
      };
    }
  }
}
