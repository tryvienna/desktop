export interface NamingContext {
  pluginName: string;   // 'my-plugin' (kebab)
  pluginId: string;     // 'my_plugin' (snake)
  displayName: string;  // 'My Plugin' (title)
  pascalName: string;   // 'MyPlugin' (pascal)
  camelName: string;    // 'myPlugin' (camel)
}

export interface EntityNaming {
  entityName: string;        // 'linear-issue' (kebab)
  entityType: string;        // 'linear_issue' (snake)
  entityDisplayName: string; // 'Linear Issue' (title)
  entityPascal: string;      // 'LinearIssue' (pascal)
  entityCamel: string;       // 'linearIssue' (camel)
}

export type AuthType = 'oauth' | 'pat' | 'api-key' | 'none';
export type CanvasType = 'sidebar' | 'drawer' | 'menu-bar' | 'feed';

export interface TemplateContext {
  naming: NamingContext;
  entities: EntityNaming[];
  canvases: Set<CanvasType>;
  auth: AuthType;
  description: string;
}
