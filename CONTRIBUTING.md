# Contributing

## Data corrections

The most valuable contribution. Open a "Data correction" issue or a pull request
that edits the file in `data/` and adds a source to `data/SOURCES.md`. Changes
without a public source are not merged.

## Code

```
git clone https://github.com/handelce/naija-kit.git
cd naija-kit
npm install
npm run validate:data
npm test
```

Behaviour is defined in `docs/SPEC.md` and tested by the vectors in `spec/`.
Change the spec and vectors first, then each language package.

## Rules

- No runtime dependencies.
- Unknown input returns `null`, never a guess.
- Amounts are kobo integers, never floats.
- Use synthetic account and phone numbers in tests.

## Pull requests

Keep them focused. CI runs data validation, lint, build, and tests.
