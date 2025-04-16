import 'express';

// Estendendo o namespace Express
declare namespace Express {
  export interface Request {
    user: {
      id: string;
      role?: string;
      company_id?: string;
    };
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
