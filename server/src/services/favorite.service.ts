import { ApiError } from "../lib/api-error";
import { FavoriteModel } from "../models/favorite.model";
import { PropertyModel, type PropertyDocument } from "../models/property.model";
import { summarizeProperties } from "./property.service";

export async function listFavorites(userId: string) {
  const favorites = await FavoriteModel.find({ user: userId })
    .sort({ createdAt: -1 })
    .select("property createdAt")
    .lean();

  if (!favorites.length) return [];

  const ids = favorites.map((favorite) => favorite.property);
  const properties = await PropertyModel.find({
    _id: { $in: ids },
    status: "approved",
    hiddenBySuspension: { $ne: true },
  });

  const byId = new Map(properties.map((property) => [property.id, property]));
  const ordered = favorites
    .map((favorite) => byId.get(favorite.property.toString()))
    .filter((property): property is PropertyDocument => Boolean(property));

  return summarizeProperties(ordered);
}

export async function favoriteIds(userId: string) {
  const favorites = await FavoriteModel.find({ user: userId }).select("property").lean();
  return favorites.map((favorite) => favorite.property.toString());
}

export async function addFavorite(userId: string, propertyId: string) {
  const property = await PropertyModel.findOne({ _id: propertyId, status: "approved" }).select(
    "_id",
  );

  if (!property) throw ApiError.notFound("That listing is not available to save");

  await FavoriteModel.updateOne(
    { user: userId, property: property._id },
    { $setOnInsert: { user: userId, property: property._id } },
    { upsert: true },
  );

  const count = await FavoriteModel.countDocuments({ user: userId });
  return { favorited: true, count };
}

export async function removeFavorite(userId: string, propertyId: string) {
  await FavoriteModel.deleteOne({ user: userId, property: propertyId });
  const count = await FavoriteModel.countDocuments({ user: userId });
  return { favorited: false, count };
}