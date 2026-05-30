import type { OperationDescription } from '../types';

/**
 * Returns structured descriptions of all available operations.
 * Used by MCP Server to register Tools and by AI to understand available actions.
 */
export function getAvailableOperations(): OperationDescription[] {
  return [
    // ===== Element =====
    {
      type: 'element.add',
      description: 'Add a new element (div, button, img, etc.) as a child of an existing node',
      category: 'element',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'ID of the parent node' },
        { name: 'tag', type: 'string', required: true, description: 'HTML tag type (div/span/p/h1-h3/button/input/textarea/select/img/a/ul/ol/li/nav/header/footer/section/main)' },
        { name: 'styles', type: 'CSSProperties', required: false, description: 'Initial CSS styles（每值可为字面量或 `{{ ... }}` 表达式）' },
        { name: 'props', type: 'object', required: false, description: 'Element-specific props' },
        { name: 'position', type: 'number', required: false, description: 'Insert position among siblings (default: append)' },
      ],
    },
    {
      type: 'element.remove',
      description: 'Remove an element and all its children',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'ID of the element to remove' },
      ],
    },
    {
      type: 'element.move',
      description: 'Move an element to a new parent',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'Element to move' },
        { name: 'newParentId', type: 'string', required: true, description: 'New parent node ID' },
        { name: 'position', type: 'number', required: false, description: 'Insert position (default: append)' },
      ],
    },
    {
      type: 'element.duplicate',
      description: 'Duplicate an element (deep clone with new IDs)',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'Element to duplicate' },
      ],
    },
    {
      type: 'element.insertSubtree',
      description: 'Insert a pre-built node subtree under a parent',
      category: 'element',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'Parent node ID' },
        { name: 'subtree', type: 'ComponentNode', required: true, description: 'Node subtree with all IDs pre-generated' },
        { name: 'position', type: 'number', required: false, description: 'Insert position' },
      ],
    },
    {
      type: 'element.rename',
      description: "Set the designer-facing name on a node (node.name)",
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'name', type: 'string', required: true, description: 'New name (empty clears)' },
      ],
    },
    {
      type: 'element.wrap',
      description: 'Wrap sibling nodes in a new container',
      category: 'element',
      params: [
        { name: 'nodeIds', type: 'string[]', required: true, description: 'Sibling nodes to wrap' },
        { name: 'containerTag', type: 'string', required: false, description: 'Container tag (default: div)' },
        { name: 'containerStyles', type: 'CSSProperties', required: false, description: 'Container styles' },
      ],
    },
    {
      type: 'element.unwrap',
      description: 'Remove a container, hoisting its children to its parent',
      category: 'element',
      params: [
        { name: 'containerId', type: 'string', required: true, description: 'Container node to unwrap' },
      ],
    },
    {
      type: 'element.reorder',
      description: 'Reorder a node among siblings',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node to reorder' },
        { name: 'parentId', type: 'string', required: true, description: 'Parent node ID' },
        { name: 'newIndex', type: 'number', required: true, description: 'New index (0-based)' },
      ],
    },
    {
      type: 'element.changeType',
      description: 'Change the primitive type of an element',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node to change' },
        { name: 'newType', type: 'string', required: true, description: 'New HTML tag type' },
      ],
    },
    {
      type: 'element.setLocked',
      description: 'Lock / unlock a node on canvas. Locked nodes and descendants cannot be edited via canvas.',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'locked', type: 'boolean', required: true, description: 'true to lock, false to unlock' },
      ],
    },
    {
      type: 'element.setRole',
      description: 'Set a node editor role (scroll-container / sticky-bottom / sticky-top). Written to node.editorMetadata.role; does NOT affect render.',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'role', type: "'scroll-container' | 'sticky-bottom' | 'sticky-top' | null", required: true, description: 'Role, or null to clear' },
      ],
    },
    {
      type: 'element.setVisible',
      description: 'Set static visibility on a node (node.visible)',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'visible', type: 'boolean', required: true, description: 'true to show, false to hide' },
      ],
    },
    {
      type: 'element.setVisibleWhen',
      description: "Set an expression-driven visibility (node.visibleWhen). Evaluates to a boolean against { state, item, index, parent, $last, $ }.",
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'visibleWhen', type: "string | null", required: true, description: "Expression like `{{ state.view.showModal }}`, or null to clear" },
      ],
    },
    {
      type: 'element.setRepeat',
      description:
        "Set list binding (node.repeat) using three-tier model { expression, template }. " +
        "Container node renders normally; static children + N copies of template are both emitted; " +
        "template root node itself runs in item scope (item/index/parent).",
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        {
          name: 'repeat',
          type: "{ expression, template } | { expression } | null",
          required: true,
          description:
            "Full: { expression: '{{state.data.messages}}', template: <ComponentNode subtree> }. " +
            "Partial: { expression: '...' } to change expression only (keeps existing template, " +
            "or if node has no repeat yet, first child is promoted as default template). Null to clear.",
        },
      ],
    },
    {
      type: 'element.setBind',
      description: "Set two-way binding on form elements (node.bind). path is written to/read from ScreenState.",
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'bind', type: "{ path: string } | null", required: true, description: 'Binding config, or null to clear' },
      ],
    },

    // ===== Style =====
    {
      type: 'style.update',
      description: 'Merge style updates into a node.styles (partial patch)',
      category: 'style',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'styles', type: 'Partial<CSSProperties>', required: true, description: 'Style patch; each value can be literal or `{{ ... }}` expression' },
      ],
    },
    {
      type: 'style.reset',
      description: 'Remove specific CSS properties from node.styles',
      category: 'style',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'properties', type: 'string[]', required: true, description: 'CSS property keys to remove' },
      ],
    },
    {
      type: 'style.batchUpdate',
      description: 'Update multiple nodes in one atomic op (no partial-write on failure)',
      category: 'style',
      params: [
        { name: 'updates', type: 'Array<{ nodeId; styles }>', required: true, description: 'Array of per-node style patches' },
      ],
    },

    // ===== Visual State =====
    {
      type: 'visualState.add',
      description: 'Add a visual state (hover/pressed/disabled/custom) to a node',
      category: 'visualState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'State name' },
        { name: 'styles', type: 'Partial<CSSProperties>', required: false, description: 'Style overrides for this state' },
        { name: 'props', type: 'object', required: false, description: 'Prop overrides for this state' },
        { name: 'transition', type: '{ duration; easing; properties }', required: false, description: 'CSS transition' },
        { name: 'childrenStates', type: 'Record<string, string>', required: false, description: 'When this state is active, set child id → state name' },
        { name: 'childrenVisibility', type: 'Record<string, boolean>', required: false, description: 'When this state is active, set child id → visibility' },
      ],
    },
    {
      type: 'visualState.remove',
      description: 'Remove a visual state from a node',
      category: 'visualState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'State name' },
      ],
    },
    {
      type: 'visualState.update',
      description: 'Update an existing visual state (partial patch)',
      category: 'visualState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'State name' },
        { name: 'styles', type: 'Partial<CSSProperties>', required: false, description: 'Style patch' },
        { name: 'props', type: 'object', required: false, description: 'Prop patch' },
        { name: 'transition', type: 'object', required: false, description: 'Transition patch' },
        { name: 'childrenStates', type: 'object', required: false, description: 'childrenStates patch' },
        { name: 'childrenVisibility', type: 'object', required: false, description: 'childrenVisibility patch' },
        { name: 'disabledEvents', type: 'string[]', required: false, description: 'Event triggers disabled in this state' },
      ],
    },
    {
      type: 'visualState.setActive',
      description: 'Set a node active visual state',
      category: 'visualState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'Active state name' },
      ],
    },
    {
      type: 'visualState.resetStyle',
      description: 'Remove CSS properties from a state style overrides',
      category: 'visualState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'State name' },
        { name: 'properties', type: 'string[]', required: true, description: 'CSS properties to remove' },
      ],
    },
    {
      type: 'visualState.setChildVisibility',
      description: 'Toggle a child visibility within a parent visual state',
      category: 'visualState',
      params: [
        { name: 'parentNodeId', type: 'string', required: true, description: 'Parent node ID' },
        { name: 'childNodeId', type: 'string', required: true, description: 'Child node ID' },
        { name: 'stateName', type: 'string', required: true, description: 'Parent state name' },
        { name: 'visible', type: 'boolean | undefined', required: true, description: 'true/false to set; undefined to inherit' },
      ],
    },

    // ===== Event =====
    {
      type: 'event.add',
      description: 'Add a ComponentEvent (trigger + actions) to a node',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'event', type: 'ComponentEvent', required: true, description: 'Event with trigger and Action[]' },
      ],
    },
    {
      type: 'event.remove',
      description: 'Remove a ComponentEvent by index',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'eventIndex', type: 'number', required: true, description: 'Event index in node.events' },
      ],
    },
    {
      type: 'event.update',
      description: 'Update a ComponentEvent in place (replace fields specified in event patch)',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'eventIndex', type: 'number', required: true, description: 'Event index' },
        { name: 'event', type: 'Partial<ComponentEvent>', required: true, description: 'Patch' },
      ],
    },
    {
      type: 'event.addNavigation',
      description: 'Convenience: add a click (or doubleClick) event whose only action is nav.go',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'trigger', type: "'click' | 'doubleClick'", required: true, description: 'Trigger' },
        { name: 'targetScreenId', type: 'string', required: true, description: 'Target screen id, or "new" to auto-create' },
      ],
    },

    // ===== Screen / Viewport =====
    { type: 'screen.add', description: 'Add a new screen', category: 'screen',
      params: [{ name: 'name', type: 'string', required: true, description: 'Screen name' }] },
    { type: 'screen.remove', description: 'Remove a screen (cannot remove the last one)', category: 'screen',
      params: [{ name: 'screenId', type: 'string', required: true, description: 'Screen ID' }] },
    { type: 'screen.setActive', description: 'Set active screen (UI-only; recorded)', category: 'screen',
      params: [{ name: 'screenId', type: 'string', required: true, description: 'Screen ID' }] },
    { type: 'screen.rename', description: 'Rename a screen', category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'name', type: 'string', required: true, description: 'New name' },
      ] },
    { type: 'screen.reorder', description: 'Reorder screens', category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'newIndex', type: 'number', required: true, description: 'New index (0-based)' },
      ] },
    { type: 'viewport.switch', description: 'Switch current viewport', category: 'viewport',
      params: [{ name: 'viewport', type: 'Viewport', required: true, description: 'New viewport' }] },
    { type: 'viewport.addPreset', description: 'Add a viewport preset', category: 'viewport',
      params: [{ name: 'viewport', type: 'Viewport', required: true, description: 'Preset viewport' }] },

    // ===== Asset / Template =====
    { type: 'asset.instantiateTemplate', description: 'Instantiate a component template into a parent', category: 'asset',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'Template ID' },
        { name: 'parentId', type: 'string', required: true, description: 'Parent node ID' },
        { name: 'position', type: 'number', required: false, description: 'Insert position' },
        { name: 'mode', type: "'reference' | 'detached'", required: false, description: 'Instantiation mode' },
      ] },
    { type: 'asset.saveAsTemplate', description: 'Save a node subtree as a template', category: 'asset',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node to template' },
        { name: 'name', type: 'string', required: true, description: 'Template name' },
        { name: 'category', type: 'string', required: true, description: 'Template category' },
      ] },
    { type: 'asset.detachInstance', description: 'Detach a component instance from its template', category: 'asset',
      params: [{ name: 'nodeId', type: 'string', required: true, description: 'Node ID' }] },
    { type: 'asset.syncInstance', description: 'Sync a component instance from the latest template', category: 'asset',
      params: [{ name: 'nodeId', type: 'string', required: true, description: 'Node ID' }] },

    { type: 'template.update', description: 'Update template metadata or prop bindings', category: 'template',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'Template ID' },
        { name: 'patch', type: 'object', required: true, description: 'Fields to update' },
      ] },
    { type: 'template.delete', description: 'Delete a template', category: 'template',
      params: [{ name: 'templateId', type: 'string', required: true, description: 'Template ID' }] },
    { type: 'template.duplicate', description: 'Duplicate a template', category: 'template',
      params: [
        { name: 'sourceTemplateId', type: 'string', required: true, description: 'Source template ID' },
        { name: 'newName', type: 'string', required: false, description: 'Optional new name' },
      ] },

    // ===== Component Props =====
    { type: 'componentProps.update', description: 'Update component instance props', category: 'componentProps',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'props', type: 'Record<string, unknown>', required: true, description: 'Props to merge' },
      ] },
    { type: 'componentProps.addDefinition', description: 'Add a prop definition to a template', category: 'componentProps',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'Template ID' },
        { name: 'definition', type: 'ComponentPropDefinition', required: true, description: 'Prop definition' },
      ] },
    { type: 'componentProps.removeDefinition', description: 'Remove a prop definition from a template', category: 'componentProps',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'Template ID' },
        { name: 'propKey', type: 'string', required: true, description: 'Prop key' },
      ] },

    // ===== Annotation / Material =====
    { type: 'annotation.add', description: 'Add an annotation (comment) node', category: 'annotation',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'Parent node ID' },
        { name: 'content', type: 'string', required: true, description: 'Annotation text' },
      ] },
    { type: 'annotation.remove', description: 'Remove an annotation', category: 'annotation',
      params: [{ name: 'annotationId', type: 'string', required: true, description: 'Annotation node ID' }] },

    { type: 'material.applyDesign', description: 'Batch apply material-editor design (styles + props + materialProjectId) to a node', category: 'material',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID' },
        { name: 'styleUpdates', type: 'Partial<CSSProperties>', required: false, description: 'Styles to merge' },
        { name: 'propUpdates', type: 'object', required: false, description: 'Props to merge' },
        { name: 'clearStyleKeys', type: 'string[]', required: false, description: 'Style keys to remove before applying updates' },
        { name: 'materialProjectId', type: 'string', required: false, description: 'Material project ID to link' },
      ] },

    // ===== Data Source =====
    { type: 'dataSource.add', description: 'Add a data source (static or api with endpoint+mock) to a screen', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSource', type: 'StaticDataSource | ApiDataSource', required: true, description: 'Complete data source object' },
      ] },
    { type: 'dataSource.remove', description: 'Remove a data source', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
      ] },
    { type: 'dataSource.update', description: 'Update data source name / description / autoFetchOnEnter', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'name', type: 'string', required: false, description: 'New name' },
        { name: 'description', type: 'string', required: false, description: 'New description' },
        { name: 'autoFetchOnEnter', type: 'boolean', required: false, description: 'Api-only: auto-fetch on screenEnter' },
      ] },
    { type: 'dataSource.setEndpoint', description: 'Replace the endpoint of an api data source', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'endpoint', type: 'ApiEndpoint', required: true, description: 'New endpoint (method/path/headers/query/body/responseSchema/networkPolicy)' },
      ] },
    { type: 'dataSource.setNetworkPolicy', description: 'Set / clear the network-layer policy (timeout / retry) of an api data source. Finer granularity than setEndpoint—only touches endpoint.networkPolicy without resetting other endpoint fields.', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'networkPolicy', type: 'NetworkPolicy | null', required: true, description: 'Policy { timeout?, retryCount?, retryDelay?, retryOn? }, or null to clear' },
      ] },
    { type: 'dataSource.setDefaultParams', description: 'Set / clear defaultParams of an api data source', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'defaultParams', type: 'object | null', required: true, description: 'New params, or null to clear' },
      ] },
    { type: 'dataSource.setStaticInitial', description: 'Replace a static data source initial payload', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'initial', type: 'unknown', required: true, description: 'New initial value' },
      ] },
    { type: 'dataSource.addMockScenario', description: 'Add a mock scenario to an api data source', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'scenario', type: 'MockScenario', required: true, description: 'Scenario (id + name + statusCode + delay + responseBody)' },
      ] },
    { type: 'dataSource.updateMockScenario', description: 'Update a mock scenario', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'scenarioId', type: 'string', required: true, description: 'Scenario ID' },
        { name: 'changes', type: 'Partial<MockScenario>', required: true, description: 'Patch' },
      ] },
    { type: 'dataSource.removeMockScenario', description: 'Remove a mock scenario', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'scenarioId', type: 'string', required: true, description: 'Scenario ID' },
      ] },
    { type: 'dataSource.switchMockScenario', description: 'Switch active mock scenario', category: 'dataSource',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'dataSourceId', type: 'string', required: true, description: 'Data source ID' },
        { name: 'scenarioId', type: 'string', required: true, description: 'Scenario ID' },
      ] },

    // ===== Screen State (stateInit.view / stateInit.data) =====
    { type: 'screenState.addViewVariable', description: 'Add a view variable definition to a screen (Screen.stateInit.view)', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'variable', type: 'ViewVariableDef', required: true, description: 'Variable definition (name + defaultValue + optional label/enum/previewValue)' },
      ] },
    { type: 'screenState.removeViewVariable', description: 'Remove a view variable', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
      ] },
    { type: 'screenState.updateViewVariable', description: 'Patch a view variable definition', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
        { name: 'patch', type: '{ label?; defaultValue?; enum? }', required: true, description: 'Patch' },
      ] },
    { type: 'screenState.setViewPreview', description: 'Set editor-only preview value for a view variable', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
        { name: 'previewValue', type: 'unknown', required: true, description: 'Preview value (undefined to clear)' },
      ] },
    { type: 'screenState.setDataInit', description: 'Set a stateInit.data entry (constant initial value)', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'key', type: 'string', required: true, description: 'Data key' },
        { name: 'value', type: 'unknown', required: true, description: 'Initial value' },
      ] },
    { type: 'screenState.removeDataInit', description: 'Remove a stateInit.data entry', category: 'screenState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'Screen ID' },
        { name: 'key', type: 'string', required: true, description: 'Data key' },
      ] },

    // ===== Global State =====
    { type: 'globalState.addViewVariable', description: 'Add a project-level view variable (DesignProject.globalStateInit.view)', category: 'globalState',
      params: [
        { name: 'variable', type: 'ViewVariableDef', required: true, description: 'Variable definition' },
      ] },
    { type: 'globalState.removeViewVariable', description: 'Remove a global view variable', category: 'globalState',
      params: [{ name: 'name', type: 'string', required: true, description: 'Variable name' }] },
    { type: 'globalState.updateViewVariable', description: 'Patch a global view variable', category: 'globalState',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
        { name: 'patch', type: '{ label?; defaultValue?; enum? }', required: true, description: 'Patch' },
      ] },
    { type: 'globalState.setViewPreview', description: 'Set editor-only preview value for a global variable', category: 'globalState',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Variable name' },
        { name: 'previewValue', type: 'unknown', required: true, description: 'Preview value (undefined to clear)' },
      ] },
  ];
}
