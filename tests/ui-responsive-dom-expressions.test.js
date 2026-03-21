/**
 * @vitest-environment jsdom
 */
/* global window, document */
import { describe, expect, it } from 'vitest';
import { inspectStateExpression } from '../scripts/ui-responsive/dom-expressions.mjs';

function evaluateInspectStateExpression() {
  const inspectState = Function(`return (${inspectStateExpression});`)();
  return inspectState();
}

describe('responsive UI DOM expressions', () => {
  it('detects admin controls on the admin predictions route', () => {
    window.history.replaceState({}, '', '/pronostici');
    document.body.innerHTML = `
      <aside class="app-sidebar"></aside>
      <div class="sidebar-footer">
        <button class="sidebar-item" aria-pressed="true">Pubblica</button>
      </div>
      <header class="hero-panel"></header>
      <section class="hero-summary-grid"></section>
      <section id="predictions-section" class="panel nav-section">
        <div class="results-grid">
          <div class="field-row">
            <label for="result-first">Risultato 1°</label>
            <select id="result-first">
              <option value="">Seleziona un pilota</option>
            </select>
          </div>
        </div>
        <div class="predictions-grid">
          <article class="user-card interactive-surface">
            <label for="prediction-first">Vincitore gara</label>
            <select id="prediction-first">
              <option value="">Seleziona un pilota</option>
            </select>
          </article>
        </div>
        <div class="stacked-actions">
          <button class="primary-button" type="button">Salva pronostici</button>
        </div>
      </section>
      <footer class="app-footer"></footer>
    `;

    const state = evaluateInspectStateExpression();

    expect(state.routePath).toBe('/pronostici');
    expect(state.viewMode.adminControlsPresent).toBe(true);
  });
});
