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

## API امکانات عملیاتی

- `POST /api/shipments/recommend` تصمیم explainable با `decisionId`، confidence، نسخهٔ مدل و breakdown امتیاز ایجاد می‌کند.
- `GET /api/shipments/history` تاریخچهٔ تصمیم‌های tenant جاری را می‌خواند.
- `POST /api/shipments/:decisionId/feedback` پذیرش/رد، هزینه و ETA واقعی را ثبت می‌کند.
- `POST /api/imports/routes` حداکثر ۵۰۰ مسیر validate‌شده را برای کاندیدهای تصمیم وارد می‌کند.
- `POST /api/copilot/recommend` درخواست ساختاریافتهٔ متنی را تحلیل می‌کند و فقط پیشنهاد می‌دهد؛ هر اقدام خارجی نیازمند تأیید انسان است.

برای محیط production مقدار `CARGOIQ_API_KEYS` را تنظیم کنید و کلید را در header `x-api-key` بفرستید. در نبود این مقدار، API تنها برای توسعه با tenant محلی اجرا می‌شود. schema پایدار PostgreSQL در `apps/api/db/schema.sql` قرار دارد؛ repository فعلی in-memory است و برای deployment باید با adapter PostgreSQL جایگزین شود.

## مقایسه با بازار ایران و پنج قابلیت جدید

بررسی صفحات عمومی در ۲۰۲۶-۱۰-۲۶: [پرشین کارگو](https://persiancargo.org/price/) محاسبهٔ وزن حجمی/محاسباتی دارد؛ [ققنوس](https://fnxcargo.com/quote/) فرم استعلام با تماس کارشناسی دارد، نه نرخ قطعی فوری؛ [پرشین فورواردر](https://persianforwarder.com/track-shipment/) کاربر را برای رهگیری به سامانه‌های حمل هدایت می‌کند. این بررسی صفحات عمومی است، نه ادعای بررسی کامل محصولات یا پنل‌های خصوصی.

| قابلیت | پیاده‌سازی فعلی | مرز واقعی |
|---|---|---|
| وزن محاسباتی هوایی و اطلاعات بسته‌بندی | ابعاد سانتی‌متری، تعداد، وزن کل و حجم کل؛ بیشینهٔ وزن واقعی و حجم با ضریب ۶۰۰۰ | فقط برآورد هوایی؛ ابعاد بر حجم ورودی اولویت دارند؛ نرخ نمونه با وزن تغییر نمی‌کند. اینکوترمز ثبت می‌شود، نه محاسبهٔ هزینهٔ حقوقی آن. |
| استعلام چندفورواردر | پیش‌نویس RFQ برای گزینه‌های تصمیم، مهلت پیگیری ۷۲ساعته، دسترسی tenant-scoped | هیچ ایمیل یا درخواست خارجی ارسال نمی‌شود؛ دریافت نرخ واقعی نیازمند adapter است. |
| پیگیری مرحله‌ای | ایجاد رکورد داخلی برای تصمیم و تأیید دستی مراحل تا تحویل | بدون دادهٔ ساختگی، اتصال زنده به حامل یا ETA تضمین‌شده |
| چک‌لیست گمرکی | اطلاعات همان تصمیم؛ هشدار نام‌محور برای باتری، مواد شیمیایی، غذا و دارو | جایگزین بررسی HS، قانون جاری یا تأیید کارگزار نیست؛ عدم تطبیق کلیدواژه به معنی بی‌خطر بودن نیست. |
| بازبینی برآورد و تاریخچه | تاریخ بازبینی داخلی هفت‌روزه، بازیابی تاریخچه و جلوگیری از RFQ برآورد قدیمی | مهلت داخلی است، نه اعتبار قیمت تجاری یا تضمین شرکت حمل. |

مسیرهای جدید:
- `POST /api/quotes/request` و `GET /api/quotes/:rfqId`
- `POST /api/tracking` با `decisionId`، `GET /api/tracking/:trackingCode` و `POST /api/tracking/:trackingCode/events` با `code`
- مراحل دستی به‌ترتیب: `registered`, `picked-up`, `in-transit`, `customs`, `delivered`
- `POST /api/compliance/check` با `origin`, `destination`, `cargoType`

RFQ، رهگیری و catalog واردشده در حافظه‌اند؛ RFQ و رهگیری tenant-scoped هستند و با restart پاک می‌شوند. برای مرور تاریخچه و ابزارهای وب، ابتدا یک تصمیم ثبت یا انتخاب کنید. API قراردادی مشترک با وب دارد؛ `apps/web/src/types.ts` فقط typeها را از API صادر می‌کند و کد موتور وارد bundle وب نمی‌شود.

### نتیجهٔ audit ساختار و UX

- هیچ فایل یکسانی در محتوای tracked اپ‌ها و مستندات پیدا نشد. دو lockfile لازم‌اند چون دو package مستقل‌اند.
- `uploads/Obsidian-RECIPE.md` و `uploads/TASKS.md` منابع غیرمحصولی‌اند و به اپ ارجاع ندارند؛ حذف نشدند تا اسناد کاربر از دست نروند.
- دو پاس filter/concat بدون اثر در ranking و sort تکراری UI حذف شدند؛ کاندیدهای import در سطح tenant جدا شدند و overwrite چند مسیر یک فورواردر اصلاح شد.
- فرم با disclosure جزئیات، labelهای قابل‌دسترسی، ورود اعشار، focus قابل‌دیدن و grid مناسب عرض کم بهبود یافت. نتیجه پیش از ابزارهای جانبی نمایش داده می‌شود؛ loading، empty، error و محدودیت دادهٔ نمونه روشن‌اند.
- اعتبارسنجی کامل: `npm run lint`, `npm run typecheck`, `npm test` در هر اپ. در این نوبت به‌دلیل عدم دسترسی registry، suiteها اجرا نشدند و تست‌های افزوده‌شده باید در CI اجرا شوند. ۱۲ smoke check منطق خالص و ۳۹ assertion مستقل برای handlerها/CSS موفق شدند؛ این harness جایگزین integration با Express یا typecheck نیست. مرورگر در این محیط اجرا نمی‌شود و بررسی بصری ادعا نشده است.

## License

[MIT](LICENSE).

## معماری و امنیت

جزئیات جریان داده در [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) و کنترل‌های امنیتی در
[`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) ثبت شده است. برای اجرای محلی، `.env.example` را
به `.env` کپی کنید. CI شامل typecheck، تست، build، CodeQL، secret scanning، Dependabot و SBOM است.
API برای هر درخواست request ID و لاگ JSON ساختاریافته تولید می‌کند و اندازهٔ body را به ۳۲ کیلوبایت محدود می‌کند.
