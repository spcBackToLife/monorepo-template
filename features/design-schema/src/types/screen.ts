import type { ComponentNode } from './node';
import type { GlobalStateVariable } from './state';
import type { DataSet } from './data';

/** A single screen/page in the design project */
export interface Screen {
  /** Unique screen identifier */
  id: string;
  /** Screen name, e.g., "Home", "Login", "Profile" */
  name: string;
  /** Root node of the component tree for this screen */
  rootNode: ComponentNode;
  /** Background color (CSS color value) */
  backgroundColor?: string;
  /** Screen-level global state variable definitions */
  globalStates: GlobalStateVariable[];
  /** Mock data sets for data-driven design */
  dataSets: DataSet[];
  /** Currently active data set ID */
  activeDataSetId: string;
}
