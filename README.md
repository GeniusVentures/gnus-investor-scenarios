# Genius Ventures investor scenario lab

Interactive scenarios for preferred shares, GNUS token warrants, POS cash, AI processing, token burning, and investor withdrawals.

**Published dashboard:** https://geniusventures.github.io/gnus-investor-scenarios/

## Project files

- **docs/index.html**: Dashboard layout, controls, SVG charts, pop-out help, shareable scenario URLs, and CSV export.
- **docs/model.js**: Pure JavaScript formulas, equity math, warrant resale lockouts, token economics and compact dollar formatting.
- **tests/model.test.mjs**: Tests for four lockouts, equity ownership, money labels, token guardrails and continuing POS cash revenue.
- **package.json**: Node ES-module settings. Run tests with npm test.
- **.github/workflows/model-tests.yml**: Runs the test suite on changes to the dashboard or formulas.

**No build step, third-party libraries, API keys, or web services are required.**

## GitHub Pages

Publish branch main, folder /docs. Keep docs/index.html and docs/model.js together: the HTML imports its formulas from the JavaScript module.

## Local preview

From the repo root:

    python3 -m http.server 8000 -d docs

Open http://localhost:8000/

Browsers can block ES-module imports from a local file:// URL, so use a local web server for preview.

For formula tests (Node.js 22+ recommended):

    npm test

## Token warrant lockouts

The dashboard can model 0, 6, 12 or 18 months when warrant-derived GNUS cannot be sold:

- Six-month lockout: no sales in months 1–6; first permitted sale in month 7.
- Twelve-month lockout: first sale in month 13.
- Eighteen-month lockout: first sale in month 19.
- Target investor income during a lockout does not accrue or get paid later.
- Preferred shares and the assumed warrant allocation do not change with the lockout.

The new **Investor cash actually received** chart uses allowed token sales rather than theoretical token requirements. Resale lockouts do not simulate vesting, exercise restrictions, legal transfer limits, or taxes.

## Economics and limits

POS: $20/device/month; $15 modeled as cash contribution and $5 used for eligible GNUS AI processing. Other AI processing spending is an additional input.

Defaults: 10% of GNUS processing burns; another separate 10% is allocated to Genius Ventures wallets. That wallet allocation is **not company cash unless sold**.

GNUS price in this simplified model is the assumed token market cap divided by remaining supply. **Burning tokens does not guarantee higher market prices.** The tool is not a quote, forecast, or offering.

Token projections stop if modeled retained company-wallet tokens would exceed all remaining GNUS tokens, or supply would drop below 1% of the starting amount. That 1% level is a mathematical guardrail, **not the protocol burn rate**. POS cash calculations continue through the selected horizon even after the token scenario stops.

This model does not fully account for token turnover, resale market depth, slippage, additional issuance, legal terms or taxes. The $15 POS amount is a user-supplied operating assumption, not audited net profit.

## Formatting

All displayed dollar values use two decimals with K/M/B/T when large, for example $1.86K and $12.45M. Impossible outcomes display **Model limit** rather than huge scientific notation.

## Development

Change mathematical assumptions in docs/model.js and interface/help content in docs/index.html. Run npm test before committing.
