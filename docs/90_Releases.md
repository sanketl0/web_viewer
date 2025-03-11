# Make a release

Panoramax Web Viewer uses [semantic versioning](https://semver.org/) for its release numbers.

!!! note

	On Viewer versions < 3.0, a strong constraint was put to keep versions in sync between API and Viewer. Each component could have different `PATCH` versions, but compatibility __had to be__ ensured between `MAJOR.MINOR` versions. Since Viewer version >= 3.0, any STAC-compliant API should be supported by Viewer.

Run these commands in order to issue a new release:

```bash
git checkout develop

vim package.json		# Change version
vim package-lock.json	# Change version
npm run doc

vim CHANGELOG.md	# Replace unreleased to version number (and links at bottom)

git add *
git commit -m "Release x.x.x"
git tag -a x.x.x -m "Release x.x.x"
git push origin develop
git checkout main
git merge develop
git push origin main --tags
```
