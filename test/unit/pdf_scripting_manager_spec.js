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

import { EventBus } from "../../web/event_utils.js";
import { isNodeJS } from "../../src/shared/util.js";
import { PDFScriptingManager } from "../../web/pdf_scripting_manager.js";

const FIELD_ID = "10R";

describe("pdf_scripting_manager", function () {
  function createScriptingManager() {
    const eventBus = new EventBus();
    const storage = new Map();
    const pdfDocument = {
      annotationStorage: {
        setValue(key, value) {
          storage.set(key, value);
        },
      },
      getCalculationOrderIds: async () => null,
      getFieldObjects: async () => ({ field: [{ id: FIELD_ID }] }),
      getJSActions: async () => null,
    };
    const scriptingManager = new PDFScriptingManager({
      docProperties: async () => ({}),
      eventBus,
      externalServices: {
        createScripting: () => ({
          createSandbox: async () => {},
          destroySandbox: async () => {},
          dispatchEventInSandbox: async () => {},
        }),
      },
    });
    scriptingManager.setViewer({
      currentPageNumber: 1,
      getPageView: () => null,
      isChangingPresentationMode: false,
      isInPresentationMode: false,
      pagesCount: 1,
      pagesPromise: Promise.resolve(),
    });
    return { eventBus, pdfDocument, scriptingManager, storage };
  }

  function createTarget(elementId) {
    const element = document.createElement("div");
    element.setAttribute("data-element-id", elementId);
    const updates = [];
    element.addEventListener("updatefromsandbox", evt => {
      updates.push(evt.detail);
    });
    document.body.append(element);
    return { element, updates };
  }

  async function tick() {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  it("should ignore sandbox updates for unknown ids", async function () {
    if (isNodeJS) {
      pending("DOM is not supported in Node.js.");
    }
    const { eventBus, pdfDocument, scriptingManager, storage } =
      createScriptingManager();
    await scriptingManager.setDocument(pdfDocument);

    // The sandbox is fully attacker controlled, hence it may target any
    // element in the viewer rather than only the fields of the document.
    const target = createTarget("attacker-controlled");
    eventBus.dispatch("updatefromsandbox", {
      source: window,
      detail: { id: "attacker-controlled", value: "pwned" },
    });
    await tick();

    expect(target.updates).toEqual([]);
    expect(storage.size).toEqual(0);

    target.element.remove();
  });

  it("should ignore sandbox updates for unknown siblings", async function () {
    if (isNodeJS) {
      pending("DOM is not supported in Node.js.");
    }
    const { eventBus, pdfDocument, scriptingManager, storage } =
      createScriptingManager();
    await scriptingManager.setDocument(pdfDocument);

    const target = createTarget("sibling-controlled");
    eventBus.dispatch("updatefromsandbox", {
      source: window,
      detail: {
        id: FIELD_ID,
        siblings: ["sibling-controlled"],
        value: "pwned",
      },
    });
    await tick();

    expect(target.updates).toEqual([]);
    expect(storage.has("sibling-controlled")).toEqual(false);

    target.element.remove();
  });

  it("should apply sandbox updates for known ids", async function () {
    if (isNodeJS) {
      pending("DOM is not supported in Node.js.");
    }
    const { eventBus, pdfDocument, scriptingManager } =
      createScriptingManager();
    await scriptingManager.setDocument(pdfDocument);

    const target = createTarget(FIELD_ID);
    eventBus.dispatch("updatefromsandbox", {
      source: window,
      detail: { id: FIELD_ID, value: "allowed" },
    });
    await tick();

    expect(target.updates.length).toEqual(1);
    expect(target.updates[0].value).toEqual("allowed");

    target.element.remove();
  });
});
