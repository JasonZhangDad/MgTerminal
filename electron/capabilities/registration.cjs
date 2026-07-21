"use strict";

/**
 * First-party capability extension registry (quasi-plugin foundation).
 *
 * This is NOT a third-party plugin loader:
 * - No dynamic JS package loading / no unsigned extensions
 * - Domains must be first-party (see FIRST_PARTY_DOMAINS)
 * - Every entry is validated by validateCapabilityDefinition
 * - Static catalog remains the codegen source of truth; extensions are runtime-only
 *   until promoted into catalog/*.cjs + `npm run generate:capability-tools`
 *
 * Use registerCapabilityExtension() from main-process first-party modules
 * (e.g. future system-manager bridges) when a surface is ready.
 */

const { ALL_CAPABILITIES: STATIC_CAPABILITIES } = require("./catalog/index.cjs");
const {
  FIRST_PARTY_DOMAINS,
  validateCapabilityDefinition,
} = require("./capabilityDefinition.cjs");

/** @type {import('./types.cjs').CapabilityDefinition[]} */
const extensionCapabilities = [];

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  }
}

/**
 * Subscribe to registry extension changes (tests / codegen hot-reload hooks).
 * @param {() => void} listener
 * @returns {() => void} unsubscribe
 */
function onCapabilityRegistryChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @returns {import('./types.cjs').CapabilityDefinition[]}
 */
function listStaticCapabilities() {
  return STATIC_CAPABILITIES.slice();
}

/**
 * @returns {import('./types.cjs').CapabilityDefinition[]}
 */
function listExtensionCapabilities() {
  return extensionCapabilities.slice();
}

/**
 * Static catalog + runtime first-party extensions.
 * @returns {import('./types.cjs').CapabilityDefinition[]}
 */
function listAllCapabilities() {
  if (extensionCapabilities.length === 0) return STATIC_CAPABILITIES.slice();
  return [...STATIC_CAPABILITIES, ...extensionCapabilities];
}

/**
 * Register a first-party capability at runtime.
 *
 * @param {unknown} raw
 * @param {{ source?: string }} [meta]
 * @returns {{ ok: true, capability: object } | { ok: false, errors: string[] }}
 */
function registerCapabilityExtension(raw, meta = {}) {
  const validated = validateCapabilityDefinition(raw, {
    allowDomains: FIRST_PARTY_DOMAINS,
  });
  if (!validated.ok) {
    return validated;
  }

  const capability = validated.capability;
  const staticIds = new Set(STATIC_CAPABILITIES.map((c) => c.id));
  if (staticIds.has(capability.id)) {
    return {
      ok: false,
      errors: [`capability id "${capability.id}" already exists in the static catalog`],
    };
  }
  if (extensionCapabilities.some((c) => c.id === capability.id)) {
    return {
      ok: false,
      errors: [`capability id "${capability.id}" is already registered as an extension`],
    };
  }

  // Freeze a shallow copy so callers cannot mutate policy after registration.
  const frozen = Object.freeze({
    ...capability,
    policy: Object.freeze({ ...capability.policy }),
    surfaces: Object.freeze({ ...capability.surfaces }),
    ...(capability.agentKinds ? { agentKinds: Object.freeze([...capability.agentKinds]) } : {}),
    extensionSource: meta.source || "first-party",
  });

  extensionCapabilities.push(frozen);
  notify();
  return { ok: true, capability: frozen };
}

/**
 * Test helper — clear runtime extensions.
 * @returns {void}
 */
function clearCapabilityExtensions() {
  if (extensionCapabilities.length === 0) return;
  extensionCapabilities.length = 0;
  notify();
}

module.exports = {
  listStaticCapabilities,
  listExtensionCapabilities,
  listAllCapabilities,
  registerCapabilityExtension,
  clearCapabilityExtensions,
  onCapabilityRegistryChange,
  FIRST_PARTY_DOMAINS,
};
