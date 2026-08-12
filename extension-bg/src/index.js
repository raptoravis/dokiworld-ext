import {
  EXTENSION_API_VERSION,
  EXTENSION_CONTRACT_VERSION,
} from "@dokiworld/extension-sdk";

const SETTINGS_KEY = "background-settings.v1";
const LEGACY_STORAGE_KEY = "dokiworld.extension.background-customizer.settings.v1";
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  imageUrl: "",
  baseColor: "#241420",
  overlayColor: "#180d16",
  overlayOpacity: 0.42,
  size: "cover",
  position: "center",
});

let restoreBackground = null;
let backgroundObserver = null;
let closeActiveSettingsDialog = null;
const managedBackgrounds = new Map();

/**
 * Public SDK entrypoint. Editors can type-check every Context API used below
 * without importing any DokiWorld frontend implementation module.
 * @param {import("@dokiworld/extension-sdk").ExtensionContext} context
 */
export async function activate(context) {
  let settings = await loadSettings(context);
  const updateSettings = async (nextSettings) => {
    settings = nextSettings;
    await saveSettings(context, settings);
    applyBackground(settings);
  };
  restoreBackground = stopBackgroundManagement;
  applyBackground(settings);
  backgroundObserver = new MutationObserver(() => applyBackground(settings));
  backgroundObserver.observe(document.body, { childList: true, subtree: true });

  const disposeSettings = context.ui.slots.mount("extensions.settings", ({ element }) => {
    const panel = createSettingsPanel(context, settings, updateSettings);
    element.append(panel);
    return () => panel.remove();
  });
  context.subscriptions.add(disposeSettings);

  const disposeChatSettings = context.ui.slots.mount(
    "chat.header.actions",
    ({ element, context: slotContext }) => {
      if (
        slotContext?.version !== EXTENSION_CONTRACT_VERSION ||
        slotContext?.surface !== "chat-header"
      ) {
        return undefined;
      }
      const trigger = createSettingsButton(context, () => {
        closeActiveSettingsDialog?.();
        closeActiveSettingsDialog = openSettingsDialog(
          context,
          settings,
          updateSettings,
          trigger,
        );
      });
      element.append(trigger);
      // Chat renders can remount this Slot whenever its context changes. The
      // body-level dialog deliberately outlives that transient button mount.
      return () => trigger.remove();
    },
  );
  context.subscriptions.add(disposeChatSettings);

  context.logger.info("Background Customizer activated.", {
    sdkApiVersion: EXTENSION_API_VERSION,
    slotContractVersion: EXTENSION_CONTRACT_VERSION,
  });
  return () => {
    closeActiveSettingsDialog?.();
    closeActiveSettingsDialog = null;
    restoreBackground?.();
    restoreBackground = null;
  };
}

function createSettingsButton(context, onClick) {
  const label = context.i18n.t("settings.open");
  const trigger = button("⚙", "button");
  trigger.className = "bg-extension-settings-trigger";
  trigger.setAttribute("aria-label", label);
  trigger.title = label;
  trigger.addEventListener("click", onClick);
  return trigger;
}

function openSettingsDialog(context, initial, onSave, trigger) {
  const t = (key) => context.i18n.t(key);
  const overlay = document.createElement("div");
  overlay.className = "bg-extension-modal";

  const panel = createSettingsPanel(context, initial, onSave);
  panel.className += " bg-extension-dialog";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", t("settings.title"));

  const closeButton = button("×", "button");
  closeButton.className = "bg-extension-dialog-close";
  closeButton.setAttribute("aria-label", t("settings.close"));
  closeButton.title = t("settings.close");
  panel.prepend(closeButton);
  overlay.append(panel);
  document.body.append(overlay);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    trigger?.focus();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);
  closeButton.focus();
  return close;
}

export function deactivate() {
  closeActiveSettingsDialog?.();
  closeActiveSettingsDialog = null;
  restoreBackground?.();
  restoreBackground = null;
}

function createSettingsPanel(context, initial, onSave) {
  const t = (key) => context.i18n.t(key);
  const section = document.createElement("section");
  section.className = "extension-card bg-extension-settings";

  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = t("settings.title");
  const description = document.createElement("p");
  description.textContent = t("settings.description");
  copy.append(title, description);

  const form = document.createElement("form");
  form.className = "bg-extension-form";
  form.noValidate = true;

  const enabled = checkboxField(t("settings.enabled"), initial.enabled);
  const imageUrl = textField(t("settings.imageUrl"), initial.imageUrl, t("settings.imageUrlPlaceholder"));
  const baseColor = colorField(t("settings.baseColor"), initial.baseColor);
  const overlayColor = colorField(t("settings.overlayColor"), initial.overlayColor);
  const opacity = rangeField(t("settings.overlayOpacity"), initial.overlayOpacity);
  const size = selectField(t("settings.size"), initial.size, [
    ["cover", t("settings.size.cover")],
    ["contain", t("settings.size.contain")],
    ["auto", t("settings.size.auto")],
  ]);
  const position = selectField(t("settings.position"), initial.position, [
    ["center", t("settings.position.center")],
    ["top", t("settings.position.top")],
    ["bottom", t("settings.position.bottom")],
  ]);
  const status = document.createElement("p");
  status.className = "bg-extension-status";
  status.setAttribute("role", "status");

  const actions = document.createElement("div");
  actions.className = "bg-extension-actions";
  const apply = button(t("settings.apply"), "submit");
  const reset = button(t("settings.reset"), "button");
  actions.append(apply, reset);

  const fields = [enabled, imageUrl, baseColor, overlayColor, opacity, size, position];
  form.append(...fields.map((field) => field.label), actions, status);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const candidateUrl = imageUrl.input.value.trim();
    if (!isAllowedImageUrl(candidateUrl)) {
      status.textContent = t("settings.invalidUrl");
      status.dataset.kind = "error";
      return;
    }
    const next = {
      enabled: enabled.input.checked,
      imageUrl: candidateUrl,
      baseColor: baseColor.input.value,
      overlayColor: overlayColor.input.value,
      overlayOpacity: Number(opacity.input.value),
      size: size.input.value,
      position: position.input.value,
    };
    await onSave(next);
    status.textContent = t("settings.saved");
    status.dataset.kind = "success";
  });
  reset.addEventListener("click", async () => {
    enabled.input.checked = DEFAULT_SETTINGS.enabled;
    imageUrl.input.value = DEFAULT_SETTINGS.imageUrl;
    baseColor.input.value = DEFAULT_SETTINGS.baseColor;
    overlayColor.input.value = DEFAULT_SETTINGS.overlayColor;
    opacity.input.value = String(DEFAULT_SETTINGS.overlayOpacity);
    size.input.value = DEFAULT_SETTINGS.size;
    position.input.value = DEFAULT_SETTINGS.position;
    await onSave({ ...DEFAULT_SETTINGS });
    status.textContent = t("settings.saved");
    status.dataset.kind = "success";
  });

  section.append(copy, form);
  return section;
}

function applyBackground(settings) {
  if (!settings.enabled) {
    restoreManagedBackgrounds();
    return;
  }
  const overlay = hexToRgba(settings.overlayColor, settings.overlayOpacity);
  const layers = [`linear-gradient(${overlay}, ${overlay})`];
  if (settings.imageUrl) layers.push(`url(${JSON.stringify(settings.imageUrl)})`);
  const backgroundImage = layers.join(", ");
  setManagedProperties(document.documentElement, {
    background: settings.baseColor,
  });
  setManagedProperties(document.body, backgroundProperties(settings, backgroundImage));
  for (const chatPage of document.querySelectorAll(".chat-page")) {
    setManagedProperties(chatPage, { background: settings.baseColor });
  }
  for (const chatBackground of document.querySelectorAll(".chat-bg")) {
    setManagedProperties(chatBackground, {
      ...backgroundProperties(settings, backgroundImage),
      filter: "none",
    });
  }
}

function backgroundProperties(settings, backgroundImage) {
  return {
    "background-color": settings.baseColor,
    "background-image": backgroundImage,
    "background-size": settings.size,
    "background-position": settings.position,
    "background-repeat": "no-repeat",
    "background-attachment": "fixed",
  };
}

function setManagedProperties(element, properties) {
  let snapshot = managedBackgrounds.get(element);
  if (!snapshot) {
    snapshot = new Map();
    managedBackgrounds.set(element, snapshot);
  }
  for (const [name, value] of Object.entries(properties)) {
    if (!snapshot.has(name)) {
      snapshot.set(name, {
        value: element.style.getPropertyValue(name),
        priority: element.style.getPropertyPriority(name),
      });
    }
    element.style.setProperty(name, value, "important");
  }
}

function restoreManagedBackgrounds() {
  for (const [element, properties] of managedBackgrounds) {
    for (const [name, property] of properties) {
      if (property.value) element.style.setProperty(name, property.value, property.priority);
      else element.style.removeProperty(name);
    }
  }
  managedBackgrounds.clear();
}

function stopBackgroundManagement() {
  backgroundObserver?.disconnect();
  backgroundObserver = null;
  restoreManagedBackgrounds();
}

async function loadSettings(context) {
  try {
    const stored = await context.storage.localStore.get(SETTINGS_KEY);
    if (stored !== undefined) return normalizeSettings(stored);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null");
    const settings = normalizeSettings(legacy);
    await context.storage.localStore.set(SETTINGS_KEY, settings);
    return settings;
  } catch (error) {
    context.logger.warn("Could not load background settings; defaults will be used.", error);
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(context, settings) {
  await context.storage.localStore.set(SETTINGS_KEY, settings);
}

function normalizeSettings(value) {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_SETTINGS.enabled,
    imageUrl: typeof value.imageUrl === "string" && isAllowedImageUrl(value.imageUrl) ? value.imageUrl : "",
    baseColor: isHexColor(value.baseColor) ? value.baseColor : DEFAULT_SETTINGS.baseColor,
    overlayColor: isHexColor(value.overlayColor) ? value.overlayColor : DEFAULT_SETTINGS.overlayColor,
    overlayOpacity: clamp(Number(value.overlayOpacity), 0, 0.9, DEFAULT_SETTINGS.overlayOpacity),
    size: ["cover", "contain", "auto"].includes(value.size) ? value.size : DEFAULT_SETTINGS.size,
    position: ["center", "top", "bottom"].includes(value.position) ? value.position : DEFAULT_SETTINGS.position,
  };
}

function isAllowedImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch {
    return false;
  }
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function hexToRgba(hex, opacity) {
  const value = isHexColor(hex) ? hex.slice(1) : DEFAULT_SETTINGS.overlayColor.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(Number(opacity), 0, 0.9, DEFAULT_SETTINGS.overlayOpacity)})`;
}

function clamp(value, minimum, maximum, fallback) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function field(labelText, input) {
  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, input);
  return { label, input };
}

function checkboxField(labelText, checked) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  const label = document.createElement("label");
  label.className = "bg-extension-checkbox";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(input, text);
  return { label, input };
}

function textField(labelText, value, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  return field(labelText, input);
}

function colorField(labelText, value) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  return field(labelText, input);
}

function rangeField(labelText, value) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "0.9";
  input.step = "0.05";
  input.value = String(value);
  return field(labelText, input);
}

function selectField(labelText, value, options) {
  const input = document.createElement("select");
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    input.append(option);
  }
  input.value = value;
  return field(labelText, input);
}

function button(text, type) {
  const element = document.createElement("button");
  element.type = type;
  element.textContent = text;
  return element;
}
