/**
 * Guards the stylesheet invariants that JS behavior depends on. Jest stubs
 * CSS imports, so these checks apply the real file to a live document.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8');

describe('app styles', () => {
  it('keeps the hidden attribute stronger than component display rules', () => {
    // The toolbar hides "Clear completed" with the hidden attribute. Without
    // the final `[hidden]` rule, `.btn { display: inline-block }` wins and
    // the button stays visible.
    const host = document.createElement('div');
    const style = document.createElement('style');
    const button = document.createElement('button');
    style.textContent = css;
    button.className = 'btn';
    button.hidden = true;
    host.append(style, button);
    document.body.append(host);

    try {
      expect(getComputedStyle(button).display).toBe('none');

      button.hidden = false;
      expect(getComputedStyle(button).display).not.toBe('none');
    } finally {
      host.remove();
    }
  });
});
