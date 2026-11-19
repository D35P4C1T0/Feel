# Feel

This is a mood tracker. it's used to track daily emotions.
it needs to be fast, lightweight and simple.
no login required, everythings stays on the device.

### technical aspects

this project will be a TypeScript PWA, mobile first, using latest 2026 design principles and best practices; smallest and simplest implementation that does the trick wins here. iOS compatibility is critical.

Use pnpm, modern framework in order to have a lean codebase.
Use shadcn/ui but customized a little bit.
If possible use a UI library framework, dont hardcode html and js like a cavemam.

if there are no UI elements in shadcn that fit our need please tell me a literal "no" instead of inventing on your own; i dont need wacky self made UI components, only true tested ones.

### UI

Mono page (web)app, big calendar on top, every day has a colored dot if I tracked my mood for that day, unlimited number of mood tracking events throughout the day; pick actual time when no time is specified when registering a mood measurement.
Use smooth animations; dont use useless subheading and subtexts.

### Mood measurement

Simple drawer that opens up from the bottom, a colored compass opens up so the user can pick the best point in the basic chart Joy-Sadness-Anger-Fear that best fits their need. The center is true neutral, each corner is one of those emotions.
One can also just pick one emotion from the list of 12 down this document and give a general 1 to 10 level to it (useful for specific events).
Add a "Custom" button that shows every emotion in the 12 list and asks you to pick one value and then goes to the next emotion (you can skip as many as you want).
Allow to choose one complex emotion among many more emotions (you should find an API or references to a reasonable emotions list other than the one i gave you with corresponding icons (emoji like but not normal ones). pick one fitting color per emotion). Leave 1 really custom emotions out so i can name it how i prefer, let me pick the color. Ask if i want to save a custom emotion.

Add a "Notes" so i can write whatever i want for every event i record in the day or even for the whole day if there's just one event (reasonable text size limit, i might tell a good/bad thing that happened). Notes are optional, grades not, grades are mandatory. There can't exist a mood measurement event without a grade. a grade can also be one of those custom emotions (actually just a long list of emotions as enums-like). When adding a note, the drawer should open more to make space for the note field.

### Data analysis

add a page that shows charts of your emotions for this week/month/3 month progression/year. Of course, this project being mobile first dont go crazy with charts as they'll be very small to consult.
i'd also add a github commit mosaic style that shows the whole year as 365 tiles and you can filter by emotion to view how intense the corresponding emotion color is for every tile. I'd like to find patterns.

These are the main emotions and well'use this "scale" which is an extension of Plutchik's model:

01) Joy - Pleasure, happiness and positive experience.
02) Sadness - Loss, absence and emotional suffering.
03) Anger - Opposition, hostility and resistance.
04) Fear - Threat, danger and vulnerability.
05) Disgust - Repulsion, rejection and aversion.
06) Surprise - Unexpectedness and sudden change.
07) Trust - Confidence in another person or the environment.
08) Anticipation - Expectation of a future event.
09) Attachment - Emotional bonding, affection and connection.
10) Desire - Wanting, craving and attraction.
11) Curiosity - The impulse to explore and understand.
12) Calmness - Peacefulness, relaxation and tranquillity.


### Settings page

Normal stuff, your name, favourite color to then base the whole webapp theme around (you should find material design 3 theming and color generator). Fav color can be any color RGB. We'll offer some good defaults and then a color picker.

In the settings we let users change:
- first day of the month
- wether to show or not any macro-component we have in the webapp for the mainpage, we like customizability; since mobile first will mean things in a column stacked vertically, offer a way to drag and drop a list of active components; i know it's lame but it works.
- wether or not to receive notifications to remember to record the mood (allow setting a specific time, might not work on iOS but that's ok, good for android people). Also let the user pick the message of the notification, which should be a sane defaut.
- A danger zone to delete all the stored data
- An export button to download all your data

use a sane ordering/layout for settings, dont reinvent the wheel, take inspiration from other project. settings should take very little time and be trivial.
