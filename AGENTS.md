# WebSearch+ notes

## Git installs

OpenCode's Git installer fails if `package.json` has a script named `build`, `prepare`, `prepack`, `install`, `preinstall` or `postinstall`. That is why the build script is called `compile`. Keep those names out of `package.json`.

`dist/` is committed so Git installs work without a build. Run `npm run compile` and commit `dist/` after changing the source.

## README anchors

Use explicit named anchors for README table-of-contents links:

```md
[Install](#install)

## Install <a name="install"></a>
```
