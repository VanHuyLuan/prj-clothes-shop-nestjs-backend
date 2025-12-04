import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CachingService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Tạo cache key với prefix
   */
  getCacheKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Lưu dữ liệu vào cache
   */
  async saveCache(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  /**
   * Lấy dữ liệu từ cache
   */
  async getCache<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing cached value:', error);
      return null;
    }
  }

  /**
   * Xóa cache theo key
   */
  async removeCache(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Xóa nhiều cache keys
   */
  async removeCacheMultiple(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Xóa cache theo pattern
   */
  async removeCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Kiểm tra cache có tồn tại không
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Set TTL cho cache key
   */
  async setTtl(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  /**
   * Lấy TTL của cache key
   */
  async getTtl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * Lấy Redis client instance
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Lưu cache với prefix tự động
   */
  async saveCacheWithPrefix(
    prefix: string,
    identifier: string,
    value: any,
    ttl?: number,
  ): Promise<void> {
    const key = this.getCacheKey(prefix, identifier);
    await this.saveCache(key, value, ttl);
  }

  /**
   * Lấy cache với prefix tự động
   */
  async getCacheWithPrefix<T>(
    prefix: string,
    identifier: string,
  ): Promise<T | null> {
    const key = this.getCacheKey(prefix, identifier);
    return await this.getCache<T>(key);
  }

  /**
   * Xóa cache với prefix tự động
   */
  async removeCacheWithPrefix(
    prefix: string,
    identifier: string,
  ): Promise<void> {
    const key = this.getCacheKey(prefix, identifier);
    await this.removeCache(key);
  }

  /**
   * Increment counter
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    return await this.redis.incrby(key, increment);
  }

  /**
   * Decrement counter
   */
  async decrement(key: string, decrement: number = 1): Promise<number> {
    return await this.redis.decrby(key, decrement);
  }

  /**
   * Lấy tất cả keys theo pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * Flush tất cả cache
   */
  async flushAll(): Promise<void> {
    await this.redis.flushall();
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    return await this.redis.ping();
  }
}
