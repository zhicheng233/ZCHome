# ZCHome

Modern pixel desktop personal site for [zhicheng233](https://github.com/zhicheng233), built with Astro and TypeScript.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

The build reads GitHub pinned repositories through GraphQL when `GITHUB_TOKEN` is available. Local builds fall back to the public profile HTML and finally the bundled snapshot. The blog feed follows the same live-data-plus-snapshot model.

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`; enable Pages with **GitHub Actions** as the source after pushing the repository.
