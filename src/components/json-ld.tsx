// Inline JSON-LD as a server component. We render a real <script> tag with
// type="application/ld+json" — Google indexes the static HTML, no JS execution
// needed.
//
// Use one component per @type so the page can stack multiple schemas.

type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-controlled JSON
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
