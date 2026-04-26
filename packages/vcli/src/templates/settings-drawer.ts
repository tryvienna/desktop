import type { TemplateContext } from '../types.ts';

export function renderSettingsDrawer(ctx: TemplateContext): string {
  const { naming, auth } = ctx;
  const pascal = naming.pascalName;
  const id = naming.pluginId;

  const credentialSection = auth !== 'none' ? renderCredentialSection(auth, id) : '';
  const credentialImports = auth === 'oauth'
    ? `import { OAuthCredentialManager } from '@tryvienna/ui';`
    : auth !== 'none'
    ? `import { CredentialField } from '@tryvienna/ui';`
    : '';

  return `/**
 * ${pascal}SettingsDrawer — Settings panel for the ${naming.displayName} plugin.
 *
 * Rendered inside ${pascal}PluginDrawer when payload.view === 'settings'.
 */

${credentialImports}
import {
  ContentSection,
  Button,
  Input,
  Label,
} from '@tryvienna/ui';
import type { PluginHostApi, CanvasLogger } from '@tryvienna/sdk';
import { use${pascal}Settings } from './use${pascal}Settings';

interface Props {
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

export function ${pascal}SettingsDrawer({ hostApi, logger }: Props) {
  const { settings, updateSettings, resetSettings } = use${pascal}Settings();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-medium">${naming.displayName} Settings</h3>
${credentialSection}
      <ContentSection title="Preferences">
        <div className="flex flex-col gap-2">
          <Label htmlFor="limit">Max items</Label>
          <Input
            id="limit"
            type="number"
            value={settings.limit}
            onChange={(e) => updateSettings({ limit: Number(e.target.value) || 20 })}
            className="w-20"
          />
        </div>
      </ContentSection>

      <Button variant="outline" size="sm" onClick={resetSettings}>
        Reset to defaults
      </Button>
    </div>
  );
}
`;
}

function renderCredentialSection(auth: string, id: string): string {
  if (auth === 'oauth') {
    return `
      <ContentSection title="Authentication">
        <OAuthCredentialManager hostApi={hostApi} integrationId="${id}" logger={logger} />
      </ContentSection>
`;
  }

  const credKey = auth === 'api-key' ? 'api_key' : 'personal_access_token';
  const credLabel = auth === 'api-key' ? 'API Key' : 'Personal Access Token';

  return `
      <ContentSection title="Authentication">
        <CredentialField
          hostApi={hostApi}
          integrationId="${id}"
          credentialKey="${credKey}"
          label="${credLabel}"
          logger={logger}
        />
      </ContentSection>
`;
}
