import type { SessionFollowPublicState, SessionFollowAuditEvent } from "../../domain/sessionFollow";

declare global {
  interface MagiesTerminalBridge {
    followStart?(payload: {
      sessionId: string;
      displayName?: string;
    }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState; peerId?: string }>;
    followStop?(payload: { sessionId: string }): Promise<{ success: boolean; error?: string; state?: null }>;
    followJoin?(payload: {
      sessionId: string;
      displayName?: string;
    }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState; peerId?: string }>;
    followLeave?(payload: { sessionId: string }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState | null }>;
    followRequestControl?(payload: {
      sessionId: string;
    }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState }>;
    followGrantControl?(payload: {
      sessionId: string;
      targetPeerId: string;
    }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState }>;
    followRevokeControl?(payload: {
      sessionId: string;
    }): Promise<{ success: boolean; error?: string; state?: SessionFollowPublicState }>;
    followGetState?(payload: {
      sessionId: string;
    }): Promise<{ success: boolean; state?: SessionFollowPublicState | null }>;
    followGetAudit?(payload: {
      sessionId: string;
    }): Promise<{ success: boolean; events?: SessionFollowAuditEvent[] }>;
    openFollowSessionWindow?(payload: {
      sessionId: string;
      title?: string;
      hostLabel?: string;
    }): Promise<{ success: boolean; error?: string }>;
    onFollowSessionOpen?(
      cb: (payload: { sessionId: string; title?: string; hostLabel?: string }) => void,
    ): () => void;
    onFollowState?(
      cb: (payload: { sessionId: string; state: SessionFollowPublicState | null }) => void,
    ): () => void;
    onFollowInputDenied?(
      cb: (payload: { sessionId: string; reason?: string }) => void,
    ): () => void;
  }
}

export {};
