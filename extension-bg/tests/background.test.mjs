import assert from "node:assert/strict";
import test from "node:test";

import { createExtensionTestHost } from "@dokiworld/extension-sdk/testing";
import { activate, deactivate } from "../src/index.js";

test("applies the saved background to a chat surface rendered after activation", async () => {
  const documentFixture = createDocumentFixture();
  const observerFixture = createMutationObserverFixture();
  const host = createExtensionTestHost({ extensionId: "third-party.background-customizer" });
  globalThis.document = documentFixture.document;
  globalThis.localStorage = createStorage({
    enabled: true,
    imageUrl: "",
    baseColor: "#e400a5",
    overlayColor: "#f00046",
    overlayOpacity: 0.42,
    size: "cover",
    position: "center",
  });
  globalThis.MutationObserver = observerFixture.MutationObserver;

  await activate(host.context);
  assert.deepEqual(await host.context.storage.localStore.get("background-settings.v1"), {
    enabled: true,
    imageUrl: "",
    baseColor: "#e400a5",
    overlayColor: "#f00046",
    overlayOpacity: 0.42,
    size: "cover",
    position: "center",
  });

  const chatPage = documentFixture.addElement("chat-page");
  const chatBackground = documentFixture.addElement("chat-bg");
  observerFixture.trigger();

  assert.equal(chatPage.style.getPropertyValue("background"), "#e400a5");
  assert.match(
    chatBackground.style.getPropertyValue("background-image"),
    /rgba\(240, 0, 70, 0\.42\)/,
  );
  assert.equal(chatBackground.style.getPropertyPriority("background-image"), "important");

  deactivate();
  await host.dispose();
  assert.equal(chatPage.style.getPropertyValue("background"), "");
  assert.equal(chatBackground.style.getPropertyValue("background-image"), "");
});

test("adds a settings button only to the chat header", async () => {
  const documentFixture = createDocumentFixture();
  const observerFixture = createMutationObserverFixture();
  const host = createExtensionTestHost({ extensionId: "third-party.background-customizer" });
  globalThis.document = documentFixture.document;
  globalThis.localStorage = createStorage({});
  globalThis.MutationObserver = observerFixture.MutationObserver;

  const disposeExtension = await activate(host.context);

  const registration = host.registrations.slots.find(
    ({ slotId }) => slotId === "chat.header.actions",
  );
  assert.ok(registration);

  const chatHeader = createDomElement("span");
  const chatCleanup = registration.mount(chatHeader, { version: 1, surface: "chat-header" });
  assert.equal(chatHeader.children.length, 1);
  assert.equal(chatHeader.children[0].tagName, "BUTTON");
  assert.equal(chatHeader.children[0].attributes.get("aria-label"), "settings.open");

  chatHeader.children[0].listeners.get("click")();
  assert.equal(documentFixture.document.body.children.length, 1);
  assert.equal(documentFixture.document.body.children[0].className, "bg-extension-modal");
  assert.equal(
    documentFixture.document.body.children[0].children[0].attributes.get("role"),
    "dialog",
  );

  chatCleanup();
  assert.equal(documentFixture.document.body.children.length, 1);
  assert.equal(chatHeader.children.length, 0);
  await disposeExtension();
  assert.equal(documentFixture.document.body.children.length, 0);
  await host.dispose();
});

function createDocumentFixture() {
  const elements = [];
  const listeners = new Map();
  const documentElement = createDomElement("html");
  const body = createDomElement("body");
  return {
    addElement(className) {
      const element = createDomElement("div");
      element.className = className;
      elements.push(element);
      return element;
    },
    document: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      body,
      createElement: createDomElement,
      documentElement,
      querySelectorAll(selector) {
        const classNames = selector.split(",").map((value) => value.trim().replace(/^\./, ""));
        return elements.filter((element) => classNames.includes(element.className));
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    },
  };
}

function createDomElement(tagName) {
  const element = {
    attributes: new Map(),
    children: [],
    className: "",
    listeners: new Map(),
    parentElement: null,
    style: createStyle(),
    tagName: tagName.toUpperCase(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
    append(...children) {
      for (const child of children) {
        child.parentElement = this;
        this.children.push(child);
      }
    },
    focus() {},
    prepend(...children) {
      for (const child of children.reverse()) {
        child.parentElement = this;
        this.children.unshift(child);
      }
    },
    remove() {
      if (!this.parentElement) return;
      const index = this.parentElement.children.indexOf(this);
      if (index >= 0) this.parentElement.children.splice(index, 1);
      this.parentElement = null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
  };
  return element;
}

function createStyle() {
  const values = new Map();
  return {
    getPropertyPriority: (name) => values.get(name)?.priority ?? "",
    getPropertyValue: (name) => values.get(name)?.value ?? "",
    removeProperty: (name) => values.delete(name),
    setProperty: (name, value, priority = "") => values.set(name, { value, priority }),
  };
}

function createStorage(settings) {
  const values = new Map([
    ["dokiworld.extension.background-customizer.settings.v1", JSON.stringify(settings)],
  ]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createMutationObserverFixture() {
  let callback;
  return {
    MutationObserver: class {
      constructor(nextCallback) {
        callback = nextCallback;
      }

      disconnect() {}

      observe() {}
    },
    trigger: () => callback?.([], {}),
  };
}
