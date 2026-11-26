import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const favoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ user: 1, property: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

export type Favorite = InferSchemaType<typeof favoriteSchema>;
export type FavoriteDocument = HydratedDocument<Favorite>;

export const FavoriteModel = model("Favorite", favoriteSchema);