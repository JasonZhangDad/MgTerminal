"use strict";

/**
 * Kubernetes domain service for MCP / public RPC.
 * Runs remote kubectl through the active terminal session (sessionId).
 */

const { createExecOnSessionApi } = require("../../bridges/systemManager/execOnSession.cjs");
const { createKubectlOpsApi } = require("../../bridges/systemManager/kubectlOps.cjs");

function createKubernetesService(ctx = {}) {
  const getSessions = typeof ctx.getSessions === "function" ? ctx.getSessions : () => null;

  let opsCache = null;
  function getOps() {
    if (opsCache) return opsCache;
    const execApi = createExecOnSessionApi({
      sessions: {
        get: (sessionId) => {
          const map = getSessions();
          return map?.get?.(sessionId) ?? null;
        },
      },
      execOnEtSession: ctx.execOnEtSession,
      ensureMoshStatsConnection: ctx.ensureMoshStatsConnection,
    });
    opsCache = createKubectlOpsApi({ execOnSession: execApi.execOnSession });
    return opsCache;
  }

  function requireSessionId(params) {
    const sessionId = typeof params?.sessionId === "string" ? params.sessionId.trim() : "";
    if (!sessionId) {
      return { ok: false, error: "sessionId is required (terminal session with kubectl access)." };
    }
    return { ok: true, sessionId };
  }

  function mapResult(result, extra = {}) {
    if (!result || result.success === false) {
      return { ok: false, error: result?.error || "Kubernetes operation failed" };
    }
    const { success: _s, ...rest } = result;
    return { ok: true, ...rest, ...extra };
  }

  return {
    listNamespaces: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().listNamespaces(null, gate.sessionId));
    },

    listPods: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().listPods(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
      }));
    },

    listDeployments: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().listDeployments(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
      }));
    },

    listEvents: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().listEvents(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
      }));
    },

    getPodLogs: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().getPodLogs(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        pod: params.pod,
        container: params.container,
        tailLines: params.tailLines,
      }));
    },

    describePod: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().describePod(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        pod: params.pod,
      }));
    },

    deletePod: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().deletePod(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        pod: params.pod,
      }));
    },

    execPod: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().execPod(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        pod: params.pod,
        container: params.container,
        command: params.command,
      }));
    },

    scaleDeployment: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().scaleDeployment(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        name: params.name || params.deployment,
        replicas: params.replicas,
      }));
    },

    getDeploymentRolloutStatus: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().getDeploymentRolloutStatus(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        name: params.name,
      }));
    },

    getDeploymentRolloutHistory: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().getDeploymentRolloutHistory(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        name: params.name,
      }));
    },

    restartDeploymentRollout: async (params = {}) => {
      const gate = requireSessionId(params);
      if (!gate.ok) return gate;
      return mapResult(await getOps().restartDeploymentRollout(null, {
        sessionId: gate.sessionId,
        namespace: params.namespace,
        name: params.name,
      }));
    },
  };
}

module.exports = {
  createKubernetesService,
};
