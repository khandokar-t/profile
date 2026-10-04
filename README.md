# Khandokar Tanvir Rahman · portfolio (version 2)

A static website, ready for GitHub Pages. No build step.

| Page | What it is |
|---|---|
| `index.html` | Home. Opens with "Hi, I am…", then a square intersection: click it (or scroll down) and the 3D intersection builds itself. Each road is a CV section; the mouse wheel steps through the phases. |
| `tour.html` | The guided tour: seven phases. Mouse wheel, Next/Back, arrow keys or the lamps. |
| `map.html` | Skills and themes as a metro map. The mouse wheel rides each line; click a station. |
| `cv.html` | The plain, printable CV. |
| `404.html` | "Road closed" page for broken links. |

## Edit the content
Everything you see comes from **`js/content.js`**. Change text there and every page updates.

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
1. Upload the **contents** of this folder (not the folder itself) to the root of your `profile` repository.
2. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`.
3. After a minute the site is live at `https://<your-username>.github.io/profile/`.

If you upload the `version1` folder as a subfolder instead, the address becomes `.../profile/version1/` and the 404 page is not used.

## Notes
- The opening animation plays once per browser tab. Coming back from another page goes straight to the finished intersection.
- The 3D scene loads three.js (r128) from cdnjs, and fonts come from Google Fonts, so they need an internet connection.
- Opening `index.html` by double-clicking works too, since no build or server is needed.
