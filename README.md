# CargoIQ

دستیار هوشمند تصمیم‌گیری در حمل‌ونقل بین‌المللی — موتور تصمیم برای انتخاب مسیر، فورواردر و
زمان‌بندی حمل بر اساس داده‌ی تاریخی، هزینه، زمان تحویل و ریسک.

![CargoIQ logo](apps/web/public/cargoiq-logo.svg)

## ساختار پروژه

```
apps/
  web/    فرانت‌اند (React + Vite + TypeScript)
  api/    بک‌اند (Node.js + Express + TypeScript)
docs/
  brand-brief.md   برند بریف و پوزیشنینگ
```

## موتور تصمیم

`POST /api/shipments/recommend` درخواست محموله را اعتبارسنجی می‌کند و با یک موتور امتیازدهی
داده‌محور، گزینه‌های حمل را بر اساس هزینه، زمان تحویل، ریسک تأخیر، انطباق مسیر و انطباق نوع کالا
رتبه‌بندی می‌کند. گزینهٔ اول خروجی با `recommended: true` مشخص می‌شود.

## توسعه

هر اپ (`apps/web`, `apps/api`) یک پکیج مستقل با `package.json` جداست.

```bash
cd apps/api && npm install && npm run dev   # بک‌اند روی پورت 4000
cd apps/web && npm install && npm run dev   # فرانت‌اند روی پورت 5173
```

## تست و CI

```bash
npm ci --prefix apps/api && npm run lint --prefix apps/api && npm run typecheck --prefix apps/api && npm test --prefix apps/api
npm ci --prefix apps/web && npm run lint --prefix apps/web && npm run typecheck --prefix apps/web && npm test --prefix apps/web && npm run build --prefix apps/web
```

GitHub Actions همین مسیرها را برای API و وب اجرا می‌کند.

## معماری و امنیت

جزئیات جریان داده در [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) و کنترل‌های امنیتی در
[`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) ثبت شده است. برای اجرای محلی، `.env.example` را
به `.env` کپی کنید. CI شامل typecheck، تست، build، CodeQL، secret scanning، Dependabot و SBOM است.
API برای هر درخواست request ID و لاگ JSON ساختاریافته تولید می‌کند و اندازهٔ body را به ۳۲ کیلوبایت محدود می‌کند.
