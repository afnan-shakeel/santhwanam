import { Router, Request, Response, NextFunction } from 'express';
import { asyncLocalStorage } from '@/shared/infrastructure/context/AsyncLocalStorageManager';
import multer from 'multer';

/**
 * Wrapper to preserve async local storage context across multer middleware
 * Multer processes files asynchronously which breaks the ALS context chain
 */
export default function wrapMulter(multerMiddleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture the current context before multer runs
    const currentContext = asyncLocalStorage.getContext();
    
    multerMiddleware(req, res, (err: any) => {
      if (err) {
        return next(err);
      }
      
      // If we had a context, re-enter it for the rest of the chain
      if (currentContext) {
        asyncLocalStorage.run(currentContext, () => {
          next();
        });
      } else {
        next();
      }
    });
  };
}