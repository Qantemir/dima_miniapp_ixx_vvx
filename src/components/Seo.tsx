import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, siteConfig } from "@/lib/seo";

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const Seo = ({
  title,
  description,
  path,
  image,
  noIndex,
  jsonLd,
}: SeoProps) => {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const metaDescription = description ?? siteConfig.description;
  const canonical = buildCanonicalUrl(path);
  const previewImage = image ?? siteConfig.ogImage;
  const keywords = siteConfig.keywords.join(", ");
  const robots = noIndex ? "noindex,nofollow" : "index,follow";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonical} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={previewImage} />
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:locale" content={siteConfig.locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={previewImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

