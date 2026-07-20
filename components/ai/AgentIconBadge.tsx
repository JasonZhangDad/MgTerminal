import React from 'react';
import { cn } from '../../lib/utils';
import {
  AGENT_ICON_VISUALS,
  resolveAgentIconKey,
  type AgentIconKey,
  type AgentIconSource,
} from '../../domain/agentIcon';

export type { AgentIconKey, AgentIconSource };

const SIZE_CONFIG = {
  xs: {
    badge: 'h-5 w-5 rounded-md',
    image: 'h-3 w-3',
    plain: 'h-3.5 w-3.5',
  },
  sm: {
    badge: 'h-7 w-7 rounded-lg',
    image: 'h-3.5 w-3.5',
    plain: 'h-3.5 w-3.5',
  },
  md: {
    badge: 'h-8 w-8 rounded-xl',
    image: 'h-4 w-4',
    plain: 'h-4 w-4',
  },
  lg: {
    badge: 'h-10 w-10 rounded-xl',
    image: 'h-5 w-5',
    plain: 'h-5 w-5',
  },
} as const;

export const AgentIconBadge: React.FC<{
  agent: AgentIconSource | 'add-more';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'badge';
  className?: string;
}> = ({ agent, size = 'md', variant = 'badge', className }) => {
  const iconKey = resolveAgentIconKey(agent);
  const visual = AGENT_ICON_VISUALS[iconKey];
  const dims = SIZE_CONFIG[size];

  if (variant === 'plain') {
    return (
      <div
        aria-hidden="true"
        className={cn('shrink-0', dims.plain, className)}
        style={{
          maskImage: `url(${visual.src})`,
          WebkitMaskImage: `url(${visual.src})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          backgroundColor: 'currentColor',
        }}
      />
    );
  }

  return (
    <div
      data-agent-badge=""
      className={cn(
        'magiesTerminal-ai-icon-plate flex shrink-0 items-center justify-center overflow-hidden border',
        dims.badge,
        visual.badgeClassName,
        className,
      )}
    >
      <img
        src={visual.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn(dims.image, visual.imageClassName)}
      />
    </div>
  );
};

export default AgentIconBadge;
