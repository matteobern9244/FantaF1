import { describe, it, expect } from 'vitest';
import { parseRaceDetailPage } from '../backend/calendar';

describe('Race Sessions Parsing', () => {
  it('extracts all sessions with correct names and times from HTML content', () => {
    const html = `
      <html>
        <body>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "SportsEvent",
              "name": "Practice 1 - Australia",
              "description": "Some description",
              "image": { "@type": "ImageObject", "url": "..." },
              "startDate": "2026-03-06T02:30:00Z"
            }
          </script>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "SportsEvent",
              "name": "Practice 2 - Australia",
              "description": "Some description",
              "startDate": "2026-03-06T06:00:00Z"
            }
          </script>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "SportsEvent",
              "name": "Race - Australia",
              "startDate": "2026-03-08T04:00:00Z"
            }
          </script>
        </body>
      </html>
    `;

    const year = new Date().getFullYear();
    const detail = parseRaceDetailPage(html, 'Australia', 'australia', `${year}-03-08`);
    
    expect(detail.sessions).toBeDefined();
    expect(detail.sessions).toHaveLength(3);
    
    expect(detail.sessions?.[0].name).toBe('Practice 1');
    expect(detail.sessions?.[0].startTime).toBe('2026-03-06T02:30:00Z');
    
    expect(detail.sessions?.[2].name).toBe('Race');
    expect(detail.sessions?.[2].startTime).toBe('2026-03-08T04:00:00Z');
    
    expect(detail.raceStartTime).toBe('2026-03-08T04:00:00Z');
  });

  it('handles empty sessions gracefully', () => {
    const year = new Date().getFullYear();
    const html = `<title>Test GP - F1 Race</title>`;
    const detail = parseRaceDetailPage(html, 'Test', 'test', `${year}-05-10`);
    expect(detail.raceStartTime).toBe(`${year}-05-10T14:00:00Z`);
  });
});
