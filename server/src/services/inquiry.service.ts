import { ApiError } from "../lib/api-error";
import { ConversationModel } from "../models/conversation.model";
import { InquiryModel, type InquiryDocument } from "../models/inquiry.model";
import { PropertyModel } from "../models/property.model";
import { UserModel } from "../models/user.model";
import type { inquiryStatuses } from "../validation/engagement.schemas";

interface Viewer {
  id: string;
  role: "buyer" | "agent" | "admin";
}

function coverUrl(images: Array<{ url: string; isCover: boolean; order: number }>) {
  const image = [...images].sort(
    (a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order,
  )[0];
  return image?.url ?? null;
}

async function serializeMany(inquiries: InquiryDocument[], includeNotes = true) {
  if (!inquiries.length) return [];

  const propertyIds = [
    ...new Set(
      inquiries
        .map((inquiry) => inquiry.property?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const buyerIds = [
    ...new Set(
      inquiries
        .map((inquiry) => inquiry.buyer?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [properties, buyers, conversations] = await Promise.all([
    propertyIds.length
      ? PropertyModel.find({ _id: { $in: propertyIds } }).select(
          "title slug price listingType rentPeriod address images",
        )
      : [],
    buyerIds.length
      ? UserModel.find({ _id: { $in: buyerIds } }).select("name email phone")
      : [],
    propertyIds.length && buyerIds.length
      ? ConversationModel.find({
          property: { $in: propertyIds },
          buyer: { $in: buyerIds },
        }).select("property buyer")
      : [],
  ]);

  const propertyMap = new Map(properties.map((property) => [property.id, property]));
  const buyerMap = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const conversationMap = new Map(
    conversations.map((conversation) => [
      `${conversation.property.toString()}:${conversation.buyer.toString()}`,
      conversation.id,
    ]),
  );

  return inquiries.map((inquiry) => {
    const property = inquiry.property ? propertyMap.get(inquiry.property.toString()) : undefined;
    const buyer = inquiry.buyer ? buyerMap.get(inquiry.buyer.toString()) : undefined;

    // Guests have no account, so fall back to the contact details they submitted.
    const contact = {
      id: buyer?.id ?? null,
      name: buyer?.name ?? inquiry.name,
      email: buyer?.email ?? inquiry.email,
      phone: buyer?.phone ?? inquiry.phone ?? null,
    };

    return {
      id: inquiry.id,
      status: inquiry.status,
      message: inquiry.message,
      consent: inquiry.consent,
      tourDate: inquiry.tourDate ?? null,
      topic: inquiry.topic ?? null,
      contactMethod: inquiry.contactMethod ?? null,
      source: inquiry.source ?? "property",
      notes: includeNotes ? inquiry.notes : [],
      conversationId:
        inquiry.property && inquiry.buyer
          ? conversationMap.get(`${inquiry.property.toString()}:${inquiry.buyer.toString()}`) ?? null
          : null,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      buyer: contact,
      property: property
        ? {
            id: property.id,
            slug: property.slug,
            title: property.title,
            price: property.price,
            listingType: property.listingType,
            rentPeriod: property.rentPeriod ?? null,
            city: property.address?.city ?? null,
            coverUrl: coverUrl(property.images),
          }
        : null,
    };
  });
}

export async function listInquiries(
  viewer: Viewer,
  query: { status?: (typeof inquiryStatuses)[number]; page: number; limit: number },
) {
  const filter: Record<string, unknown> = {};
  if (viewer.role === "buyer") filter.buyer = viewer.id;
  else if (viewer.role === "agent") filter.agent = viewer.id;
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [total, inquiries] = await Promise.all([
    InquiryModel.countDocuments(filter),
    InquiryModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(query.limit),
  ]);

  return {
    items: await serializeMany(inquiries, viewer.role !== "buyer"),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function updateInquiry(
  viewer: Viewer,
  id: string,
  input: {
    status?: (typeof inquiryStatuses)[number];
    note?: string;
  },
) {
  if (viewer.role === "buyer") throw ApiError.forbidden("Buyers cannot update leads");

  const inquiry = await InquiryModel.findById(id);
  if (!inquiry) throw ApiError.notFound("That inquiry could not be found");

  if (viewer.role !== "admin" && inquiry.agent.toString() !== viewer.id) {
    throw ApiError.forbidden("You can only update your own leads");
  }

  if (input.status) inquiry.status = input.status;
  if (input.note) inquiry.notes.push(input.note);
  await inquiry.save();

  const [dto] = await serializeMany([inquiry]);
  return dto;
}

export async function countInquiriesForUser(userId: string, role: "buyer" | "agent" | "admin") {
  const filter =
    role === "buyer" ? { buyer: userId } : role === "agent" ? { agent: userId } : {};
  const [total, open] = await Promise.all([
    InquiryModel.countDocuments(filter),
    InquiryModel.countDocuments({
      ...filter,
      status: { $in: ["new", "contacted", "qualified"] },
    }),
  ]);
  return { total, open };
}