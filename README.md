# The Slow Read Almanac

A shared calendar of slow reads running on Substack, kept by Cams Campbell of [Cam's Campbell Reads](https://camscampbellreads.substack.com).

The site is plain HTML, CSS and JavaScript, served by GitHub Pages. There is no build step.

## Files

- `index.html`: the page shell
- `styles.css`: the design
- `app.js`: the timeline, cards, filters, calendar exports and submission slip
- `reads.json`: every read on the calendar

## Adding or changing a read

Edit `reads.json`. Each read looks like this:

```json
{
  "id": "gullivers-travels-rtc",
  "title": "Gulliver's Travels",
  "author": "Jonathan Swift",
  "lang": "English",
  "translation": "",
  "series": "",
  "host": "Henry Eliot",
  "publication": "Read the Classics",
  "url": "https://henryeliot.substack.com",
  "start": "2026-10-30",
  "end": "2026-11-27",
  "freq": "weekly",
  "cadence": "Four weeks, with one voyage discussed each Friday",
  "notes": ""
}
```

- `id` must be unique: letters, numbers and hyphens.
- Dates are `YYYY-MM-DD`.
- `freq` is one of `weekly`, `fortnightly`, `daily`, `monthly` or `other`.
- `series` groups related books, for example `Wolf Crawl`.
- Update `updated` at the top of the file to today's date.

## Submissions

By default, the submission slip formats a host's details for them to copy and send to Cams. To use an online form instead, put its link in `SUBMIT_FORM_URL` at the top of `app.js`.
