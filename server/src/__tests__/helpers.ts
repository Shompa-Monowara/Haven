import mongoose from "mongoose";

/**
 * Builds a minimal PNG buffer whose IHDR header declares the given dimensions,
 * which is enough for the upload validator's magic-byte and size checks.
 */
export function pngWithDimensions(width: number, height: number, payload = "image"): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  const chunkType = Buffer.from("IHDR", "ascii");
  const dimensions = Buffer.alloc(8);
  dimensions.writeUInt32BE(width, 0);
  dimensions.writeUInt32BE(height, 4);

  return Buffer.concat([signature, length, chunkType, dimensions, Buffer.from(payload)]);
}

/**
 * Clears all collections between tests and rebuilds model indexes.
 *
 * `dropDatabase()` also drops indexes, so `$text`/`2dsphere`/unique queries
 * would otherwise fail on tests that run after the first one.
 */
export async function resetDatabase(): Promise<void> {
  await mongoose.connection.db?.dropDatabase();
  await Promise.all(
    mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()),
  );
}