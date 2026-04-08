/**
 * MaterialProjectState — 不可变状态持有器
 *
 * 与 design-operations/executor/state.ts 同构。
 */

import type { MaterialProjectSchema } from '../schema';
import { deepClone } from '../utils';

export class MaterialProjectState {
  private _current: MaterialProjectSchema;

  constructor(project: MaterialProjectSchema) {
    this._current = deepClone(project);
  }

  get current(): MaterialProjectSchema {
    return this._current;
  }

  set current(project: MaterialProjectSchema) {
    this._current = project;
  }

  snapshot(): MaterialProjectSchema {
    return deepClone(this._current);
  }
}
