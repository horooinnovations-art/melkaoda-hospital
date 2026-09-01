import DOMPurify from "isomorphic-dompurify";
import { rewriteProseHtml } from "@/lib/media";

/**
 * Force rel="noopener noreferrer" on any link that opens a new tab.
 *
 * `target` is in ADD_ATTR because CMS authors use it, but a bare
 * target="_blank" hands the opened page a window.opener reference back into this
 * origin (reverse tabnabbing, MEL-SEC-016). DOMPurify hooks run inside the
 * sanitize pass, so this cannot be bypassed by the markup.
 */
let hookInstalled = false;
function installLinkHook() {
  if (hookInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "A") return;
    const el = node as unknown as Element;
    if (el.getAttribute("target")) {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  hookInstalled = true;
}

export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return "";
  installLinkHook();
  const cleaned = DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
  return rewriteProseHtml(cleaned);
}
