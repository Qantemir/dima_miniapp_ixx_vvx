const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return "https://miniapp.local";
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

export const siteConfig = {
  name: "Mini Shop",
  shortName: "Mini Shop",
  description:
    "Mini Shop — современный Telegram-магазин с каталогом, корзиной и быстрым оформлением заказа.",
  keywords: [
    "telegram shop",
    "mini app",
    "онлайн магазин",
    "доставка",
    "каталог товаров",
    "telegram mini app",
  ],
  locale: "ru_RU",
  baseUrl: normalizeBaseUrl(import.meta.env.VITE_PUBLIC_URL),
  ogImage: "https://dummyimage.com/1200x630/09090b/ffffff&text=Mini+Shop",
  contactEmail: "support@miniapp.local",
};

export const buildCanonicalUrl = (path?: string) => {
  if (!path) return siteConfig.baseUrl;
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.baseUrl}${normalizedPath}`;
};

