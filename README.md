# рџЏЁ Restful-Booker Platform вЂ” Test Automation

> WIP. Pet-РїСЂРѕРµРєС‚ РґР»СЏ РїРѕСЂС‚С„РѕР»РёРѕ вЂ” СЂР°СЃРєР°С‚С‹РІР°СЋ Р°РІС‚РѕС‚РµСЃС‚С‹ РЅР° [Restful-Booker Platform](https://automationintesting.online)
> РЅР° Playwright + TypeScript. РџРѕР»РЅРѕРµ README РїСЂРёРµРґРµС‚ РїРѕР·Р¶Рµ, РєРѕРіРґР° СЃРѕР±РµСЂСѓ РѕСЃРЅРѕРІРЅСѓСЋ РѕР±РІСЏР·РєСѓ.

## Р§С‚Рѕ РїР»Р°РЅРёСЂСѓСЋ РІРЅСѓС‚СЂРё

- UI Рё API С‚РµСЃС‚С‹ РІ РѕРґРЅРѕРј РјРѕРЅРѕСЂРµРїРѕ
- POM, РєР°СЃС‚РѕРјРЅС‹Рµ С„РёРєСЃС‚СѓСЂС‹, С„Р°Р±СЂРёРєРё РґР°РЅРЅС‹С… С‡РµСЂРµР· faker
- Smoke / regression / negative / performance / visual / contract tests
- CI (GitHub Actions), Docker, Allure
- РџР°СЂР° AI-РїР»СЋС€РµРє РїРѕРІРµСЂС… Anthropic API (РіРµРЅРµСЂР°С‚РѕСЂ С‚РµСЃС‚РѕРІ, СЂР°Р·Р±РѕСЂ СѓРїР°РІС€РёС…, РіРµРЅРµСЂР°С‚РѕСЂ РґР°РЅРЅС‹С…)

## Quick start (РєРѕРіРґР° РѕР±РІСЏР·РєР° Р±СѓРґРµС‚ РіРѕС‚РѕРІР°)

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env
npm run test:smoke
```