import type { ActionStepIR } from '../../core/types';
import { makeIndent } from './index';

/**
 * Emit the body of a handler function — the ordered action steps.
 *
 * Each step is translated to React-idiomatic code.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 9a, 9d
 */
export function emitHandlerBody(steps: ActionStepIR[], baseDepth: number): string[] {
  const lines: string[] = [];
  // Track fetch step count to generate unique result variable names
  let fetchCounter = 0;

  for (const step of steps) {
    lines.push(...emitStep(step, baseDepth, fetchCounter));
    if (step.kind === 'fetch') fetchCounter++;
  }

  return lines;
}

function emitStep(step: ActionStepIR, depth: number, fetchIndex: number = 0): string[] {
  const pad = makeIndent(depth);
  const lines: string[] = [];

  switch (step.kind) {
    case 'state-set':
      lines.push(`${pad}${step.setter}(${step.value});`);
      break;

    case 'state-append':
      lines.push(`${pad}${step.setter}(prev => [...prev, ${step.value}]);`);
      break;

    case 'state-toggle':
      lines.push(`${pad}${step.setter}(prev => !prev);`);
      break;

    case 'state-remove': {
      if (step.predicate) {
        lines.push(`${pad}${step.setter}(prev => prev.filter(${step.predicate}));`);
      } else if (step.index !== undefined) {
        lines.push(`${pad}${step.setter}(prev => prev.filter((_, i) => i !== ${step.index}));`);
      } else {
        lines.push(`${pad}${step.setter}(prev => prev.slice(0, -1));`);
      }
      break;
    }

    case 'fetch': {
      const { serviceName, params, resultVar: baseResultVar, onSuccess, onError } = step;
      // Unique result variable name to avoid redeclaration with sequential fetches
      const resultVar = fetchIndex === 0 ? (baseResultVar || 'result') : `result${fetchIndex + 1}`;
      const callExpr = params
        ? `await ${serviceName}(${params})`
        : `await ${serviceName}()`;

      if (onError && onError.length > 0) {
        lines.push(`${pad}try {`);
        lines.push(`${pad}  const ${resultVar} = ${callExpr};`);
        if (onSuccess && onSuccess.length > 0) {
          let nestedFetchIdx = 0;
          for (const s of onSuccess) {
            lines.push(...emitStep(s, depth + 1, nestedFetchIdx));
            if (s.kind === 'fetch') nestedFetchIdx++;
          }
        }
        lines.push(`${pad}} catch (error) {`);
        let errorFetchIdx = 0;
        for (const s of onError) {
          lines.push(...emitStep(s, depth + 1, errorFetchIdx));
          if (s.kind === 'fetch') errorFetchIdx++;
        }
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}const ${resultVar} = ${callExpr};`);
        if (onSuccess && onSuccess.length > 0) {
          let nestedFetchIdx = 0;
          for (const s of onSuccess) {
            lines.push(...emitStep(s, depth, nestedFetchIdx));
            if (s.kind === 'fetch') nestedFetchIdx++;
          }
        }
      }
      break;
    }

    case 'navigate':
      lines.push(`${pad}navigate(${JSON.stringify(step.path)});`);
      break;

    case 'navigate-back':
      lines.push(`${pad}navigate(-1);`);
      break;

    case 'toast': {
      const { toastType, message, duration } = step;
      // message is already a compiled JS expression, don't wrap in extra quotes
      if (duration) {
        lines.push(`${pad}toast.${toastType}(${message}, { duration: ${duration} });`);
      } else {
        lines.push(`${pad}toast.${toastType}(${message});`);
      }
      break;
    }

    case 'delay':
      lines.push(`${pad}await new Promise(resolve => setTimeout(resolve, ${step.ms}));`);
      break;

    default:
      // Exhaustive check — if new step kinds are added, TypeScript will warn
      lines.push(`${pad}// TODO: unhandled step kind`);
  }

  return lines;
}
