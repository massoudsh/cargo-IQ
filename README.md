# CargoIQ

دستیار هوشمند تصمیم‌گیری در حمل‌ونقل بین‌المللی — موتور تصمیم برای انتخاب مسیر، فورواردر و
زمان‌بندی حمل بر اساس داده‌ی تاریخی، هزینه، زمان تحویل و ریسک.

## ساختار پروژه

```
apps/
  web/    فرانت‌اند (React + Vite + TypeScript)
  api/    بک‌اند (Node.js + Express + TypeScript)
docs/
  brand-brief.md   برند بریف و پوزیشنینگ
```

## توسعه

هر اپ (`apps/web`, `apps/api`) یک پکیج مستقل با `package.json` جداست.

```bash
cd apps/api && npm install && npm run dev   # بک‌اند روی پورت 4000
cd apps/web && npm install && npm run dev   # فرانت‌اند روی پورت 5173
```

> نکته: ساخت (build) سنگین یا نصب حجیم dependency باید طبق سیاست کانتینر انجام شود.
