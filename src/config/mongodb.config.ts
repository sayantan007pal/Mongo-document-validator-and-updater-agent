import { z } from 'zod';

/**
 * MongoDB Configuration Schema
 */
export const MongoDBConfigSchema = z.object({
  uri: z.string().min(1, 'MongoDB URI is required'),
  database: z.string().min(1, 'MongoDB database name is required'),
  collection: z.string().min(1, 'MongoDB collection name is required'),
});

export type MongoDBConfig = z.infer<typeof MongoDBConfigSchema>;

/**
 * Load MongoDB configuration from environment
 */
export function loadMongoDBConfig(): MongoDBConfig {
  return MongoDBConfigSchema.parse({
    uri: process.env.MONGODB_URI,
    database: process.env.MONGODB_DATABASE,
    collection: process.env.MONGODB_COLLECTION,
  });
}
