import { parseFormulaOneDriversPage, normalizeDrivers, syncDriversFromOfficialSource } from '../backend/drivers.js';
import fs from 'fs';
const text = `
          <a href="/en/drivers/max-verstappen">
            <img src="https://media.formula1.com/image/upload/v1/common/f1/2026/red-bull-racing/image.webp" />
            <span class="typography-module_body-m-compact-regular__abc">Max</span>
            <span class="typography-module_body-m-compact-bold__def">Verstappen</span>
          </a>
          ${Array.from({ length: 22 }).map((_, i) => `
            <a href="/en/drivers/driver-${i}">
              <img src="https://media.formula1.com/image/upload/v1/common/f1/2026/red-bull-racing/image.webp" />
              <span class="typography-module_body-m-compact-regular__abc">Driver</span>
              <span class="typography-module_body-m-compact-bold__def">${i}</span>
            </a>
          `).join('')}
        `;

import { appConfig } from '../backend/config.js';
appConfig.driversSource.expectedCount = 20; // just to test

async function run() {
  global.fetch = () => Promise.resolve({ ok: true, text: () => text });
  try {
     console.log('Result length:', (await syncDriversFromOfficialSource()).length);
  } catch(e) {
     console.error(e);
  }
}
run();
