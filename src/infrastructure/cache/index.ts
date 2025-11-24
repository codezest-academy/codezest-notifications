import { createCacheClient } from '@codezest-academy/codezest-cache';
import { config } from '../../config';
import { logger } from '../../common/logger';

export const cache = createCacheClient({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  logger: logger,
});
