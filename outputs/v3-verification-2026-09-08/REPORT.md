# V3 — реализация и проверка, 8 сентября 2026

## Результат

V3/app создан в worktree6850. Preview: http://127.0.0.1:5183/?preview=browser&page=home ; kiosk: http://127.0.0.1:5183/?preview=kiosk&page=home . Основные5173/4000 и QA-вкладка5175 не использовались для управления. API4000 читался через proxy V3.

Новая светлая прохладная система: локальный Noto Sans, существующие университетские логотипы, белый/серый/графит/синий, радиусы8px. Реализованы Home, поиск всех категорий, равноправные факультеты по алфавиту выбранного языка, списки выпускников, преподавателей/лауреатов/ветеранов, компактные профили с полным именем. Пустые галереи и декоративные счётчики исключены. Фотографии — только данные API; при отсутствии/ошибке фото показывается монограмма. Рабочие формы/загрузки/панели сотрудников наследуют исправленный V2.

Web и kiosk имеют разные раскладки. В web на <=1100px действия доступны через «Меню»; языки остаются видимыми. Все действия меню имеют одинаковые декоративные SVG18px, stroke1.9. Поиск возвращает на главную и фокусирует поле. Языки без иконок. Верхняя панель киоска не переделывалась из-за запроса navbar; в нижней панели добавлен постоянный поиск.

## Происхождение исправленной базы

V3 скопирован из **текущего незакоммиченного V2** основного checkout `/home/sult/Documents/projects/Alumni Buketov University`, а не старого HEAD worktree. AppContext, заявки, auth, navigation, API errors и staff logic — ранее сделанная работа задачи «Первичная настройка», сохранённая здесь. В API V3 изменён только default origin на same-origin с Vite proxy.

12 изменённых server-файлов и server/test перенесены из той же задачи в worktree. Они не являются авторскими backend-изменениями V3. `inherited-server-files.json` содержит SHA256; совпадение после переноса проверено. `v2-source-baseline.json` фиксирует исходники V2, использованные при копировании. V1/V2 в worktree не редактировались; они старее основного checkout и **не должны заменять основной checkout при интеграции**.

## Проверки

- V3 `npm run build` — успешно, TypeScript + Vite; последняя сборка после navbar icons.
- server `npm run build` — успешно.
- `node --test tests/v3-frontend.test.mjs` — 10 вложенных проверок + родительский тест, 11 passed. Live category lookup/count, URL/history/role guard, empty featured, KZ/ё search, API validation/network/non-JSON errors.
- server `tsx --test test/regressions.test.ts` — 6/6: live role/scope/revocation, private contact, atomic concurrent approve, unresolved faculty, recovery/relationship text, invalid MIME, logout. Только уникальная guarded alumni_test_* база, cleanup выполнен.
- Browser Chromium: desktop1440×1000, laptop1024×768, web panel800×900/640×900, mobile390×844 и portrait kiosk1080×1920.
- Живые данные: поиск «Айдана» → профиль; каждый каталог → профиль; counts6/6/5. Имена не обрезаны; horizontal overflow на проверенных mobile экранах отсутствует.
- Заявка: POST503 перехвачен браузерным тестом, ошибка видна, имя и faculty сохранены, ложного успеха нет. POST201 отдельно перехвачен и подтверждён успех. Тестовые заявки не записывались в общую MongoDB.
- Auth UI: mocked admin login → admin, logout вызван, local session удалена, Back не открывает закрытую панель. Реальная backend auth отдельно покрыта server tests; настоящий пользовательский пароль в браузере не использовался.
- KZ keyboard: Ә вводится; Home закрывает поиск и клавиатуру. В первом assertion тест не дождался React commit; проверка исправлена на ожидание скрытия и прошла без дополнительного изменения UI.
- Реальные60 секунд idle: переход из профиля на attract/home, session cleared, касание открывает Home. Это desktop Chromium, не физический Android.
- Bootstrap503 → retry → все15 факультетов восстановлены.
- В финальных browser flows нет pageerror и нет запросов на внешние runtime origins; внешний network блокировался тестом. Шрифты/логотипы локальны.
- Navbar before/after: исходные desktop/panel снимки не показали наложений; воспроизведены скрытые действия на узкой панели и неясный символ режима. Исправлено меню и SVG. After-проверка на640/390 и desktop прошла.
- При записи AppBar dev HMR однажды закешировал пустой модуль, вызвав белый экран. V3 dev server перезапущен; повторные новые загрузки после этого успешны. Последующие исходники записывались атомарно.
- `git diff --check` — чисто. Read-only bootstrap до/после:15 faculties,5 alumni,6 teachers,6 laureates,5 veterans. Seed не запускался.

## Артефакты

`flows.json`, `final-checks.json` — результаты сценариев. `navbar-before-*` / `navbar-after-*` — viewport, DOM snapshot и crop. `navbar-after-panel-menu.png` и `navbar-after-mobile-menu.png` — итоговое меню с иконками. `desktop-home.png`, `portrait-home.png`, `portrait-profile.png`, `mobile-profile.png`, `application-error.png`, `application-success-mocked.png`, `portrait-keyboard.png`, `portrait-idle.png`, `bootstrap-error.png` — QA.

Browser scripts: tests/v3-browser.cjs, tests/v3-navbar.cjs, tests/v3-final-browser.cjs. Для повторения нужен установленный Playwright (QA dependency), при необходимости PLAYWRIGHT_MODULE/CHROMIUM_PATH; запуск из корня при работающем5183/4000. Они используют отдельный headless browser. Общее штатное содержимое MongoDB не изменяют; форма/auth UI используют перехват.

## Доставка и ограничения

Инструкция: `V3/README.md`; дополнительный Nginx server8083: `V3/deploy/nginx-v3.conf.example`. Фактического push/deploy/systemd/nginx/network изменения не было.

Для GitHub перенести V3 и V3 tests в актуальный основной checkout, сохранив его незакоммиченные V1/V2/server fixes. Не включать node_modules, .env и локальную MongoDB. На сервере нужны существующие общие данные и media: GitHub не переносит MongoDB. Рекомендуемый путь сравнения версий — отдельные порты с корнем сайта, не подпапки.

Физический Android, touch на реальном устройстве, Nginx/systemd и прямой RJ45 не проверялись. В базе пока мало контента и фото,14 факультетов без опубликованных выпускников; интерфейс показывает честные0 и пустые результаты. Переводы данных используют существующие fallback. Проверка загрузок сохраняет текущий backend MIME-контроль и его ограничения. На небольшом телефоне форма длинная, но не обрезана. QR требует сетевой доступ к Ubuntu; при прямом RJ45 доступна форма на самом киоске.
