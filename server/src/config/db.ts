import mongoose from "mongoose";

import { env } from "./env";
import { logger } from "../lib/logger";

export type DatabaseStatus = "disconnected" | "connected" | "connecting" | "disconnecting";

const statusMap: Record<number, DatabaseStatus> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export async function connectDatabase(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });

  // Build indexes up front so queries that rely on them ($text, 2dsphere,
  // unique constraints) are not affected by asynchronous index creation.
  await Promise.all(
    mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()),
  );
}

let memoryServer: import("mongodb-memory-server").MongoMemoryServer | undefined;

export async function initializeDatabase(): Promise<void> {
  if (env.MONGO_URI) {
    await connectDatabase(env.MONGO_URI);
    logger.info("Connected to MongoDB");
    return;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("MONGO_URI is required in production");
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: "haven" } });
  await connectDatabase(memoryServer.getUri("haven"));
  logger.warn("MONGO_URI is not set; using in-memory MongoDB. Data resets when the API restarts.");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
}

export function databaseStatus(): DatabaseStatus {
  return statusMap[mongoose.connection.readyState] ?? "disconnected";
}