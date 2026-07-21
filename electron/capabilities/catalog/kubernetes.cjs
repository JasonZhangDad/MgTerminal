"use strict";

const { CAPABILITY_STATUS } = require("../constants.cjs");

function k8sCapability(id, description, policyOverrides, surfaces) {
  return {
    id,
    domain: "kubernetes",
    status: CAPABILITY_STATUS.IMPLEMENTED,
    description,
    policy: {
      write: false,
      sensitiveRead: false,
      longRunning: false,
      requiresChatSession: false,
      bypassesObserverBlock: false,
      bypassesApproval: true,
      bypassesChatCancel: true,
      ...policyOverrides,
    },
    surfaces,
  };
}

/**
 * Kubernetes via remote kubectl on a terminal session.
 * Writes always require confirm-mode approval (policy.write + !bypassesApproval).
 *
 * @type {import("../types.cjs").CapabilityDefinition[]}
 */
const KUBERNETES_CAPABILITIES = [
  k8sCapability(
    "kubernetes.namespaces.list",
    "List Kubernetes namespaces via remote kubectl (read-only).",
    {},
    {
      public: { rpcMethod: "public/kubernetes/namespaces/list", mcpTool: "kubernetes_namespaces_list" },
      global: { rpcMethod: "kubernetes/namespaces/list" },
      cli: { command: ["kubernetes", "namespaces", "list"] },
    },
  ),
  k8sCapability(
    "kubernetes.pods.list",
    "List Kubernetes pods via remote kubectl (read-only).",
    {},
    {
      public: { rpcMethod: "public/kubernetes/pods/list", mcpTool: "kubernetes_pods_list" },
      global: { rpcMethod: "kubernetes/pods/list" },
      cli: { command: ["kubernetes", "pods", "list"] },
    },
  ),
  k8sCapability(
    "kubernetes.deployments.list",
    "List Kubernetes deployments via remote kubectl (read-only).",
    {},
    {
      public: { rpcMethod: "public/kubernetes/deployments/list", mcpTool: "kubernetes_deployments_list" },
      global: { rpcMethod: "kubernetes/deployments/list" },
      cli: { command: ["kubernetes", "deployments", "list"] },
    },
  ),
  k8sCapability(
    "kubernetes.pods.logs",
    "Fetch pod logs via remote kubectl (read-only; may be large).",
    { sensitiveRead: true },
    {
      public: {
        rpcMethod: "public/kubernetes/pods/logs",
        mcpTool: "kubernetes_pods_logs",
        confirmInConfirmMode: true,
      },
      global: { rpcMethod: "kubernetes/pods/logs" },
      cli: { command: ["kubernetes", "pods", "logs"] },
    },
  ),
  k8sCapability(
    "kubernetes.pods.describe",
    "Describe a pod via remote kubectl (read-only).",
    {},
    {
      public: { rpcMethod: "public/kubernetes/pods/describe", mcpTool: "kubernetes_pods_describe" },
      global: { rpcMethod: "kubernetes/pods/describe" },
      cli: { command: ["kubernetes", "pods", "describe"] },
    },
  ),
  k8sCapability(
    "kubernetes.pods.delete",
    "Delete a Kubernetes pod via remote kubectl. Requires confirm-mode approval.",
    {
      write: true,
      bypassesApproval: false,
      bypassesChatCancel: false,
      requiresChatSession: true,
    },
    {
      public: { rpcMethod: "public/kubernetes/pods/delete", mcpTool: "kubernetes_pods_delete" },
      global: { rpcMethod: "kubernetes/pods/delete" },
      cli: { command: ["kubernetes", "pods", "delete"] },
    },
  ),
  k8sCapability(
    "kubernetes.deployments.scale",
    "Scale a Kubernetes deployment via remote kubectl. Requires confirm-mode approval.",
    {
      write: true,
      bypassesApproval: false,
      bypassesChatCancel: false,
      requiresChatSession: true,
    },
    {
      public: { rpcMethod: "public/kubernetes/deployments/scale", mcpTool: "kubernetes_deployments_scale" },
      global: { rpcMethod: "kubernetes/deployments/scale" },
      cli: { command: ["kubernetes", "deployments", "scale"] },
    },
  ),
];

module.exports = { KUBERNETES_CAPABILITIES };
