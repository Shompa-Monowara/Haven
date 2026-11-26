const UNSPLASH_HOST = "images.unsplash.com";

function isUnsplash(url: string) {
  try {
    return new URL(url).hostname === UNSPLASH_HOST;
  } catch {
    return false;
  }
}

export function resizedImage(url: string, width: number) {
  if (!isUnsplash(url)) return url;

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

export function imageSrcSet(url: string, widths: number[] = [480, 720, 960]) {
  if (!isUnsplash(url)) return undefined;
  return widths.map((width) => `${resizedImage(url, width)} ${width}w`).join(", ");
}