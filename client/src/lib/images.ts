const UNSPLASH_HOST = "images.unsplash.com";
const CLOUDINARY_HOST = "res.cloudinary.com";

function isUnsplash(url: string) {
  try {
    return new URL(url).hostname === UNSPLASH_HOST;
  } catch {
    return false;
  }
}

function isCloudinary(url: string) {
  try {
    return new URL(url).hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

function withCloudinaryTransforms(url: string, transformation: string) {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;

  const rest = url.slice(index + marker.length);
  // Avoid stacking transformations if the URL already carries one.
  if (rest.startsWith("f_auto")) return url;

  return `${url.slice(0, index + marker.length)}${transformation}/${rest}`;
}

export function resizedImage(url: string, width: number) {
  if (isUnsplash(url)) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", "65");
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    } catch {
      return url;
    }
  }

  if (isCloudinary(url)) {
    return withCloudinaryTransforms(url, `f_auto,q_auto,w_${width}`);
  }

  return url;
}

export function imageSrcSet(url: string, widths: number[] = [480, 720, 960]) {
  if (!isUnsplash(url) && !isCloudinary(url)) return undefined;
  return widths.map((width) => `${resizedImage(url, width)} ${width}w`).join(", ");
}