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
        { name: 'event', type: 'ComponentEvent', required: true, description: 'Event object with trigger (click/hover/focus/blur/longPress) and action (navigate/setState/openUrl/custom)' },
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
  ];
}
