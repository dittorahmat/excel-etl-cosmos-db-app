import { Request, Response, NextFunction } from 'express';
import { validationResult, type ValidationChain } from 'express-validator';

/**
 * Middleware to validate request using express-validator
 * @param validations Array of validation chains
 * @returns Express middleware function
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return validation errors
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid request data',
      errors: errors.array()
    });
  };
};

/**
 * Middleware to handle validation errors from express-validator
 * This should be used after the validateRequest middleware
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid request data',
      errors: errors.array()
    });
  }
  next();
};
