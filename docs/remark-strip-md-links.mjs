import { visit } from 'unist-util-visit';

/**
 * Remark plugin that strips .md / .mdx extensions from internal links.
 * This allows markdown source to use `[OCR](./ocr.md)` (works on GitHub)
 * while Starlight builds the link as `./ocr` (routes to /en/ocr/).
 */
export function remarkStripMdLinks() {
  return (tree) => {
    visit(tree, 'link', (node) => {
      if (
        node.url &&
        !node.url.startsWith('http') &&
        /\.mdx?($|#)/.test(node.url)
      ) {
        node.url = node.url.replace(/\.mdx?($|#)/, '$1');
      }
    });
  };
}
