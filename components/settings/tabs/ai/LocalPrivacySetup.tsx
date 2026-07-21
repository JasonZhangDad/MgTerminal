import { HardDrive, Shield } from 'lucide-react';
import React, { useMemo } from 'react';
import type { AIPermissionMode, AIProviderId, ProviderConfig } from '../../../../infrastructure/ai/types';
import {
  hasLocalOpenAICompatProvider,
  isLocalOpenAICompatProviderId,
  type LocalOpenAICompatProviderId,
} from '../../../../infrastructure/ai/localProviders';
import { useI18n } from '../../../../application/i18n/I18nProvider';
import { Button } from '../../../ui/button';
import { SettingCard } from '../../settings-ui';
import { ProviderIconBadge } from './ProviderIconBadge';

export const LocalPrivacySetup: React.FC<{
  providers: ProviderConfig[];
  globalPermissionMode: AIPermissionMode;
  onAddProvider: (providerId: AIProviderId) => void;
  onSetPermissionMode: (mode: AIPermissionMode) => void;
}> = ({
  providers,
  globalPermissionMode,
  onAddProvider,
  onSetPermissionMode,
}) => {
  const { t } = useI18n();
  const hasLocal = useMemo(() => hasLocalOpenAICompatProvider(providers), [providers]);
  const hasOllama = providers.some((p) => p.providerId === 'ollama');
  const hasLmStudio = providers.some((p) => p.providerId === 'lmstudio');

  const addLocal = (providerId: LocalOpenAICompatProviderId) => {
    if (providers.some((p) => p.providerId === providerId)) return;
    onAddProvider(providerId);
    if (globalPermissionMode === 'auto') {
      onSetPermissionMode('confirm');
    }
  };

  return (
    <SettingCard padded className="space-y-3 border-emerald-500/20 bg-emerald-500/[0.04]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500">
          <HardDrive size={16} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{t('ai.localPrivacy.title')}</p>
            {hasLocal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Shield size={10} />
                {t('ai.localPrivacy.badge')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('ai.localPrivacy.description')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={hasOllama}
          onClick={() => addLocal('ollama')}
        >
          <ProviderIconBadge providerId="ollama" size="sm" />
          {hasOllama ? t('ai.localPrivacy.addedOllama') : t('ai.localPrivacy.addOllama')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={hasLmStudio}
          onClick={() => addLocal('lmstudio')}
        >
          <ProviderIconBadge providerId="lmstudio" size="sm" />
          {hasLmStudio ? t('ai.localPrivacy.addedLmStudio') : t('ai.localPrivacy.addLmStudio')}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t('ai.localPrivacy.safetyNote')}
      </p>

      {globalPermissionMode === 'auto' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            {t('ai.localPrivacy.autoModeWarning')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onSetPermissionMode('confirm')}
          >
            {t('ai.localPrivacy.useConfirmMode')}
          </Button>
        </div>
      )}

      {hasLocal && (
        <p className="text-[11px] font-mono text-muted-foreground/90">
          {providers
            .filter((p) => isLocalOpenAICompatProviderId(p.providerId))
            .map((p) => p.baseURL || PROVIDER_HINT[p.providerId as LocalOpenAICompatProviderId])
            .join(' · ')}
        </p>
      )}
    </SettingCard>
  );
};

const PROVIDER_HINT: Record<LocalOpenAICompatProviderId, string> = {
  ollama: 'http://localhost:11434/v1',
  lmstudio: 'http://localhost:1234/v1',
};
