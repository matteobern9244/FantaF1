import { parseFormulaOneDriversPage } from '../backend/drivers.js';
const text = `
          <a href="/en/drivers/max-verstappen">
            <img src="https://media.formula1.com/image/upload/v1/common/f1/2026/red-bull-racing/image.webp" />
            <span class="typography-module_body-m-compact-regular__abc">Max</span>
            <span class="typography-module_body-m-compact-bold__def">Verstappen</span>
          </a>`;
console.log(parseFormulaOneDriversPage(text));
