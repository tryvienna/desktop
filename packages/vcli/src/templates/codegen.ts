export function renderCodegen(): string {
  return `import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';

export default createPluginCodegenConfig();
`;
}
