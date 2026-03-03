import { parseSeasonCalendarPage } from '../backend/calendar.js';
const currentYear = new Date().getFullYear();
const fakeSeasonHtml = Array.from({ length: 24 }).map((_, i) => `
      <a href="/en/racing/${currentYear}/race-${i}" class="group">
        ROUND ${i + 1}
        01 - 03 JAN
        FORMULA 1 RACE ${i} ${currentYear}
        <img src="card.webp" />
      </a>
    `).join('');
console.log(parseSeasonCalendarPage(fakeSeasonHtml, currentYear).length);
