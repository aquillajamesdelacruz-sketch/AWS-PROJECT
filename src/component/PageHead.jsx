/**
 * Per-page document head, "helmet" style.
 *
 * React 19 automatically hoists <title>, <meta> and <link> tags rendered
 * inside components into <head> (and removes them when the component
 * unmounts), so switching routes updates the tab title and description
 * without a library like react-helmet-async.
 *
 * Usage: <PageHead title="Log in" description="..." /> as the first child
 * of a page's returned JSX.
 */
const SITE = "PeekyFox";

export default function PageHead({ title, description }) {
  return (
    <>
      <title>{title.includes(SITE) ? title : `${title} · ${SITE}`}</title>
      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:site_name" content={SITE} />
          <meta name="twitter:card" content="summary" />
        </>
      )}
    </>
  );
}
