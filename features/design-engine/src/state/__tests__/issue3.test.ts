/**
 * Issue 3 Verification Test
 * 
 * Scenario: User clicks a tab that dispatches state.set action.
 * Expected: visibleWhen expression should evaluate to show/hide elements.
 */

import { describe, it, expect } from 'bun:test';
import { evaluateExpression } from '@globallink/design-expression';
import { reduceStateAction } from '../Reducer';
import type { ScreenState } from '@globallink/design-schema';

describe('Issue 3: State mutations trigger re-evaluation', () => {
  const initialState: ScreenState = {
    data: {},
    view: { loginMode: 'username' },
    effects: {},
  };

  it('visibleWhen expression evaluates correctly for state.view changes', () => {
    const expr = "{{ state.view.loginMode === 'password' }}";
    
    // Initial state: loginMode is 'username'
    expect(evaluateExpression(expr, { state: initialState })).toBe(false);
    
    // After state.set({ path: "view.loginMode", value: "password" })
    const newState = reduceStateAction(initialState, {
      type: 'state.set',
      path: 'view.loginMode',
      value: 'password',
    });
    
    expect(evaluateExpression(expr, { state: newState })).toBe(true);
  });

  it('works with nested state.data mutations', () => {
    const state1: ScreenState = {
      data: { user: { role: 'guest' } },
      view: {},
      effects: {},
    };
    
    const expr = "{{ state.data.user.role === 'admin' }}";
    expect(evaluateExpression(expr, { state: state1 })).toBe(false);
    
    // After state.set({ path: "data.user.role", value: "admin" })
    const state2 = reduceStateAction(state1, {
      type: 'state.set',
      path: 'data.user.role',
      value: 'admin',
    });
    
    expect(evaluateExpression(expr, { state: state2 })).toBe(true);
  });

  it('array mutations work correctly with length check', () => {
    const state1: ScreenState = {
      data: { messages: ['hello'] },
      view: {},
      effects: {},
    };
    
    // After state.append
    const state2 = reduceStateAction(state1, {
      type: 'state.append',
      path: 'data.messages',
      value: 'world',
    });
    
    const expr = "{{ state.data.messages.length === 2 }}";
    expect(evaluateExpression(expr, { state: state2 })).toBe(true);
  });
});
