# V3 — фокус полей поиска

На присланных пользователем снимках глобальный input:focus-visible рисовал прямоугольный outline внутри скруглённого поискового контейнера. Для Home search и kiosk search добавлен единый focus-within на контейнере: цвет рамки и мягкая внешняя подсветка. Внутренний outline отключён только для этих двух input. Остальные controls сохраняют стандартный focus-visible; forced-colors сохраняет явную системную рамку.

Проверены оба поля в kiosk640px с KZ, ввод текста и web. Скриншоты home-focused.png, search-focused.png, web-focused.png и search-with-keyboard.png просмотрены. Build V3 успешен. V1/V2/server/DB не менялись.
