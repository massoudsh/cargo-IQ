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
- در اجرای اولیهٔ قابلیت‌های حمل دسترسی npm مسدود بود؛ در ۲۰۲۶-۱۰-۳۱ وابستگی‌های lockfile نصب و lint، typecheck و تست‌های هر دو اپ اجرا و موفق شدند. آزمون مرورگر یا بررسی بصری در این محیط انجام نشده است.

## دور دوم مقایسهٔ رقبا و پنج قابلیت تازه

بررسی صفحات عمومی در ۲۰۲۶-۱۱-۲۴. رقبای ایرانی: [فروهر](https://farvahargroup.com/en/) ماشین‌حساب CBM، رهگیری بار با BL/کانتینر/شمارهٔ مرجع و فرم چهارمرحله‌ای استعلام با پرچم کالای خطرناک دارد و صریحاً می‌نویسد «نرخ ثابت روی سایت نمایش داده نمی‌شود»؛ [پارتیان ترابر](https://ptpcargo.com/en/) برای هر شیوهٔ حمل فرم استعلام جدا و برنامه‌ریز مسیر دارد که فقط استعلام را پیش‌پر می‌کند؛ [SASCO](https://sascompany.co/en/services/freight-forwarding.html) فرایند استعلام و هم‌راستایی گمرکی را به‌عنوان سرویس معرفی می‌کند. رقبای بین‌المللی: [Freightos](https://www.freightos.com/) ماشین‌حساب نرخ، **Import Duty Estimator**، **Transit Time Calculator** و **Carbon Emissions Calculator** دارد؛ [Flexport](https://www.flexport.com/) روی گمرک تمرکز می‌کند (**HS Code Lookup**، **Tariff Simulator**، **Declaration Release Status**) و **Control Tower**؛ [CargoOMS](https://cargooms.com/) پورتال مشتری و ساعت دموراژ؛ [GetShipBetter](https://getshipbetter.com/en/solutions/for-freight-forwarders) استعلام قابل‌پذیرش آنلاین و تبدیل شیت نرخ به نرخ قابل‌جست‌وجو؛ [Jistix](https://jistix.io/en) استخراج فیلدهای ساختاریافته از RFQ نامرتب با درجهٔ اطمینان هر فیلد. این بررسی صفحات عمومی است، نه آزمون کامل محصولات یا پنل‌های خصوصی.

| قابلیت تازه | شکاف رقابتی که پر می‌کند | پیاده‌سازی و مرز واقعی |
|---|---|---|
| مبنای محاسبهٔ چندحالته | رقبا CBM را حساب می‌کنند اما کمتر نشان می‌دهند فورواردر بر چه واحدی فاکتور می‌دهد | هوایی `max(وزن, حجم/6000)`، LCL بر مبنای تن/متر (W/M) و زمینی متر بارگیری؛ هر گزینه واحد billing خود را دارد. ضریب‌ها نمونه‌اند و قرارداد حامل می‌تواند متفاوت باشد. |
| برآورد هزینهٔ نهایی ترخیص | Flexport و Freightos فقط ابزار عوارض یا نرخ دارند، نه تفکیک کامل هزینهٔ نهایی | ارزش کالا، کرایه، بیمه، حقوق ورودی و مالیات با نرخی که کاربر وارد می‌کند؛ اینکوترمز تعیین می‌کند کرایه/بیمه در ارزش گمرکی بیاید یا نه و از دوباره‌شماری جلوگیری می‌شود. نرخ رسمی گمرک نیست. |
| مقایسهٔ پیشنهادهای دریافتی | GetShipBetter و Freightos چرخهٔ پیشنهاد را دارند؛ ما قبلاً فقط پیش‌نویس استعلام داشتیم | پیشنهاد واقعی فورواردر دستی ثبت می‌شود، پیشنهاد منقضی از انتخاب بهترین گزینه حذف می‌شود و ارزان‌ترین/سریع‌ترین/بهترین تعادل نمایش داده می‌شود. سامانه نرخی نمی‌گیرد و صحت آن را تأیید نمی‌کند. |
| آمادگی مدارک به‌ازای تصمیم | Flexport و CargoWise وضعیت مدرک را در پرونده نگه می‌دارند؛ چک‌لیست ما بی‌حالت بود | هر مدرک برای همان تصمیم «آماده» علامت می‌خورد و تعداد موارد الزامی باقی‌مانده نمایش داده می‌شود. بارگذاری فایل یا بررسی اصالت انجام نمی‌شود. |
| نمایش دو ارزی | بازار ایران قیمت را ریالی می‌بندد ولی رقبا تک‌ارزی‌اند | نرخ ارز را کاربر وارد می‌کند و مبلغ ریالی در کنار دلار نمایش داده می‌شود؛ هیچ نرخ زنده‌ای خوانده نمی‌شود. |

مسیرهای جدید: `POST /api/landed-cost/estimate`، `GET|POST /api/quotes/:rfqId/offers` و `GET|POST /api/compliance/readiness/:decisionId`. پاسخ `recommend` حالا `measures` و `billing` هر گزینه را هم دارد. همهٔ این داده‌ها tenant-scoped و در حافظه‌اند.

## دور سوم مقایسهٔ رقبا و پنج قابلیت تازه

بررسی صفحات عمومی در ۲۰۲۶-۱۱-۲۵. [Flexport](https://www.flexport.com/emissions-calculator/) و [Freightos](https://www.freightos.com/freight-resources/emissions-calculator) هر دو ماشین‌حساب انتشار کربن دارند و Flexport صریحاً می‌گوید محاسبه بر پایهٔ وزن، فاصله و شیوهٔ حمل است؛ Freightos روش EN 16258 و Flexport چارچوب GLEC را مبنا می‌گیرد. [CargoOMS](https://cargooms.com/) ساعت دموراژ و پروندهٔ سند در همان صفحهٔ محموله دارد و ابزارهای مستقل دموراژ/دیتنشن ([Panvaya](https://panvaya.com/demurrage-calculator) و [CargoScope](https://cargoscope.io/tools/demurrage-detention-calculator)) نرخ پله‌ای و روزهای آزاد را حساب می‌کنند. [جیستیکس](https://jistix.io/en) استخراج فیلد از RFQ با درجهٔ اطمینان هر فیلد را تبلیغ می‌کند. از دور اول: Flexport **HS Code Lookup** دارد و [فروهر](https://farvahargroup.com/en/)، [پارتیان ترابر](https://ptpcargo.com/en) و Freightos هر کدام به نوعی زمان تحویل یا برنامهٔ سفر را نشان می‌دهند.

| قابلیت تازه | شکاف رقابتی | پیاده‌سازی و مرز واقعی |
|---|---|---|
| برآورد انتشار کربن | رقبای بین‌المللی CO₂e را کنار نرخ نشان می‌دهند | ضریب تقریبی تن-کیلومتر برای هوایی/دریایی/زمینی × وزن و فاصله؛ فاصله از ورودی کاربر یا جدول تقریبی کریدور و در غیر این صورت «نامشخص». گزارش GLEC/EN 16258 نیست. |
| برنامهٔ زمانی مرحله‌ای | رقبا ETA و milestone برنامه‌ریزی‌شده می‌دهند | پنج مرحله از زمان تحویل تخمینی پخش می‌شود و مرحله‌های گذشته از برنامه علامت می‌خورند. برنامهٔ داخلی است، نه تعهد حامل. |
| پیشنهاد کد HS | Flexport جست‌وجوی HS دارد | تطبیق واژه‌ای با فصل و heading، با اطمینان «پایین» و توضیح صریح اینکه طبقه‌بندی گمرکی نیست و نرخ عوارض به کد دقیق بستگی دارد. |
| متن آمادهٔ درخواست نرخ | GetShipBetter و Jistix گردش RFQ را خودکار می‌کنند | متن ساختاریافته از مسیر، وزن، حجم، ابعاد، اینکوترمز و شناسهٔ تصمیم ساخته و در کلیپ‌بورد کپی می‌شود. سامانه پیامی نمی‌فرستد. |
| برآورد دموراژ | CargoOMS و ابزارهای تخصصی ساعت دموراژ دارند | روزهای نگه‌داری منهای روزهای آزاد، ضرب در نرخ و تعداد کانتینر. تعطیلات، روز شروع شمارش و تعرفهٔ پله‌ای لحاظ نمی‌شود. |

مسیرهای جدید: `GET /api/insights/:decisionId?distanceKm=` و `POST /api/insights/demurrage`. تحلیل‌ها فقط با دکمهٔ کاربر و برای تصمیم همان tenant بارگذاری می‌شوند و در حافظه محاسبه می‌شوند.

## کنسول UI/UX و وضعیت backlog

بازطراحی بر اساس `uploads/cargo-iq-ai-agent-backlog.md` با حفظ API، محاسبات و مرز tenant انجام شد. محصول فعلی **تصمیم‌یار با دادهٔ نمونه** است، نه سامانهٔ زندهٔ ناوگان؛ شاخص‌های ساختگی، مشتری، پروفایل یا مجوزهای فرضی اضافه نشده‌اند.

| بخش backlog | نتیجه در دامنهٔ واقعی محصول |
|---|---|
| ۱ و ۳ — design system و glass | `theme.css` منبع tokenها؛ `GlassSurface` با سه سطح؛ recipe مشترک فرم، دکمه، جدول، badge و timeline. اجزای بلااستفاده مثل modal و date-picker سفارشی ساخته نشدند؛ date input بومی است. |
| ۲ — shell | نوار بالای sticky، sidebar دسکتاپ و disclosure موبایل با Escape، skip link، لینک فعال، نشان واضح محیط نمونه؛ بدون اعلان یا پروفایل ساختگی. جست‌وجو در تاریخچهٔ قابل‌دسترسی است، نه جست‌وجوی جهانی منابع ناموجود. |
| ۴ — dashboard | شمار تصمیم‌ها، برآوردهای تازه و نیازمند بازبینی؛ کارت‌ها به صف فیلترشده می‌روند. پیش از بارگیری مقدار نامعلوم نمایش داده می‌شود. آمار محمولهٔ فعال/تحویل/تأخیر بدون endpoint واقعی اضافه نشده است. |
| ۵ — visibility | شناسهٔ تصمیم و رکورد، زمینهٔ مسیر فقط در صورت انطباق تصمیم، تعداد مراحل، timestamps ثبت دستی و اقدام بعدی؛ بدون ETA یا مسئول فرضی. |
| ۶ — exception management | صف بازبینی برآورد موجود است اما تأخیر حمل یا exception نیست. assignment، escalation، resolution و audit جدید **پیاده نشده‌اند**؛ مدل داده، مجوز و API آن‌ها وجود ندارد. |
| ۷ — investigation | جست‌وجوی شناسه، مسیر، کالا و فورواردر؛ فیلتر روز UTC و تازگی؛ مرتب‌سازی تاریخ؛ صفحه‌بندی ۱۰ ردیفی؛ header چسبان و پیمایش جدول روی موبایل. bulk action و saved queue به‌دلیل نبود قرارداد backend اضافه نشد. |
| ۸ — partners | تعداد دفعات پیشنهاد برتر در تصمیم‌های فیلترشده و drill-down با نام؛ این آمار عملکرد واقعی، on-time rate یا کیفیت سرویس نیست. |
| ۹ — reporting | پیش‌نمایش فیلترشده و CSV همان داده‌های دریافت‌شدهٔ tenant، شامل همهٔ صفحات، scope، زمان تولید و فیلترها؛ خنثی‌سازی formula injection، وضعیت شکست و retry. Excel/PDF و analytics جدید اضافه نشده‌اند. |
| ۱۰ — forms/errors | خطای inline و summary پیونددار، تمرکز روی فیلد حتی داخل details بسته، حفظ ورودی، پیام‌های مشخص شبکه/مجوز/نرخ/سرور با catalog فارسی و انگلیسی. تنظیمات پرخطر ناموجود ساخته نشدند. |
| ۱۱ — RTL | CSS logical properties، bdi برای شناسه‌ها، عدد/تاریخ فارسی و fallback فونت محلی؛ semantics در RTL/LTR تست شد. ترجمهٔ کامل UI انگلیسی و بررسی بصری ادعا نمی‌شود. |
| ۱۲ و ۱۳ — theme/motion | light/dark با پیش‌فرض سیستم و ذخیرهٔ preference؛ motion کوتاه، fallback بدون blur و reduced motion/transparency؛ blur فقط روی topbar، نه کارت‌های تو‌در‌تو. |
| ۱۴ — accessibility | landmarks، focus، متن وضعیت کنار رنگ، labelها و contrast test tokenهای هر theme؛ تأیید کامل WCAG، screen-reader واقعی و تست بصری هنوز انجام نشده است. |
| ۱۵ — performance | سقف ۱۰ ردیف DOM، memoized filtering، بدون dependency جدید یا کتابخانهٔ نمودار/نقشه؛ کل history همچنان از API دریافت می‌شود. Core Web Vitals و benchmark مرورگر اندازه‌گیری نشده‌اند؛ pagination سمت سرور برای مقیاس بزرگ لازم است. |
| ۱۶ — quality | دستور واحد `npm run check --prefix apps/web`؛ تست component، CSV، contrast، theme و خطاها در CI موجود اجرا می‌شوند. visual regression مرورگری در این محیط قابل اجرا نیست. |

### بررسی کیفیت کنسول

```bash
npm ci --prefix apps/web
npm run check --prefix apps/web
npm ci --prefix apps/api
npm run lint --prefix apps/api && npm run typecheck --prefix apps/api && npm test --prefix apps/api
```

در ۲۰۲۶-۱۱-۲۵، ۴۸ تست وب و ۵۵ تست API موفق شدند. تست‌های رنگ روی جفت‌های token هستند، نه گواهی دسترس‌پذیری UI رندرشده. آزمون‌های بصری، screen-reader، مرورگر، screenshots و Core Web Vitals انجام نشده‌اند. در محیط مناسب، dark/light، RTL/LTR، عرض ۳۲۰px، zoom ۲۰۰٪، keyboard-only، فیلتر/CSV و خطای مجوز را بررسی کنید؛ معیارهای خارج از دامنهٔ محصول نباید completed گزارش شوند.

## License

[MIT](LICENSE).

## اجرا با Docker

```bash
cp .env.example .env        # پیش از اشتراک‌گذاری، CARGOIQ_API_KEYS را تنظیم کنید
docker compose up --build -d
```

سپس <http://localhost:8080> را باز کنید. اپ وب با nginx سرو می‌شود و `/api` را به سرویس API پروکسی می‌کند؛ پورت API به میزبان publish نمی‌شود و نیازی به تنظیم CORS یا `VITE_API_BASE_URL` نیست.

دو محدودیت مهم: داده‌ها در حافظهٔ پروسهٔ API هستند و با restart از بین می‌روند، و به همین دلیل باید **فقط یک replica** از API اجرا شود. TLS نیز در این stack پایان نمی‌یابد. دستور کامل، متغیرها و روش بررسی در [`docs/DOCKER.md`](docs/DOCKER.md) آمده است.

## معماری و امنیت

جزئیات جریان داده در [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) و کنترل‌های امنیتی در
[`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) ثبت شده است. برای اجرای محلی، `.env.example` را
به `.env` کپی کنید. CI شامل typecheck، تست، build، CodeQL، secret scanning، Dependabot و SBOM است.
API برای هر درخواست request ID و لاگ JSON ساختاریافته تولید می‌کند و اندازهٔ body را به ۳۲ کیلوبایت محدود می‌کند.
