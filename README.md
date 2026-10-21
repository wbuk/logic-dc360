# logic-dc360

Ready-built copies of [Logic](https://github.com/jppellet/Logic-Circuit-Simulator), the free logic circuit
simulator for education by Jean-Philippe Pellet (HEP Vaud), MIT License.

Logic does not publish built releases. Every night the job in `.github/workflows/build.yml` checks Logic's
`master` branch. When there is a new commit, it builds Logic with Logic's own bundler (`tools/bundle.js --dist`)
and publishes the result here as a release:

- the release is named after the time of Logic's commit (UTC): `vYYYY.MMDD.HHMM`, so a newer one is always higher;
- `logic-dc360.zip` holds the built editor (`index.html`, `simulator/lib/bundle.js`), Logic's licence
  (`LICENSE.txt`), `logic-build.json` (the commit it was built from), and in `vendor/` exact copies of the
  Bootstrap and jQuery versions Logic's editor asks for (both MIT), so a site can serve everything itself.

This repository contains no changes to Logic. It is used by DC360, which downloads these releases and applies
its own changes on its own server.

To build straight away instead of waiting for the night: **Actions > Build Logic > Run workflow**.
