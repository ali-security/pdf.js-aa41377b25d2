/* Copyright 2026 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isNodeJS } from "../../src/shared/util.js";
import { XfaLayer } from "../../src/display/xfa_layer.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

describe("xfa_layer", function () {
  function renderXfa(xfaHtml, intent) {
    const div = document.createElement("div");
    XfaLayer.render({ div, intent, xfaHtml });
    return div;
  }

  function renderForDisplay(xfaHtml) {
    return renderXfa(xfaHtml, "display");
  }

  function renderForRichText(xfaHtml) {
    return renderXfa(xfaHtml, "richText");
  }

  describe("XfaLayer", function () {
    it("should not create unsupported HTML elements", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForDisplay({
        name: "div",
        children: [
          { name: "script", value: "globalThis.xfaScriptXss = true;" },
          {
            name: "iframe",
            attributes: { srcdoc: "<img src=x onerror=alert(1)>" },
          },
          { name: "p", value: "kept" },
        ],
      });

      expect(div.querySelector("script")).toBeNull();
      expect(div.querySelector("iframe")).toBeNull();
      expect(div.querySelector("p")).not.toBeNull();
      expect(div.textContent).toEqual("kept");
      expect(globalThis.xfaScriptXss).toBeUndefined();
    });

    it("should replace an unsupported root element with a div", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForDisplay({ name: "script", children: [] });

      expect(div.querySelector("script")).toBeNull();
      expect(div.firstElementChild.localName).toEqual("div");
    });

    it("should not create elements in an unsupported namespace", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForDisplay({
        name: "div",
        children: [
          {
            name: "svg",
            attributes: { xmlns: SVG_NS },
            children: [
              { name: "rect", attributes: { xmlns: SVG_NS } },
              {
                name: "foreignObject",
                attributes: { xmlns: SVG_NS },
                children: [
                  {
                    name: "div",
                    attributes: { xmlns: XHTML_NS },
                    value: "escaped",
                  },
                ],
              },
            ],
          },
          { name: "p", attributes: { xmlns: XHTML_NS }, value: "dropped" },
        ],
      });
      const svg = div.querySelector("svg");

      expect(svg).not.toBeNull();
      expect(svg.children.length).toEqual(1);
      expect(svg.firstElementChild.localName).toEqual("rect");
      expect(div.textContent).toEqual("");
    });

    it("should ignore event handler attributes", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForDisplay({
        name: "div",
        children: [
          {
            name: "img",
            attributes: {
              ONCLICK: "alert(1)",
              onerror: "alert(1)",
              onload: "alert(1)",
              src: "data:image/png;base64,AAAA",
            },
          },
        ],
      });
      const img = div.querySelector("img");

      expect(img).not.toBeNull();
      expect(img.hasAttribute("onclick")).toEqual(false);
      expect(img.hasAttribute("onerror")).toEqual(false);
      expect(img.hasAttribute("onload")).toEqual(false);
      expect(img.onclick).toBeNull();
      expect(img.onerror).toBeNull();
      expect(img.onload).toBeNull();
    });

    it("should not create unsupported elements in rich text", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForRichText({
        name: "div",
        children: [
          { name: "img", attributes: { onerror: "alert(1)", src: "x" } },
          { name: "textarea", value: "removed" },
          { name: "svg", attributes: { xmlns: SVG_NS } },
          { name: "p", value: "kept" },
        ],
      });

      expect(div.querySelector("img")).toBeNull();
      expect(div.querySelector("textarea")).toBeNull();
      expect(div.querySelector("svg")).toBeNull();
      expect(div.textContent).toEqual("kept");
    });

    it("should not set unsupported attributes in rich text", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForRichText({
        name: "div",
        children: [
          {
            name: "p",
            attributes: {
              class: ["kept"],
              dir: "rtl",
              id: "10R",
              onclick: "alert(1)",
              title: "unsupported",
            },
            value: "text",
          },
        ],
      });
      const p = div.querySelector("p");

      expect(p.getAttribute("class")).toEqual("kept");
      expect(p.getAttribute("dir")).toEqual("rtl");
      expect(p.hasAttribute("title")).toEqual(false);
      expect(p.hasAttribute("onclick")).toEqual(false);
      expect(p.onclick).toBeNull();
      expect(div.querySelector("[data-element-id]")).toBeNull();
    });

    it("should not set link attributes in rich text", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForRichText({
        name: "div",
        children: [
          {
            name: "a",
            attributes: {
              href: "javascript:alert(1)",
              newWindow: true,
            },
            value: "click me",
          },
        ],
      });
      const a = div.querySelector("a");

      expect(a).not.toBeNull();
      expect(a.hasAttribute("href")).toEqual(false);
      expect(div.textContent).toEqual("click me");
    });

    it("should not apply unsupported styles in rich text", function () {
      if (isNodeJS) {
        pending("DOM is not supported in Node.js.");
      }
      const div = renderForRichText({
        name: "div",
        children: [
          {
            name: "span",
            attributes: {
              style: {
                background: 'url("https://example.com/beacon")',
                color: "green",
                cursor: "pointer",
                position: "fixed",
                zIndex: "2147483647",
              },
            },
            value: "text",
          },
        ],
      });
      const span = div.querySelector("span");

      expect(span.style.color).toEqual("green");
      expect(span.style.background).toEqual("");
      expect(span.style.cursor).toEqual("");
      expect(span.style.position).toEqual("");
      expect(span.style.zIndex).toEqual("");
      expect(span.getAttribute("style")).not.toContain("url(");
    });
  });
});
