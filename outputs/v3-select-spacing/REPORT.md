# V3 select — отступ стрелки

Общее правило для всех single-select V3: SVG-chevron в18px от правого края, по вертикальному центру, размер18px. Правый padding52px резервирует место под стрелку и промежуток. Длинный выбранный текст сокращается внутри доступной области. Нативная стрелка выключена; отдельный ▼ формы Apply удалён, поэтому двойной стрелки нет. Нативный select/options, обработчики событий, disabled и focus сохранены. В forced-colors возвращается системная стрелка. Multiple/size-listbox не затрагиваются.

Изменены только V3/app/src/index.css, V3/app/src/screens/Apply.tsx и новый локальный V3/app/public/select-chevron.svg. V1/V2/server и данные не изменялись этой правкой.

Проверки: V3 build успешен; Chromium desktop1440×1000, portrait1080×1920 kiosk, mobile390×844. Фильтр факультета меняет результаты, длинное значение не перекрывает стрелку, padding52px/appearance:none подтверждены. Форма Apply без дополнительного символа▼; форма на киоске сохраняет нативный выбор через Home/ArrowDown/Enter. Никакие заявки не отправлялись. Скриншоты в этой папке, checks.json — измеренные стили.

Основные снимки: desktop-select-closeup.png, portrait-select-closeup.png, portrait-form-select.png, mobile-form-select.png; контекст — desktop-filter.png, portrait-filter.png, mobile-form.png и portrait-form.png. Физический Android не проверялся. Preview5183 оставлен работающим.
