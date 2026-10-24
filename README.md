# Khandokar Tanvir Rahman · portfolio (version 3)

A static website, ready for GitHub Pages. No build step.

| Page | What it is |
|---|---|
| `index.html` | Home. Opens with "Hi, I am…", then a square intersection: click it and the 3D intersection builds itself. Each approach has five lanes (left, through and right lanes in, two lanes out). The signal serves four stages, and each stage opens one section: Education, Research Projects, Work Experience and Skills. Opposing approaches get the green together, as at a real intersection. The mouse wheel steps through the stages. |
| `tour.html` | The guided tour: twelve stops in time order, from Bangladesh in 2017 to today. Each stop has a category label, the details and a small animation. Mouse wheel, Next/Back, arrow keys, the timeline on the left or the bus stops at the bottom. |
| `cv.html` | The plain, printable CV. |
| `404.html` | "Road closed" page for broken links. |

## Edit the content
The home page cards, the CV page and the profile links come from **`js/content.js`**. The tour's text is in `tour.html`, one `<section class="scene">` per stop.

## Add your profile links
In `js/content.js`, fill in the `links` block, for example:

```js
links: {
  github: "https://github.com/your-name",
  scholar: "https://scholar.google.com/citations?user=...",
  researchgate: "https://www.researchgate.net/profile/...",
  orcid: "https://orcid.org/0000-0000-0000-0000",
  linkedin: "https://www.linkedin.com/in/..."
}
```
Empty links show a "coming soon" message instead of a broken link.

## Publish on GitHub Pages
The contents of this folder go at the root of the `profile` repository, branch `main`. GitHub Pages serves them at `https://<your-username>.github.io/profile/`.

## Notes
- The opening animation plays once per browser tab. Coming back from another page goes straight to the finished intersection.
- The 3D scene loads three.js (r128) from cdnjs, the tour's globe loads country outlines (Natural Earth, via the world-atlas package) from jsDelivr, and fonts come from Google Fonts. Without a connection the globe still shows its grid, the cities and the route.
- The waterway map is drawn from approximate latitude and longitude points, so it is a simplified map, not a survey.
