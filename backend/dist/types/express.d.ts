import 'express';

// Estendendo o namespace Express
declare namespace Express {
  export interface Request {
    user?: any;
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
      fieldname: string;
      encoding: string;
    };
  }
}
