import type { ActionStepIR } from '../../core/types';
import { makeIndent } from './index';

/**
 * Emit the body of a handler function — the ordered action steps.
 *
 * Each step is translated to React-idiomatic code.
 */
export function emitHandlerBody(steps: ActionStepIR[], baseDepth: number): string[] {
  const lines: string[] = [];

  for (const step of steps) {
    lines.push(...emitStep(step, baseDepth));
  }

  return lines;
}

function emitStep(step: ActionStepIR, depth: number): string[] {
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
      const { serviceName, params, resultVar, onSuccess, onError } = step;
      const callExpr = params
        ? `await ${serviceName}(${params})`
        : `await ${serviceName}()`;

      if (onError && onError.length > 0) {
        lines.push(`${pad}try {`);
        lines.push(`${pad}  const ${resultVar} = ${callExpr};`);
        if (onSuccess && onSuccess.length > 0) {
          for (const s of onSuccess) {
            lines.push(...emitStep(s, depth + 1));
          }
        }
        lines.push(`${pad}} catch (error) {`);
        for (const s of onError) {
          lines.push(...emitStep(s, depth + 1));
        }
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}const ${resultVar} = ${callExpr};`);
        if (onSuccess && onSuccess.length > 0) {
          for (const s of onSuccess) {
            lines.push(...emitStep(s, depth));
          }
        }
      }
      break;
    }

    case 'navigate':
      lines.push(`${pad}navigate('${step.path}');`);
      break;

    case 'navigate-back':
      lines.push(`${pad}navigate(-1);`);
      break;

    case 'toast': {
      const { toastType, message, duration } = step;
      if (duration) {
        lines.push(`${pad}toast.${toastType}('${message}', { duration: ${duration} });`);
      } else {
        lines.push(`${pad}toast.${toastType}('${message}');`);
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
