import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import * as PageModule from "../src/app/methodology/page.tsx";
import { sourceContextsForUrl } from "../src/lib/source-context.ts";
import { atlasPath } from "../src/lib/atlas-path.ts";
const Page = PageModule.default?.default ?? PageModule.default;

function page() { return new JSDOM(renderToStaticMarkup(React.createElement(Page))); }

test("source rows link to one actual citation context and disclose additional locations", () => {
  const dom = page();
  try {
    let linked = 0;
    let multiple = 0;
    for (const row of dom.window.document.querySelectorAll("#source-directory li")) {
      const source = row.querySelector("a[data-source-link]");
      const contexts = sourceContextsForUrl(source.getAttribute("href"));
      const link = row.querySelector("a[data-source-context]");
      if (contexts.length) {
        linked++;
        assert.ok(link, `Missing context for ${source.textContent}`);
        assert.equal(link.getAttribute("href"), atlasPath(contexts[0].href));
        assert.match(link.textContent, /See in context/);
        assert.equal(link.getAttribute("aria-label"), `See in context: ${contexts[0].label}`);
        assert.equal(link.closest("a[data-source-link]"), null, "Context is a separate link, never nested in the source link");
        const more = row.querySelector("[data-source-context-more]");
        if (contexts.length > 1) {
          multiple++;
          assert.ok(more);
          assert.equal(more.textContent, `+ ${contexts.length - 1} more`);
        } else assert.equal(more, null);
      } else {
        assert.equal(link, null, `Do not invent a generic destination for ${source.textContent}`);

      }
    }
    assert.ok(linked > 0, "At least one real runtime citation must have context");
    assert.ok(multiple > 0, "Shared sources must show that additional contexts exist");
  } finally { dom.window.close(); }
});
