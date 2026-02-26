import { visit } from 'unist-util-visit';

/**
 * Remark plugin that strips .md / .mdx extensions from internal links
 * and adjusts relative paths for Starlight's trailing-slash routing.
 *
 * Starlight serves pages with trailing slashes (e.g. /en/features/),
 * so `./ocr.md` from features.md would resolve to /en/features/ocr
 * instead of /en/ocr. This plugin rewrites `./` to `../` so the
 * browser resolves the link one level up, matching Starlight's routes.
 *
 * Source: `[OCR](./ocr.md)` -> Built: `../ocr` -> Routes to /en/ocr/
 */
function remarkStripMdLinks() {
  return (tree) => {
    visit(tree, 'link', (node) => {
      if (
        node.url &&
        !node.url.startsWith('http') &&
        /\.mdx?($|#)/.test(node.url)
      ) {
        node.url = node.url
          .replace(/^\.\//, '../')
          .replace(/\.mdx?($|#)/, '$1');
      }
    });
  };
}

/**
 * Astro integration that injects the remarkStripMdLinks plugin
 * into both the markdown and MDX pipelines via astro:config:setup.
 * This ensures the plugin runs for all content files (.md and .mdx),
 * even when Starlight's own updateConfig overwrites the initial
 * markdown.remarkPlugins array.
 */
export function stripMdLinksIntegration() {
  return {
    name: 'strip-md-links',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [remarkStripMdLinks],
          },
        });
      },
    },
  };
}
