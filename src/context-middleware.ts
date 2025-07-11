import type { NextFunction, Request, Response } from 'express';
import { createContext } from './create-context';
import { type ContextEnricher, enrichContext } from './enrich-context';

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    // 프록시 체인을 고려해 첫 번째 IP 사용
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }

  const remoteAddress = req.ip;

  // IPv6 형식으로 들어오는 "::ffff:127.0.0.1" 케이스 처리
  if (remoteAddress?.startsWith('::ffff:')) {
    return remoteAddress.substring(7);
  }

  return remoteAddress || undefined;
}

export const createContexMiddleware: Function =
  (contextEnrichers: ContextEnricher[]) =>
    async (req: Request, res: Response, next: NextFunction) => {
      let context: any = {};

      if (req.method === 'GET') {
        context = req.query || {};
      } else if (req.method === 'POST') {
        context = req.body.context || {};
      }

      context.currentTime = new Date().toISOString();

      // TODO 시간을 분해해서 의미있는 요소들로 분해해서 주입해준다.

      const clientIp = getClientIp(req);
      if (clientIp) {
        context.remoteAddress = clientIp;
      }

      try {
        res.locals.context = await enrichContext(
          contextEnrichers,
          createContext(context),
        );
        next();
      } catch (error: unknown) {
        next(error); // or res.status(500).send("Failed to process the context");
      }
    };
