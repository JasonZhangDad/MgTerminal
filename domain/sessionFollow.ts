/**
 * Local terminal follow mode (multiplayer foundation).
 * Same-app / multi-window: one backend session, many viewers, single controller.
 * Pure helpers — no Electron deps.
 */

export type SessionFollowRole = "controller" | "viewer";

export type SessionFollowPeer = {
  peerId: string;
  webContentsId: number;
  displayName: string;
  role: SessionFollowRole;
  joinedAt: number;
};

export type SessionFollowRoom = {
  sessionId: string;
  ownerPeerId: string;
  controllerPeerId: string;
  peers: SessionFollowPeer[];
  pendingControlRequests: string[];
  createdAt: number;
};

export type SessionFollowAuditType =
  | "follow_started"
  | "follow_stopped"
  | "peer_joined"
  | "peer_left"
  | "control_requested"
  | "control_granted"
  | "control_revoked"
  | "control_denied"
  | "input_denied";

export type SessionFollowAuditEvent = {
  ts: number;
  sessionId: string;
  type: SessionFollowAuditType;
  actorPeerId?: string;
  targetPeerId?: string;
  detail?: string;
};

export type SessionFollowPublicState = {
  sessionId: string;
  ownerPeerId: string;
  controllerPeerId: string;
  peerCount: number;
  peers: Array<{
    peerId: string;
    displayName: string;
    role: SessionFollowRole;
    webContentsId: number;
  }>;
  pendingControlRequests: Array<{ peerId: string; displayName: string }>;
  createdAt: number;
};

export function createFollowPeer(input: {
  peerId: string;
  webContentsId: number;
  displayName: string;
  role: SessionFollowRole;
  now?: number;
}): SessionFollowPeer {
  return {
    peerId: input.peerId,
    webContentsId: input.webContentsId,
    displayName: input.displayName.trim() || "Peer",
    role: input.role,
    joinedAt: input.now ?? Date.now(),
  };
}

export function createFollowRoom(input: {
  sessionId: string;
  owner: SessionFollowPeer;
  now?: number;
}): SessionFollowRoom {
  const owner = { ...input.owner, role: "controller" as const };
  return {
    sessionId: input.sessionId,
    ownerPeerId: owner.peerId,
    controllerPeerId: owner.peerId,
    peers: [owner],
    pendingControlRequests: [],
    createdAt: input.now ?? Date.now(),
  };
}

export function getFollowPeer(
  room: SessionFollowRoom,
  peerId: string,
): SessionFollowPeer | undefined {
  return room.peers.find((peer) => peer.peerId === peerId);
}

export function getFollowPeerByWebContents(
  room: SessionFollowRoom,
  webContentsId: number,
): SessionFollowPeer | undefined {
  return room.peers.find((peer) => peer.webContentsId === webContentsId);
}

export function listFollowWebContentsIds(room: SessionFollowRoom): number[] {
  return room.peers.map((peer) => peer.webContentsId);
}

export function canWriteFollowInput(
  room: SessionFollowRoom | null | undefined,
  webContentsId: number,
  options?: { automated?: boolean },
): { allowed: boolean; reason?: "no_room" | "not_controller" | "unknown_peer" } {
  if (!room) return { allowed: true, reason: "no_room" };
  // Automated writes (snippets / scripts) only from the controller peer.
  const peer = getFollowPeerByWebContents(room, webContentsId);
  if (!peer) return { allowed: false, reason: "unknown_peer" };
  if (peer.peerId === room.controllerPeerId) return { allowed: true };
  if (options?.automated) {
    return { allowed: false, reason: "not_controller" };
  }
  return { allowed: false, reason: "not_controller" };
}

export function joinFollowRoom(
  room: SessionFollowRoom,
  peer: SessionFollowPeer,
): { room: SessionFollowRoom; joined: boolean; error?: string } {
  if (room.peers.some((entry) => entry.peerId === peer.peerId)) {
    return { room, joined: false, error: "Peer already joined." };
  }
  if (room.peers.some((entry) => entry.webContentsId === peer.webContentsId)) {
    // Replace stale peer for same webContents (reload).
    const without = room.peers.filter((entry) => entry.webContentsId !== peer.webContentsId);
    const nextPeer = { ...peer, role: "viewer" as const };
    return {
      room: {
        ...room,
        peers: [...without, nextPeer],
        pendingControlRequests: room.pendingControlRequests.filter(
          (id) => without.some((p) => p.peerId === id),
        ),
      },
      joined: true,
    };
  }
  return {
    room: {
      ...room,
      peers: [...room.peers, { ...peer, role: "viewer" }],
    },
    joined: true,
  };
}

export function leaveFollowRoom(
  room: SessionFollowRoom,
  peerId: string,
): { room: SessionFollowRoom | null; left: boolean; controllerChanged: boolean } {
  const peer = getFollowPeer(room, peerId);
  if (!peer) return { room, left: false, controllerChanged: false };

  const peers = room.peers.filter((entry) => entry.peerId !== peerId);
  if (peers.length === 0) {
    return { room: null, left: true, controllerChanged: true };
  }

  let controllerPeerId = room.controllerPeerId;
  let controllerChanged = false;
  if (controllerPeerId === peerId) {
    // Prefer owner if still present, else first remaining peer.
    const ownerStillHere = peers.find((entry) => entry.peerId === room.ownerPeerId);
    controllerPeerId = ownerStillHere?.peerId ?? peers[0]!.peerId;
    controllerChanged = true;
  }

  const nextPeers = peers.map((entry) => ({
    ...entry,
    role: (entry.peerId === controllerPeerId ? "controller" : "viewer") as SessionFollowRole,
  }));

  return {
    room: {
      ...room,
      peers: nextPeers,
      controllerPeerId,
      pendingControlRequests: room.pendingControlRequests.filter((id) => id !== peerId),
    },
    left: true,
    controllerChanged,
  };
}

export function requestFollowControl(
  room: SessionFollowRoom,
  peerId: string,
): { room: SessionFollowRoom; requested: boolean; error?: string } {
  const peer = getFollowPeer(room, peerId);
  if (!peer) return { room, requested: false, error: "Peer not in room." };
  if (room.controllerPeerId === peerId) {
    return { room, requested: false, error: "Already controller." };
  }
  if (room.pendingControlRequests.includes(peerId)) {
    return { room, requested: false };
  }
  return {
    room: {
      ...room,
      pendingControlRequests: [...room.pendingControlRequests, peerId],
    },
    requested: true,
  };
}

export function grantFollowControl(
  room: SessionFollowRoom,
  granterPeerId: string,
  targetPeerId: string,
): { room: SessionFollowRoom; granted: boolean; error?: string } {
  if (room.controllerPeerId !== granterPeerId && room.ownerPeerId !== granterPeerId) {
    return { room, granted: false, error: "Only controller or owner can grant." };
  }
  const target = getFollowPeer(room, targetPeerId);
  if (!target) return { room, granted: false, error: "Target not in room." };

  const peers = room.peers.map((entry) => ({
    ...entry,
    role: (entry.peerId === targetPeerId ? "controller" : "viewer") as SessionFollowRole,
  }));

  return {
    room: {
      ...room,
      peers,
      controllerPeerId: targetPeerId,
      pendingControlRequests: room.pendingControlRequests.filter((id) => id !== targetPeerId),
    },
    granted: true,
  };
}

export function revokeFollowControl(
  room: SessionFollowRoom,
  actorPeerId: string,
): { room: SessionFollowRoom; revoked: boolean; error?: string } {
  // Owner or current controller can return control to owner.
  if (actorPeerId !== room.ownerPeerId && actorPeerId !== room.controllerPeerId) {
    return { room, revoked: false, error: "Not allowed to revoke." };
  }
  if (room.controllerPeerId === room.ownerPeerId) {
    return { room, revoked: false, error: "Owner already controls." };
  }
  const owner = getFollowPeer(room, room.ownerPeerId);
  if (!owner) return { room, revoked: false, error: "Owner missing." };

  const peers = room.peers.map((entry) => ({
    ...entry,
    role: (entry.peerId === room.ownerPeerId ? "controller" : "viewer") as SessionFollowRole,
  }));

  return {
    room: {
      ...room,
      peers,
      controllerPeerId: room.ownerPeerId,
      pendingControlRequests: room.pendingControlRequests.filter((id) => id !== room.ownerPeerId),
    },
    revoked: true,
  };
}

export function toFollowPublicState(room: SessionFollowRoom): SessionFollowPublicState {
  const nameById = new Map(room.peers.map((peer) => [peer.peerId, peer.displayName]));
  return {
    sessionId: room.sessionId,
    ownerPeerId: room.ownerPeerId,
    controllerPeerId: room.controllerPeerId,
    peerCount: room.peers.length,
    peers: room.peers.map((peer) => ({
      peerId: peer.peerId,
      displayName: peer.displayName,
      role: peer.role,
      webContentsId: peer.webContentsId,
    })),
    pendingControlRequests: room.pendingControlRequests.map((peerId) => ({
      peerId,
      displayName: nameById.get(peerId) || peerId,
    })),
    createdAt: room.createdAt,
  };
}

export function createFollowAuditEvent(input: {
  sessionId: string;
  type: SessionFollowAuditType;
  actorPeerId?: string;
  targetPeerId?: string;
  detail?: string;
  now?: number;
}): SessionFollowAuditEvent {
  return {
    ts: input.now ?? Date.now(),
    sessionId: input.sessionId,
    type: input.type,
    actorPeerId: input.actorPeerId,
    targetPeerId: input.targetPeerId,
    detail: input.detail,
  };
}

export function appendFollowAudit(
  events: SessionFollowAuditEvent[],
  event: SessionFollowAuditEvent,
  maxEvents = 200,
): SessionFollowAuditEvent[] {
  const next = [...events, event];
  if (next.length <= maxEvents) return next;
  return next.slice(next.length - maxEvents);
}
