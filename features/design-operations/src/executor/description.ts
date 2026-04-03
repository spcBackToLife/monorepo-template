import type { OperationDescription } from '../types';

/**
 * Returns structured descriptions of all available operations.
 * This is used by MCP Server to register Tools and by AI to understand available actions.
 */
export function getAvailableOperations(): OperationDescription[] {
  return [
    // ===== Element Operations =====
    {
      type: 'addElement',
      description: 'Add a new element (div, button, img, etc.) as a child of an existing node',
      category: 'element',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'ID of the parent node to add the element to' },
        { name: 'tag', type: 'string', required: true, description: 'HTML tag type (div, span, p, h1, h2, h3, button, input, textarea, select, img, a, ul, ol, li, nav, header, footer, section, main)' },
        { name: 'styles', type: 'CSSProperties', required: false, description: 'Initial CSS styles to apply' },
        { name: 'props', type: 'object', required: false, description: 'Element-specific props (e.g., src for img, placeholder for input)' },
        { name: 'position', type: 'number', required: false, description: 'Insert position among siblings (default: append to end)' },
      ],
    },
    {
      type: 'removeElement',
      description: 'Remove an element and all its children from the design tree',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'ID of the element to remove' },
      ],
    },
    {
      type: 'moveElement',
      description: 'Move an element from its current parent to a new parent node',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'ID of the element to move' },
        { name: 'newParentId', type: 'string', required: true, description: 'ID of the new parent node' },
        { name: 'position', type: 'number', required: false, description: 'Insert position in the new parent (default: append to end)' },
      ],
    },
    {
      type: 'duplicateElement',
      description: 'Create a deep copy of an element (and its children) and insert it after the original',
      category: 'element',
      params: [
        { name: 'elementId', type: 'string', required: true, description: 'ID of the element to duplicate' },
      ],
    },
    {
      type: 'insertSubtree',
      description: 'Insert a serialized ComponentNode subtree under a parent (paste); all IDs are regenerated',
      category: 'element',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'Parent node id' },
        { name: 'subtree', type: 'ComponentNode', required: true, description: 'Full node tree to insert' },
        { name: 'position', type: 'number', required: false, description: 'Sibling index (default: append)' },
      ],
    },
    {
      type: 'renameNode',
      description: 'Rename a node for better readability in the layer tree',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the node to rename' },
        { name: 'name', type: 'string', required: true, description: 'New display name' },
      ],
    },
    {
      type: 'wrapInContainer',
      description: 'Wrap one or more sibling elements in a new container element',
      category: 'element',
      params: [
        { name: 'nodeIds', type: 'string[]', required: true, description: 'IDs of the sibling nodes to wrap (must share the same parent)' },
        { name: 'containerTag', type: 'string', required: false, description: 'HTML tag for the container (default: "div")' },
        { name: 'containerStyles', type: 'CSSProperties', required: false, description: 'Initial CSS styles for the container' },
      ],
    },
    {
      type: 'unwrapContainer',
      description: 'Remove a container element and move its children to the container\'s parent',
      category: 'element',
      params: [
        { name: 'containerId', type: 'string', required: true, description: 'ID of the container element to unwrap' },
      ],
    },
    {
      type: 'reorderElement',
      description: 'Change the position of an element among its siblings within the same parent',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the element to reorder' },
        { name: 'parentId', type: 'string', required: true, description: 'ID of the parent node' },
        { name: 'newIndex', type: 'number', required: true, description: 'New position index among siblings' },
      ],
    },
    {
      type: 'changeElementType',
      description: 'Change the HTML tag type of an element while preserving its styles, children, and other properties',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the element to change' },
        { name: 'newType', type: 'string', required: true, description: 'New HTML tag type (div, span, p, section, etc.)' },
      ],
    },
    {
      type: 'setNodeVisibilityWhen',
      description:
        'Set or clear a conditional visibility rule: node is shown only when the screen global state variable equals a given value (ComponentNode.visibilityWhen)',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Target node id' },
        {
          name: 'visibilityWhen',
          type: '{ variableName: string; equals: string } | null',
          required: true,
          description: 'Rule to set, or null to remove the rule',
        },
      ],
    },
    {
      type: 'setNodeLocked',
      description:
        'Set editor lock on a node (ComponentNode.locked). Locked nodes and their descendants cannot be moved/resized on canvas; ancestors lock applies to children.',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Target node id' },
        { name: 'locked', type: 'boolean', required: true, description: 'Whether the node is locked' },
      ],
    },
    {
      type: 'setNodeVisible',
      description:
        'Set editor visibility (ComponentNode.visible). When false, the node is not rendered on the canvas (editor-only, not CSS visibility).',
      category: 'element',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'Target node id' },
        { name: 'visible', type: 'boolean', required: true, description: 'Whether the node is visible in the editor' },
      ],
    },

    // ===== Style Operations =====
    {
      type: 'updateStyle',
      description: 'Update CSS styles on a node (merges with existing styles)',
      category: 'style',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'styles', type: 'CSSProperties', required: true, description: 'CSS properties to set or update (e.g., { backgroundColor: "#ff0000", padding: "16px" })' },
      ],
    },
    {
      type: 'resetStyle',
      description: 'Remove specific CSS properties from a node, reverting them to browser defaults',
      category: 'style',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'properties', type: 'string[]', required: true, description: 'List of CSS property names to remove (e.g., ["backgroundColor", "padding"])' },
      ],
    },
    {
      type: 'batchUpdateStyle',
      description: 'Update CSS styles on multiple nodes in a single operation',
      category: 'style',
      params: [
        { name: 'updates', type: 'Array<{ nodeId: string; styles: CSSProperties }>', required: true, description: 'Array of style updates, each with a nodeId and styles object to merge' },
      ],
    },

    // ===== State Operations =====
    {
      type: 'addState',
      description: 'Add a new visual state to a component (e.g., hover, pressed, disabled)',
      category: 'state',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'stateName', type: 'string', required: true, description: 'Name for the new state (e.g., "hover", "pressed", "disabled")' },
        { name: 'styles', type: 'CSSProperties', required: false, description: 'CSS overrides for this state' },
        { name: 'props', type: 'object', required: false, description: 'Prop overrides for this state' },
        { name: 'transition', type: 'object', required: false, description: 'Optional CSS transition when entering this state (duration ms, easing, properties[])' },
      ],
    },
    {
      type: 'removeState',
      description: 'Remove a visual state from a component',
      category: 'state',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'stateName', type: 'string', required: true, description: 'Name of the state to remove' },
      ],
    },
    {
      type: 'updateState',
      description: 'Update the style/prop overrides of an existing state',
      category: 'state',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'stateName', type: 'string', required: true, description: 'Name of the state to update' },
        { name: 'styles', type: 'CSSProperties', required: true, description: 'New CSS overrides to merge' },
        { name: 'props', type: 'object', required: false, description: 'New prop overrides to merge' },
        { name: 'transition', type: 'object', required: false, description: 'Transition config to merge (duration, easing, properties)' },
      ],
    },
    {
      type: 'setActiveState',
      description: 'Switch the active visual state of a component (for preview)',
      category: 'state',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'stateName', type: 'string', required: true, description: 'Name of the state to activate (use "default" for the base state)' },
      ],
    },

    // ===== Event Operations =====
    {
      type: 'addEvent',
      description: 'Add an interaction event to a component (e.g., click handler)',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'event', type: 'ComponentEvent', required: true, description: 'Event object with trigger (click/hover/focus/blur/longPress) and actions array (navigate/setState/openUrl/custom/setGlobalState/toggleVisible). Supports optional condition and description.' },
      ],
    },
    {
      type: 'removeEvent',
      description: 'Remove an interaction event from a component by its index',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'eventIndex', type: 'number', required: true, description: 'Index of the event to remove' },
      ],
    },
    {
      type: 'updateEvent',
      description: 'Update an existing interaction event in-place (change trigger and/or action without removing)',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'eventIndex', type: 'number', required: true, description: 'Index of the event to update' },
        { name: 'event', type: 'Partial<ComponentEvent>', required: true, description: 'Partial event object — only provided fields are updated (trigger, actions, condition, description, disabled)' },
      ],
    },
    {
      type: 'addNavigation',
      description: 'Add a click-to-navigate event. If targetScreenId is "new", a new screen is automatically created',
      category: 'event',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the element that triggers navigation' },
        { name: 'trigger', type: 'string', required: true, description: 'Event trigger (usually "click")' },
        { name: 'targetScreenId', type: 'string', required: true, description: 'ID of the target screen, or "new" to auto-create a new screen' },
      ],
    },

    // ===== Screen Operations =====
    {
      type: 'addScreen',
      description: 'Add a new empty screen to the project',
      category: 'screen',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Name for the new screen (e.g., "Home", "Login", "Profile")' },
      ],
    },
    {
      type: 'removeScreen',
      description: 'Remove a screen from the project (cannot remove the last screen)',
      category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to remove' },
      ],
    },
    {
      type: 'setActiveScreen',
      description: 'Switch the currently active screen in the editor',
      category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to activate' },
      ],
    },
    {
      type: 'renameScreen',
      description: 'Rename a screen (page) in the project',
      category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to rename' },
        { name: 'name', type: 'string', required: true, description: 'New screen name' },
      ],
    },
    {
      type: 'reorderScreen',
      description: 'Change the position of a screen in the project screen list',
      category: 'screen',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to reorder' },
        { name: 'newIndex', type: 'number', required: true, description: 'New position index in the screen list' },
      ],
    },

    // ===== Viewport Operations =====
    {
      type: 'switchViewport',
      description: 'Switch the current viewport (device preview size)',
      category: 'viewport',
      params: [
        { name: 'viewport', type: 'Viewport', required: true, description: 'Viewport object with name, width, height, devicePixelRatio, platform' },
      ],
    },
    {
      type: 'addViewportPreset',
      description: 'Add a custom viewport preset for quick switching',
      category: 'viewport',
      params: [
        { name: 'viewport', type: 'Viewport', required: true, description: 'Viewport preset to add' },
      ],
    },

    // ===== Asset Operations =====
    {
      type: 'instantiateTemplate',
      description: 'Create an instance of a reusable component template and add it to a parent node',
      category: 'asset',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'ID of the component template to instantiate' },
        { name: 'parentId', type: 'string', required: true, description: 'ID of the parent node to insert the instance into' },
        { name: 'position', type: 'number', required: false, description: 'Insert position among siblings' },
        { name: 'mode', type: 'string', required: false, description: 'Instance mode: "reference" (syncs with template) or "detached" (independent)' },
      ],
    },
    {
      type: 'saveAsTemplate',
      description: 'Save an existing node subtree as a reusable component template',
      category: 'asset',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the node to save as template' },
        { name: 'name', type: 'string', required: true, description: 'Template name' },
        { name: 'category', type: 'string', required: true, description: 'Category for grouping (e.g., "navigation", "form", "card")' },
        { name: 'tags', type: 'string[]', required: false, description: 'Searchable tags' },
        { name: 'description', type: 'string', required: false, description: 'Template description' },
        { name: 'scope', type: 'string', required: false, description: 'Availability scope: "project" (default), "team", or "global"' },
      ],
    },
    {
      type: 'detachInstance',
      description: 'Detach a component instance from its template (making it independent)',
      category: 'asset',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the component instance to detach' },
      ],
    },
    {
      type: 'syncInstance',
      description: 'Sync a component instance with the latest version of its template',
      category: 'asset',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the component instance to sync' },
      ],
    },

    // ===== Global State Operations =====
    {
      type: 'setGlobalState',
      description: 'Set the runtime value of a global state variable on a screen (UI-only, not persisted)',
      category: 'globalState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen' },
        { name: 'variableName', type: 'string', required: true, description: 'Name of the global state variable' },
        { name: 'value', type: 'string', required: true, description: 'New value for the variable' },
      ],
    },
    {
      type: 'addGlobalStateVariable',
      description: 'Add a new global state variable definition to a screen',
      category: 'globalState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to add the variable to' },
        { name: 'name', type: 'string', required: true, description: 'Variable name (unique within the screen)' },
        { name: 'values', type: 'string[]', required: true, description: 'All possible values for this variable' },
        { name: 'defaultValue', type: 'string', required: true, description: 'Default / initial value' },
        { name: 'description', type: 'string', required: false, description: 'Human-readable description' },
      ],
    },
    {
      type: 'removeGlobalStateVariable',
      description: 'Remove a global state variable definition from a screen',
      category: 'globalState',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen' },
        { name: 'variableName', type: 'string', required: true, description: 'Name of the variable to remove' },
      ],
    },
    {
      type: 'addGlobalStateBinding',
      description: 'Add a binding from a global state variable value to style/prop/visible overrides on a node',
      category: 'globalState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'binding', type: 'GlobalStateBinding', required: true, description: 'Binding object with id, variableName, value, and optional styles/props/visible overrides' },
      ],
    },
    {
      type: 'removeGlobalStateBinding',
      description: 'Remove a global state binding from a node by its binding ID',
      category: 'globalState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'bindingId', type: 'string', required: true, description: 'ID of the binding to remove' },
      ],
    },
    {
      type: 'updateGlobalStateBinding',
      description: 'Update the styles/props/visible overrides of an existing global state binding',
      category: 'globalState',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'bindingId', type: 'string', required: true, description: 'ID of the binding to update' },
        { name: 'patch', type: 'object', required: true, description: 'Partial update with optional styles, props, and visible fields' },
      ],
    },

    // ===== Component Props Operations =====
    {
      type: 'updateComponentProps',
      description: 'Update props on a component node (merges with existing props)',
      category: 'componentProps',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'props', type: 'object', required: true, description: 'Props to set or update' },
      ],
    },
    {
      type: 'addPropDefinition',
      description: 'Add a prop definition to a component template',
      category: 'componentProps',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'ID of the component template' },
        { name: 'definition', type: 'ComponentPropDefinition', required: true, description: 'Prop definition with key, type, label, defaultValue, and optional group/description/enumValues/required' },
      ],
    },
    {
      type: 'removePropDefinition',
      description: 'Remove a prop definition from a component template by its key',
      category: 'componentProps',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'ID of the component template' },
        { name: 'propKey', type: 'string', required: true, description: 'Key of the prop definition to remove' },
      ],
    },

    // ===== Data Operations =====
    {
      type: 'addDataSet',
      description: 'Add a new data set to a screen for data-driven design',
      category: 'data',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen to add the data set to' },
        { name: 'dataSet', type: 'DataSet', required: true, description: 'Data set object with id, name, data, and optional description' },
      ],
    },
    {
      type: 'removeDataSet',
      description: 'Remove a data set from a screen',
      category: 'data',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen' },
        { name: 'dataSetId', type: 'string', required: true, description: 'ID of the data set to remove' },
      ],
    },
    {
      type: 'updateDataSet',
      description: 'Update a data set: replace data and/or name and/or description (at least one field)',
      category: 'data',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen' },
        { name: 'dataSetId', type: 'string', required: true, description: 'ID of the data set to update' },
        { name: 'data', type: 'object', required: false, description: 'New JSON object to replace existing data' },
        { name: 'name', type: 'string', required: false, description: 'New display name' },
        { name: 'description', type: 'string', required: false, description: 'New description text' },
      ],
    },
    {
      type: 'switchDataSet',
      description: 'Switch the active data set on a screen for preview',
      category: 'data',
      params: [
        { name: 'screenId', type: 'string', required: true, description: 'ID of the screen' },
        { name: 'dataSetId', type: 'string', required: true, description: 'ID of the data set to activate' },
      ],
    },
    {
      type: 'bindData',
      description: 'Bind a data expression to a node prop (e.g., "{{data.user.name}}")',
      category: 'data',
      params: [
        { name: 'nodeId', type: 'string', required: true, description: 'ID of the target node' },
        { name: 'propKey', type: 'string', required: true, description: 'Prop key to bind the expression to' },
        { name: 'expression', type: 'string', required: true, description: 'Data binding expression (e.g., "{{data.user.name}}")' },
      ],
    },

    // ===== Template Operations =====
    {
      type: 'updateTemplate',
      description:
        'Update metadata and/or propBindings of an existing component template (name, category, tags, description, thumbnail, propBindings). Successful updates bump template version.',
      category: 'asset',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'ID of the template to update' },
        {
          name: 'patch',
          type: 'object',
          required: true,
          description:
            'Partial update: name, category, tags, description, thumbnail (URL/base64/asset://), propBindings (array of { propKey, targetNodePath, targetField, targetKey })',
        },
      ],
    },
    {
      type: 'deleteTemplate',
      description: 'Delete a component template from the project asset library',
      category: 'asset',
      params: [
        { name: 'templateId', type: 'string', required: true, description: 'ID of the template to delete' },
      ],
    },
    {
      type: 'duplicateTemplate',
      description: 'Create a copy of an existing component template with a new ID and optional new name',
      category: 'asset',
      params: [
        { name: 'sourceTemplateId', type: 'string', required: true, description: 'ID of the template to duplicate' },
        { name: 'newName', type: 'string', required: false, description: 'Name for the duplicated template (default: "<original> (Copy)")' },
      ],
    },

    // ===== Annotation Operations =====
    {
      type: 'addAnnotation',
      description: 'Add an annotation node to a parent element for design notes and comments',
      category: 'annotation',
      params: [
        { name: 'parentId', type: 'string', required: true, description: 'ID of the parent node to attach the annotation to' },
        { name: 'content', type: 'string', required: true, description: 'Annotation text content' },
        { name: 'author', type: 'string', required: false, description: 'Author of the annotation' },
        { name: 'styles', type: 'CSSProperties', required: false, description: 'Custom styles for the annotation node' },
        { name: 'position', type: 'number', required: false, description: 'Insert position among siblings' },
      ],
    },
    {
      type: 'removeAnnotation',
      description: 'Remove an annotation node from the design tree',
      category: 'annotation',
      params: [
        { name: 'annotationId', type: 'string', required: true, description: 'ID of the annotation to remove' },
      ],
    },
  ];
}
