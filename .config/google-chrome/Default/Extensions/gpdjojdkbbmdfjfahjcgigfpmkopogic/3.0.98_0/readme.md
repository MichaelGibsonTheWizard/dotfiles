# Pinterest Browser Extension

## Features and Goals:

- meta information saved with new pins
- personalization from offsite browsing
- board sections
- hashtags
- visual search
- inline pin, board, and section creation
- hoverbuttons
- right-click-to-pin
- logging for various events
- business logic loaded as needed from assets.pinterest.com
- internationalization ("Save" button and all messaging in all supported languages.)
- option to turn off hoverbuttons
- install education
- uninstall questionnaire
- hidden hoverbuttons for listed domains
- standards-aware code that should run on Chrome, Firefox, Microsoft Edge, Opera, and other Blink/WebExtensions-compatible browsers, with minimal work

## Local vs. Remote Resources

Throughout this doc you'll see references to `local` and `remote` resources.

Local resources always ship with the extension.

Remote resources normally ship from our CDN, but may also be loaded locally in development mode, or by non-Chrome browsers if that's the only way we can get our extension in their store.

When `FILE_LOCATION` is set to `remote`, assets load from `assets.pinterest.com`, so that they may be updated at need and not require an extension update to show.

When `FILE_LOCATION` is set to `local`, assets load from `/local/*`, so that they may be updated at need and not require an extension update to show.

## The Debug Flag

When `DEBUG` is set to `true` in `background.js`, many entries will be written to the JavaScript console, in the background, content, and overlays. __Please be very careful not to ship with the debug flag on!__

## Structure

The `create`, `grid`, and `search` overlays all have two versions of the same file, one for local and one for remote.  All of these are stub files that call JavaScript to build everything, so they should almost never need to be changed.  _If you do change them, be sure to change both!_

#### Create Overlay

Local: `ext/v3/html/create.html`

Remote: `remote/ext/v3/html/create.html`

#### Grid Overlay

Local: `ext/v3/html/grid.html`

Remote: `remote/ext/v3/html/grid.html`

#### Search Overlay

Local: `ext/v3/html/search.html`

Remote: `remote/ext/v3/html/search.html`

#### Options

`html/options.html` calls `js/options.js`

## Behavior

#### Traffic Direction

`js/background.js`

This is the file that's running when you click "background page" under Inspect Views. Remember to set `$.a.dev=true` to see debug information!

#### DOM Crawler

Local: `/local/js/pinmarklet.js`

Remote: `https://assets.pinterest.com/js/pinmarklet.js`

Runs on click to browser button.

#### Business Logic

Local: `/local/ext/v3/js/logic.js`

Remote: `https://assets.pinterest.com/ext/v3/logic.js`

Runs on every page load. _When working with this file, be extra careful not to load anything from our domain without user interaction._ If you do the effect will be to track all of the user's traffic.

#### Hash List

Remote: `https://assets.pinterest.com/ext/hashList.json`

Local: `/local/ext/hashList.json`

Loads once on session start and is injected with business logic on every page load; helps prevent hoverbuttons from showing on questionable domains.

#### Create Overlay Behavior

Remote: `https://assets.pinterest.com/ext/v3/js/create.js`

Local: `/local/ext/v3/js/create.js`

Runs when called by user action from hoverbutton, right-click, or grid save.

#### Grid Overlay Behavior

Remote: `https://assets.pinterest.com/ext/v3/js/grid.js`

Local: `/local/ext/v3/js/grid.js`

Runs when called by user action on toolbar button.

#### Search Overlay Behavior

Remote: `https://assets.pinterest.com/ext/v3/js/search.js`

Local: `/local/ext/v3/js/search.js`

Runs when called by user action via right-click, hoverbutton, or click to Search button in grid.

#### Content Injector

`js/content.js`

Injects business logic and hash list on page load.

#### Options Behavior

`js/options.js`

Saves user preferences (currently: hide hoverbuttons)

## Support Files

#### Translated Strings

`_locales/*/messages.json`

One file for each supported language. _If you change anything in here, be sure to budget time for translation services!_

#### Images

`img/*.png`

`img/disabled/*.png`

Icons and chrome buttons; those in the `disabled` folder are grayed-out versions for the toolbar button.

#### Permission and Resource Catalog

`manifest.json`

Be careful about permissions changes; if you request permissions not already required by the extension, the extension will be disabled until the user grants the new permissions. _For us the scope is already pretty scary; expect users to balk and uninstall rather than update._

Special note about Firefox: it wants the `<all_urls>` permission in order to make screenshots.  Chrome should not need this permission.

#### Documentation

`readme.md`

You're reading it now. Please help keep it up to date!
