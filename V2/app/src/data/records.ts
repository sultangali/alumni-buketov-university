import type { Alumnus, AuditEntry, Faculty, Loc, Moderator, Person, Teacher } from '../types'

// ---------------------------------------------------------------------------
// Sample dataset, ported verbatim from the prototype (FAC / ALU / TEACH /
// AUDIT / MODS). Swapping this module for a real API later is a drop-in change.
// ---------------------------------------------------------------------------

export let FAC: Faculty[] = [
  {
    id: 'mit',
    est: 1972,
    grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)',
    abbr: 'МАТ',
    name: {
      kz: 'Математика және ақпараттық технологиялар',
      ru: 'Математики и информационных технологий',
      en: 'Mathematics & Information Technology',
    },
    hist: {
      kz: 'Факультет 1972 жылы ашылып, елдегі IT-мамандарды даярлаудың жетекші орталығына айналды.',
      ru: 'Основан в 1972 году и стал одним из ведущих центров подготовки IT-специалистов в Центральном Казахстане.',
      en: 'Founded in 1972, it became a leading centre for training IT specialists in Central Kazakhstan.',
    },
    depts: [
      {
        id: 'pmi',
        est: 1991,
        count: 247,
        grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)',
        name: {
          kz: 'Қолданбалы математика және информатика',
          ru: 'Прикладной математики и информатики',
          en: 'Applied Mathematics & Computer Science',
        },
        head: { kz: 'Серіков А.Қ., профессор', ru: 'Сериков А.К., профессор', en: 'Prof. A. Serikov' },
        hist: {
          kz: 'Кафедра 1991 жылдан бері есептеу математикасы мен бағдарламалау саласында мамандар дайындайды.',
          ru: 'С 1991 года кафедра готовит специалистов в области вычислительной математики, моделирования и программной инженерии.',
          en: 'Since 1991 the department has trained specialists in computational mathematics, modelling and software engineering.',
        },
      },
      {
        id: 'is',
        est: 2003,
        count: 189,
        grad: 'linear-gradient(140deg,#4E92D6,#2A6BB0)',
        name: { kz: 'Ақпараттық жүйелер', ru: 'Информационных систем', en: 'Information Systems' },
        head: { kz: 'Нұрланова Г.С., доцент', ru: 'Нурланова Г.С., доцент', en: 'Assoc. Prof. G. Nurlanova' },
        hist: {
          kz: 'Цифрлық трансформация мен деректер инженериясы бойынша заманауи кафедра.',
          ru: 'Современная кафедра по направлениям цифровой трансформации и инженерии данных.',
          en: 'A modern department focused on digital transformation and data engineering.',
        },
      },
      {
        id: 'cs',
        est: 1998,
        count: 212,
        grad: 'linear-gradient(140deg,#357AC0,#134A8C)',
        name: { kz: 'Информатика', ru: 'Информатики', en: 'Computer Science' },
        head: { kz: 'Әбдіров Т.М., профессор', ru: 'Абдиров Т.М., профессор', en: 'Prof. T. Abdirov' },
        hist: {
          kz: 'Алгоритмдер, жасанды интеллект және есептеу жүйелері бойынша зерттеу мектебі.',
          ru: 'Научная школа по алгоритмам, искусственному интеллекту и вычислительным системам.',
          en: 'A research school in algorithms, artificial intelligence and computing systems.',
        },
      },
    ],
  },
  {
    id: 'phys',
    est: 1972,
    grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)',
    abbr: 'ФТ',
    name: { kz: 'Физика-техникалық', ru: 'Физико-технический', en: 'Physics & Technology' },
    hist: {
      kz: 'Физика және энергетика саласындағы іргелі зерттеулер орталығы.',
      ru: 'Центр фундаментальных исследований в области физики и энергетики.',
      en: 'A centre of fundamental research in physics and energy.',
    },
    depts: [
      {
        id: 'phy',
        est: 1972,
        count: 164,
        grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)',
        name: { kz: 'Физика', ru: 'Физики', en: 'Physics' },
        head: { kz: 'Қасымов Б.Е., профессор', ru: 'Касымов Б.Е., профессор', en: 'Prof. B. Kassymov' },
        hist: {
          kz: 'Қатты дене физикасы мен ядролық зерттеулер.',
          ru: 'Физика твёрдого тела и ядерные исследования.',
          en: 'Solid-state physics and nuclear research.',
        },
      },
      {
        id: 'eng',
        est: 1985,
        count: 142,
        grad: 'linear-gradient(140deg,#58ABD2,#2A6E8E)',
        name: { kz: 'Энергетика', ru: 'Энергетики', en: 'Energy Engineering' },
        head: { kz: 'Жұмабеков Д.А., доцент', ru: 'Жумабеков Д.А., доцент', en: 'Assoc. Prof. D. Zhumabekov' },
        hist: {
          kz: 'Жаңартылатын энергия және жылу техникасы.',
          ru: 'Возобновляемая энергетика и теплотехника.',
          en: 'Renewable energy and heat engineering.',
        },
      },
    ],
  },
  {
    id: 'law',
    est: 1991,
    grad: 'linear-gradient(140deg,#B79347,#7E6422)',
    abbr: 'ЗАҢ',
    name: { kz: 'Заң', ru: 'Юридический', en: 'Law' },
    hist: {
      kz: 'Құқықтану және мемлекеттік басқару саласындағы мамандар мектебі.',
      ru: 'Школа подготовки специалистов в области права и государственного управления.',
      en: 'A school for training specialists in law and public administration.',
    },
    depts: [
      {
        id: 'pub',
        est: 1991,
        count: 198,
        grad: 'linear-gradient(140deg,#B79347,#7E6422)',
        name: { kz: 'Көпшілік құқық', ru: 'Публичного права', en: 'Public Law' },
        head: { kz: 'Оразбаева А.Н., профессор', ru: 'Оразбаева А.Н., профессор', en: 'Prof. A. Orazbayeva' },
        hist: {
          kz: 'Конституциялық және әкімшілік құқық.',
          ru: 'Конституционное и административное право.',
          en: 'Constitutional and administrative law.',
        },
      },
      {
        id: 'civ',
        est: 1994,
        count: 176,
        grad: 'linear-gradient(140deg,#C6A352,#8A6E28)',
        name: { kz: 'Азаматтық құқық', ru: 'Гражданского права', en: 'Civil Law' },
        head: { kz: 'Бекенов М.Т., доцент', ru: 'Бекенов М.Т., доцент', en: 'Assoc. Prof. M. Bekenov' },
        hist: {
          kz: 'Азаматтық және кәсіпкерлік құқық.',
          ru: 'Гражданское и предпринимательское право.',
          en: 'Civil and business law.',
        },
      },
    ],
  },
  {
    id: 'phil',
    est: 1972,
    grad: 'linear-gradient(140deg,#6E78C0,#3A4690)',
    abbr: 'ФИЛ',
    name: { kz: 'Филология', ru: 'Филологический', en: 'Philology' },
    hist: {
      kz: 'Тіл мен әдебиет, аударма ісі бойынша іргелі мектеп.',
      ru: 'Фундаментальная школа языка, литературы и переводческого дела.',
      en: 'A foundational school of language, literature and translation studies.',
    },
    depts: [
      {
        id: 'kaz',
        est: 1972,
        count: 221,
        grad: 'linear-gradient(140deg,#6E78C0,#3A4690)',
        name: { kz: 'Қазақ тіл білімі', ru: 'Казахского языкознания', en: 'Kazakh Linguistics' },
        head: { kz: 'Әлімова Р.Қ., профессор', ru: 'Алимова Р.К., профессор', en: 'Prof. R. Alimova' },
        hist: {
          kz: 'Қазақ тілі мен әдебиеті зерттеулері.',
          ru: 'Исследования казахского языка и литературы.',
          en: 'Research in Kazakh language and literature.',
        },
      },
      {
        id: 'for',
        est: 1989,
        count: 158,
        grad: 'linear-gradient(140deg,#8A92D2,#46519E)',
        name: { kz: 'Шетел тілдері', ru: 'Иностранных языков', en: 'Foreign Languages' },
        head: { kz: 'Сейтова Л.М., доцент', ru: 'Сейтова Л.М., доцент', en: 'Assoc. Prof. L. Seitova' },
        hist: { kz: 'Аударма және лингвистика.', ru: 'Перевод и лингвистика.', en: 'Translation and linguistics.' },
      },
    ],
  },
  {
    id: 'biogeo', est: 1972, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', abbr: 'БГ',
    name: { kz: 'Биология-география', ru: 'Биолого-географический', en: 'Biology & Geography' },
    hist: { kz: 'Жаратылыстану бағытындағы факультет: биология, география және экология.', ru: 'Факультет естественно-научного профиля: биология, география и экология.', en: 'A natural-science faculty: biology, geography and ecology.' },
    depts: [{ id: 'biogeo-d', est: 1972, count: 184, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', name: { ru: 'Биолого-географический' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'history', est: 1938, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', abbr: 'ИСТ',
    name: { kz: 'Тарих', ru: 'Исторический', en: 'History' },
    hist: { kz: 'Университеттің ең көне факультеттерінің бірі, тарихшылар мектебі.', ru: 'Один из старейших факультетов университета, школа историков и архивистов.', en: "One of the university's oldest faculties, a school of historians and archivists." },
    depts: [{ id: 'history-d', est: 1938, count: 156, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', name: { ru: 'Исторический' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'lang', est: 1989, grad: 'linear-gradient(140deg,#B79347,#7E6422)', abbr: 'ИЯ',
    name: { kz: 'Шетел тілдері', ru: 'Иностранных языков', en: 'Foreign Languages' },
    hist: { kz: 'Аудармашылар мен шетел тілі мұғалімдерін даярлау.', ru: 'Подготовка переводчиков и преподавателей иностранных языков.', en: 'Training translators and teachers of foreign languages.' },
    depts: [{ id: 'lang-d', est: 1989, count: 203, grad: 'linear-gradient(140deg,#B79347,#7E6422)', name: { ru: 'Иностранных языков' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'edu', est: 1952, grad: 'linear-gradient(140deg,#6E78C0,#3A4690)', abbr: 'ПЕД',
    name: { kz: 'Педагогика', ru: 'Педагогический', en: 'Education' },
    hist: { kz: 'Аймақ мектептері мен колледждеріне педагогтар даярлайтын факультет.', ru: 'Факультет подготовки педагогов для школ и колледжей региона.', en: "A faculty training teachers for the region's schools and colleges." },
    depts: [{ id: 'edu-d', est: 1952, count: 268, grad: 'linear-gradient(140deg,#6E78C0,#3A4690)', name: { ru: 'Педагогический' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'sport', est: 1976, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', abbr: 'ФКС',
    name: { kz: 'Дене шынықтыру және спорт', ru: 'Физической культуры и спорта', en: 'Physical Culture & Sport' },
    hist: { kz: 'Жаттықтырушылар мен дене шынықтыру мамандарын даярлау.', ru: 'Подготовка тренеров, учителей физкультуры и специалистов спорта.', en: 'Training coaches, PE teachers and sport specialists.' },
    depts: [{ id: 'sport-d', est: 1976, count: 142, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', name: { ru: 'Физической культуры и спорта' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'philpsy', est: 1995, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', abbr: 'ФП',
    name: { kz: 'Философия және психология', ru: 'Философии и психологии', en: 'Philosophy & Psychology' },
    hist: { kz: 'Әлеуметтік-гуманитарлық бағыт: философия, психология, әлеуметтану.', ru: 'Факультет социально-гуманитарного профиля: философия, психология, социология.', en: 'A social-humanities faculty: philosophy, psychology and sociology.' },
    depts: [{ id: 'philpsy-d', est: 1995, count: 118, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', name: { ru: 'Философии и психологии' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'chem', est: 1964, grad: 'linear-gradient(140deg,#B79347,#7E6422)', abbr: 'ХИМ',
    name: { kz: 'Химия', ru: 'Химический', en: 'Chemistry' },
    hist: { kz: 'Химик-зерттеушілер мен технологтар мектебі.', ru: 'Школа химиков-исследователей и технологов.', en: 'A school of research chemists and technologists.' },
    depts: [{ id: 'chem-d', est: 1964, count: 137, grad: 'linear-gradient(140deg,#B79347,#7E6422)', name: { ru: 'Химический' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'econ', est: 1991, grad: 'linear-gradient(140deg,#6E78C0,#3A4690)', abbr: 'ЭК',
    name: { kz: 'Экономика', ru: 'Экономический', en: 'Economics' },
    hist: { kz: 'Экономистер, қаржыгерлер және менеджерлерді даярлау.', ru: 'Подготовка экономистов, финансистов и управленцев.', en: 'Training economists, financiers and managers.' },
    depts: [{ id: 'econ-d', est: 1991, count: 224, grad: 'linear-gradient(140deg,#6E78C0,#3A4690)', name: { ru: 'Экономический' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'distance', est: 2010, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', abbr: 'ЦДО',
    name: { kz: 'Қашықтан оқыту орталығы', ru: 'Центр дистанционного образования', en: 'Distance Education Centre' },
    hist: { kz: 'Университеттің қашықтан және онлайн оқыту бағдарламалары.', ru: 'Дистанционные и онлайн-программы обучения университета.', en: "The university's distance and online learning programmes." },
    depts: [{ id: 'distance-d', est: 2010, count: 96, grad: 'linear-gradient(140deg,#3E7FC0,#1B5AA6)', name: { ru: 'Центр дистанционного образования' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'college', est: 1999, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', abbr: 'КОЛ',
    name: { kz: 'Колледж', ru: 'Колледж', en: 'College' },
    hist: { kz: 'Университет колледжі — орта кәсіптік білім.', ru: 'Колледж университета — среднее профессиональное образование.', en: 'The university college — vocational secondary education.' },
    depts: [{ id: 'college-d', est: 1999, count: 312, grad: 'linear-gradient(140deg,#3F9AC4,#1E5A7E)', name: { ru: 'Колледж' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
  {
    id: 'extra', est: 2005, grad: 'linear-gradient(140deg,#B79347,#7E6422)', abbr: 'ДО',
    name: { kz: 'Қосымша білім беру', ru: 'Дополнительного образования', en: 'Continuing Education' },
    hist: { kz: 'Біліктілікті арттыру және қайта даярлау курстары.', ru: 'Курсы повышения квалификации и переподготовки.', en: 'Professional development and retraining courses.' },
    depts: [{ id: 'extra-d', est: 2005, count: 74, grad: 'linear-gradient(140deg,#B79347,#7E6422)', name: { ru: 'Дополнительного образования' }, head: { ru: '—' }, hist: { ru: '' } }],
  },
]

export let ALU: Alumnus[] = [
  {
    id: 'a1',
    fac: 'mit',
    dept: 'pmi',
    year: 1998,
    featured: true,
    video: true,
    accent: '#1B5AA6',
    name: { kz: 'Айдос Серікұлы Жұмабеков', ru: 'Айдос Серикулы Жумабеков', en: 'Aidos Zhumabekov' },
    spec: { kz: 'Қолданбалы математика', ru: 'Прикладная математика', en: 'Applied Mathematics' },
    pos: { kz: 'CTO, ұлттық финтех платформасы', ru: 'CTO, национальная финтех-платформа', en: 'CTO, national fintech platform' },
    org: { kz: 'Astana Hub резиденті', ru: 'Резидент Astana Hub', en: 'Astana Hub resident' },
    bio: {
      kz: 'Есептеу математикасы саласындағы маман, отандық төлем жүйелерінің архитекторы.',
      ru: 'Специалист по вычислительной математике, архитектор отечественных платёжных систем и алгоритмов скоринга.',
      en: 'A computational-mathematics expert and architect of national payment systems and scoring algorithms.',
    },
    awards: [
      { kz: '«Үздік IT-көшбасшы 2021»', ru: '«Лучший IT-лидер 2021»', en: 'Best IT Leader 2021' },
      { kz: 'Болашақ бағдарламасының түлегі', ru: 'Выпускник программы «Болашак»', en: 'Bolashak alumnus' },
    ],
    mentors: ['m1'],
    students: ['a3', 'a4'],
  },
  {
    id: 'a2',
    fac: 'mit',
    dept: 'pmi',
    year: 2005,
    featured: true,
    video: false,
    accent: '#2A6BB0',
    name: { kz: 'Дана Қайратқызы Әбенова', ru: 'Дана Кайратовна Абенова', en: 'Dana Abenova' },
    spec: { kz: 'Информатика', ru: 'Информатика', en: 'Computer Science' },
    pos: { kz: 'Деректер ғылымы жетекшісі', ru: 'Руководитель направления Data Science', en: 'Head of Data Science' },
    org: { kz: 'Халықаралық технологиялық компания', ru: 'Международная технологическая компания', en: 'International technology company' },
    bio: {
      kz: 'Машиналық оқыту және деректерді талдау саласындағы сарапшы.',
      ru: 'Эксперт в области машинного обучения и анализа данных, наставник студенческих команд.',
      en: 'An expert in machine learning and data analysis, mentor of student teams.',
    },
    awards: [{ kz: 'PhD, Data Science', ru: 'PhD, Data Science', en: 'PhD, Data Science' }],
    mentors: ['m1'],
    students: [],
  },
  {
    id: 'a3',
    fac: 'mit',
    dept: 'pmi',
    year: 2014,
    featured: true,
    video: true,
    accent: '#134A8C',
    name: { kz: 'Нұрлан Бекболатұлы Сейтов', ru: 'Нурлан Бекболатович Сеитов', en: 'Nurlan Seitov' },
    spec: { kz: 'Бағдарламалық инженерия', ru: 'Программная инженерия', en: 'Software Engineering' },
    pos: { kz: 'Стартап негізін қалаушы', ru: 'Сооснователь EdTech-стартапа', en: 'Co-founder of an EdTech startup' },
    org: { kz: 'Қарағанды', ru: 'Караганда', en: 'Karaganda' },
    bio: {
      kz: 'Білім беру технологиялары саласындағы кәсіпкер.',
      ru: 'Предприниматель в сфере образовательных технологий, развивает онлайн-платформы для школ.',
      en: 'An entrepreneur in education technology, building online platforms for schools.',
    },
    awards: [{ kz: '«Жыл стартабы 2022»', ru: '«Стартап года 2022»', en: 'Startup of the Year 2022' }],
    mentors: ['a1'],
    students: [],
  },
  {
    id: 'a4',
    fac: 'mit',
    dept: 'pmi',
    year: 2018,
    featured: false,
    video: false,
    accent: '#3E7FC0',
    name: { kz: 'Аружан Маратқызы Тлеубаева', ru: 'Аружан Маратовна Тлеубаева', en: 'Aruzhan Tleubayeva' },
    spec: { kz: 'Қолданбалы математика', ru: 'Прикладная математика', en: 'Applied Mathematics' },
    pos: { kz: 'Зерттеуші-математик', ru: 'Научный сотрудник, математик', en: 'Research mathematician' },
    org: { kz: 'Университет зертханасы', ru: 'Лаборатория университета', en: 'University laboratory' },
    bio: {
      kz: 'Сандық модельдеу саласындағы жас ғалым.',
      ru: 'Молодой учёный в области численного моделирования и оптимизации.',
      en: 'A young scientist in numerical modelling and optimisation.',
    },
    awards: [],
    mentors: ['a1'],
    students: [],
  },
  {
    id: 'a5',
    fac: 'mit',
    dept: 'is',
    year: 2010,
    featured: true,
    video: false,
    accent: '#4E92D6',
    name: { kz: 'Тимур Асқарұлы Омаров', ru: 'Тимур Аскарович Омаров', en: 'Timur Omarov' },
    spec: { kz: 'Ақпараттық жүйелер', ru: 'Информационные системы', en: 'Information Systems' },
    pos: { kz: 'Цифрландыру жөніндегі директор', ru: 'Директор по цифровизации', en: 'Director of Digitalisation' },
    org: { kz: 'Мемлекеттік сектор', ru: 'Государственный сектор', en: 'Public sector' },
    bio: {
      kz: 'Электрондық үкімет сервистерін дамытушы.',
      ru: 'Развивает сервисы электронного правительства и цифровые госуслуги.',
      en: 'Develops e-government services and digital public services.',
    },
    awards: [{ kz: 'Мемлекеттік сыйлық', ru: 'Государственная награда', en: 'State award' }],
    mentors: [],
    students: [],
  },
  {
    id: 'a6',
    fac: 'mit',
    dept: 'cs',
    year: 2001,
    featured: false,
    video: false,
    accent: '#357AC0',
    name: { kz: 'Гүлнар Сәкенқызы Ахметова', ru: 'Гульнар Сакеновна Ахметова', en: 'Gulnar Akhmetova' },
    spec: { kz: 'Информатика', ru: 'Информатика', en: 'Computer Science' },
    pos: { kz: 'Профессор, ғылым докторы', ru: 'Профессор, доктор наук', en: 'Professor, Doctor of Science' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    bio: {
      kz: 'Алгоритмдер теориясы бойынша белгілі ғалым және ұстаз.',
      ru: 'Известный учёный и педагог в области теории алгоритмов, автор учебников.',
      en: 'A renowned scholar and educator in algorithm theory, author of textbooks.',
    },
    awards: [{ kz: '«Үздік оқытушы»', ru: '«Лучший преподаватель»', en: 'Best Lecturer' }],
    mentors: [],
    students: ['a1'],
  },
  {
    id: 'a7',
    fac: 'phys',
    dept: 'phy',
    year: 1995,
    featured: true,
    video: false,
    accent: '#1E5A7E',
    name: { kz: 'Ерлан Тұрсынұлы Қалиев', ru: 'Ерлан Турсунович Калиев', en: 'Yerlan Kaliyev' },
    spec: { kz: 'Физика', ru: 'Физика', en: 'Physics' },
    pos: { kz: 'Ядролық физика зертханасының меңгерушісі', ru: 'Заведующий лабораторией ядерной физики', en: 'Head of Nuclear Physics Laboratory' },
    org: { kz: 'Ұлттық ядролық орталық', ru: 'Национальный ядерный центр', en: 'National Nuclear Centre' },
    bio: {
      kz: 'Атом энергетикасы саласындағы зерттеуші.',
      ru: 'Исследователь в области атомной энергетики и физики реакторов.',
      en: 'A researcher in nuclear energy and reactor physics.',
    },
    awards: [{ kz: 'Ғылым саласындағы мемлекеттік сыйлық', ru: 'Государственная премия в области науки', en: 'State Prize in Science' }],
    mentors: [],
    students: [],
  },
  {
    id: 'a8',
    fac: 'law',
    dept: 'pub',
    year: 2008,
    featured: false,
    video: false,
    accent: '#7E6422',
    name: { kz: 'Сәния Болатқызы Мұратова', ru: 'Сания Болатовна Муратова', en: 'Saniya Muratova' },
    spec: { kz: 'Құқықтану', ru: 'Юриспруденция', en: 'Jurisprudence' },
    pos: { kz: 'Судья', ru: 'Судья', en: 'Judge' },
    org: { kz: 'Облыстық сот', ru: 'Областной суд', en: 'Regional court' },
    bio: {
      kz: 'Конституциялық құқық саласындағы маман.',
      ru: 'Специалист в области конституционного и административного права.',
      en: 'A specialist in constitutional and administrative law.',
    },
    awards: [],
    mentors: [],
    students: [],
  },
  {
    id: 'a9',
    fac: 'phil',
    dept: 'kaz',
    year: 1990,
    featured: false,
    video: true,
    accent: '#3A4690',
    name: { kz: 'Әсем Қуанышқызы Нұрпейісова', ru: 'Асем Куанышевна Нурпеисова', en: 'Asem Nurpeissova' },
    spec: { kz: 'Қазақ филологиясы', ru: 'Казахская филология', en: 'Kazakh Philology' },
    pos: { kz: 'Жазушы, аудармашы', ru: 'Писатель, переводчик', en: 'Writer and translator' },
    org: { kz: 'Жазушылар одағы', ru: 'Союз писателей', en: 'Writers Union' },
    bio: {
      kz: 'Қазақ әдебиетін дамытушы, бірнеше кітаптың авторы.',
      ru: 'Развивает казахскую литературу, автор нескольких книг и переводов мировой классики.',
      en: 'A contributor to Kazakh literature, author of several books and translations of world classics.',
    },
    awards: [{ kz: 'Әдебиет саласындағы сыйлық', ru: 'Литературная премия', en: 'Literary award' }],
    mentors: [],
    students: [],
  },
]

// mentor-only records (teachers)
export let TEACH: Record<string, Teacher> = {
  m1: {
    name: { kz: 'Гүлнар Сәкенқызы Ахметова', ru: 'Гульнар Сакеновна Ахметова', en: 'Gulnar Akhmetova' },
    role: { kz: 'Ғылыми жетекші', ru: 'Научный руководитель', en: 'Academic supervisor' },
    id: 'a6',
  },
}

// ---------------------------------------------------------------------------
// Category collections — best teachers, scholars & laureates, university
// veterans. Each is a unified `Person` and opens the generic profile screen.
// ---------------------------------------------------------------------------

export let TEACHERS: Person[] = [
  {
    id: 't1',
    kind: 'teacher',
    fac: 'mit',
    year: 2023,
    accent: '#1B5AA6',
    name: { kz: 'Асхат Қуанышұлы Сериков', ru: 'Асхат Куанышевич Сериков', en: 'Askhat Serikov' },
    pos: { kz: 'Профессор, ф.-м.ғ.д.', ru: 'Профессор, д.ф.-м.н.', en: 'Professor, Dr. Sc.' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Есептеу математикасы', ru: 'Вычислительная математика', en: 'Computational mathematics' },
    bio: {
      kz: '30 жылдан астам дәріс беріп, республикалық олимпиада жеңімпаздарын дайындады.',
      ru: 'Преподаёт более 30 лет, подготовил победителей республиканских студенческих олимпиад по математике.',
      en: 'Has taught for 30+ years and trained national student mathematics-olympiad champions.',
    },
    badge: { kz: '2023 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2023', en: 'Best teacher of 2023' },
    highlight: {
      kz: '«Жыл оқытушысы» республикалық байқауының жеңімпазы',
      ru: 'Победитель республиканского конкурса «Лучший преподаватель года»',
      en: 'Winner of the national “Teacher of the Year” contest',
    },
    awards: [{ kz: '«ЖОО үздік оқытушысы» мемлекеттік гранты', ru: 'Грант «Лучший преподаватель вуза»', en: 'Grant “Best University Lecturer”' }],
  },
  {
    id: 't2',
    kind: 'teacher',
    fac: 'phys',
    year: 2022,
    accent: '#1E5A7E',
    name: { kz: 'Әлия Маратқызы Дүйсенова', ru: 'Алия Маратовна Дюсенова', en: 'Aliya Dyussenova' },
    pos: { kz: 'Доцент, PhD', ru: 'Доцент, PhD', en: 'Associate Professor, PhD' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Қатты дене физикасы', ru: 'Физика твёрдого тела', en: 'Solid-state physics' },
    bio: {
      kz: 'Студенттердің зерттеу жобаларын дамытады, цифрлық зертханалардың авторы.',
      ru: 'Развивает исследовательские проекты студентов, автор цифровых лабораторных практикумов.',
      en: 'Mentors student research and authored the faculty’s digital lab practicums.',
    },
    badge: { kz: '2022 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2022', en: 'Best teacher of 2022' },
    highlight: {
      kz: 'Студенттер дауысы бойынша факультеттің үздік ұстазы',
      ru: 'Лучший преподаватель факультета по голосованию студентов',
      en: 'Faculty’s top lecturer by student vote',
    },
  },
  {
    id: 't3',
    kind: 'teacher',
    fac: 'law',
    year: 2024,
    accent: '#7E6422',
    name: { kz: 'Нұрбол Серікұлы Оспанов', ru: 'Нурбол Серикович Оспанов', en: 'Nurbol Ospanov' },
    pos: { kz: 'Профессор, з.ғ.д.', ru: 'Профессор, д.ю.н.', en: 'Professor, Dr. of Law' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Конституциялық құқық', ru: 'Конституционное право', en: 'Constitutional law' },
    bio: {
      kz: 'Заң клиникасының жетекшісі, болашақ судьялар мен прокурорлардың ұстазы.',
      ru: 'Руководит юридической клиникой, наставник будущих судей и прокуроров.',
      en: 'Leads the legal clinic and mentors future judges and prosecutors.',
    },
    badge: { kz: '2024 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2024', en: 'Best teacher of 2024' },
    highlight: {
      kz: 'Үздік дәріс курсы үшін университет сыйлығы',
      ru: 'Премия университета за лучший лекционный курс',
      en: 'University prize for the best lecture course',
    },
  },
  {
    id: 't4',
    kind: 'teacher',
    fac: 'phil',
    year: 2023,
    accent: '#3A4690',
    name: { kz: 'Гүлмира Сейітқызы Қасенова', ru: 'Гульмира Сеитовна Касенова', en: 'Gulmira Kassenova' },
    pos: { kz: 'Доцент, ф.ғ.к.', ru: 'Доцент, к.ф.н.', en: 'Associate Professor, PhD' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Қазақ әдебиеті', ru: 'Казахская литература', en: 'Kazakh literature' },
    bio: {
      kz: 'Әдеби шеберхананы жүргізеді, жас ақындар мен жазушыларды тәрбиелейді.',
      ru: 'Ведёт литературную мастерскую, воспитывает молодых поэтов и писателей.',
      en: 'Runs a literary workshop nurturing young poets and writers.',
    },
    badge: { kz: '2023 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2023', en: 'Best teacher of 2023' },
  },
  {
    id: 't5',
    kind: 'teacher',
    fac: 'mit',
    year: 2021,
    accent: '#357AC0',
    name: { kz: 'Дамир Болатұлы Қанатов', ru: 'Дамир Болатович Канатов', en: 'Damir Kanatov' },
    pos: { kz: 'Аға оқытушы', ru: 'Старший преподаватель', en: 'Senior Lecturer' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Бағдарламалау', ru: 'Программирование', en: 'Programming' },
    bio: {
      kz: 'Студенттік хакатон командаларының жаттықтырушысы, IT-индустрия менторы.',
      ru: 'Тренер студенческих хакатон-команд, ментор от IT-индустрии.',
      en: 'Coaches student hackathon teams and mentors from the IT industry.',
    },
    badge: { kz: '2021 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2021', en: 'Best teacher of 2021' },
    highlight: {
      kz: 'Студенттер командалары — халықаралық хакатон жүлдегерлері',
      ru: 'Команды-победители международных хакатонов',
      en: 'Teams that placed at international hackathons',
    },
  },
  {
    id: 't6',
    kind: 'teacher',
    fac: 'phys',
    year: 2024,
    accent: '#2A6E8E',
    name: { kz: 'Жанна Ерболқызы Тұрарова', ru: 'Жанна Ерболовна Турарова', en: 'Zhanna Turarova' },
    pos: { kz: 'Доцент', ru: 'Доцент', en: 'Associate Professor' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Жаңартылатын энергетика', ru: 'Возобновляемая энергетика', en: 'Renewable energy' },
    bio: {
      kz: 'Күн энергиясы зертханасының жетекшісі, инженер-студенттердің ұстазы.',
      ru: 'Руководит лабораторией солнечной энергетики, наставник студентов-инженеров.',
      en: 'Heads the solar-energy lab and mentors engineering students.',
    },
    badge: { kz: '2024 жылдың үздік оқытушысы', ru: 'Лучший преподаватель 2024', en: 'Best teacher of 2024' },
  },
]

export let LAUREATES: Person[] = [
  {
    id: 'l1',
    kind: 'laureate',
    fac: 'mit',
    year: 2024,
    accent: '#1B5AA6',
    tag: 'scholarship',
    name: { kz: 'Әмір Дәулетұлы Ермеков', ru: 'Амир Даулетович Ермеков', en: 'Amir Yermekov' },
    pos: { kz: '4-курс студенті', ru: 'Студент 4 курса', en: '4th-year student' },
    spec: { kz: 'Информатика', ru: 'Информатика', en: 'Computer Science' },
    bio: {
      kz: 'Жасанды интеллект бойынша зерттеулерімен танылған, республикалық конференция жеңімпазы.',
      ru: 'Известен исследованиями по искусственному интеллекту, призёр республиканских научных конференций.',
      en: 'Known for AI research and a prize-winner at national science conferences.',
    },
    highlight: { kz: 'Қазақстан Республикасы Президентінің стипендиаты', ru: 'Стипендиат Президента Республики Казахстан', en: 'Scholar of the President of Kazakhstan' },
  },
  {
    id: 'l2',
    kind: 'laureate',
    fac: 'phys',
    year: 2023,
    accent: '#1E5A7E',
    tag: 'prize',
    name: { kz: 'Сабина Қайратқызы Әшімова', ru: 'Сабина Кайратовна Ашимова', en: 'Sabina Ashimova' },
    pos: { kz: 'Магистрант', ru: 'Магистрант', en: 'Master’s student' },
    spec: { kz: 'Физика', ru: 'Физика', en: 'Physics' },
    bio: {
      kz: 'Наноматериалдар саласындағы жобасы үшін марапатталды.',
      ru: 'Отмечена за проект в области наноматериалов и их применения в энергетике.',
      en: 'Recognized for a project on nanomaterials and their energy applications.',
    },
    highlight: { kz: '«Дарын» мемлекеттік жастар сыйлығының лауреаты', ru: 'Лауреат государственной молодёжной премии «Дарын»', en: 'Laureate of the “Daryn” state youth prize' },
  },
  {
    id: 'l3',
    kind: 'laureate',
    fac: 'law',
    year: 2024,
    accent: '#7E6422',
    tag: 'scholarship',
    name: { kz: 'Динара Болатқызы Сейтова', ru: 'Динара Болатовна Сейтова', en: 'Dinara Seitova' },
    pos: { kz: '3-курс студенті', ru: 'Студентка 3 курса', en: '3rd-year student' },
    spec: { kz: 'Құқықтану', ru: 'Юриспруденция', en: 'Jurisprudence' },
    bio: {
      kz: 'Студенттік құқықтық кеңес жетекшісі, дебат чемпионатының жеңімпазы.',
      ru: 'Руководитель студенческого правового совета, чемпионка дебатных турниров.',
      en: 'Leads the student legal council and a champion debater.',
    },
    highlight: { kz: 'Е.А. Бөкетов атындағы атаулы стипендия иегері', ru: 'Обладатель именной стипендии имени Е.А. Букетова', en: 'Holder of the Ye. Buketov named scholarship' },
  },
  {
    id: 'l4',
    kind: 'laureate',
    fac: 'phil',
    year: 2022,
    accent: '#3A4690',
    tag: 'prize',
    name: { kz: 'Мадина Нұрланқызы Әбіл', ru: 'Мадина Нурлановна Абиль', en: 'Madina Abil' },
    pos: { kz: 'Магистрант', ru: 'Магистрант', en: 'Master’s student' },
    spec: { kz: 'Қазақ филологиясы', ru: 'Казахская филология', en: 'Kazakh Philology' },
    bio: {
      kz: 'Жас аудармашы, әлем классикасын қазақ тіліне аударумен айналысады.',
      ru: 'Молодой переводчик, работает над переводами мировой классики на казахский язык.',
      en: 'A young translator working on translations of world classics into Kazakh.',
    },
    highlight: { kz: 'Республикалық әдеби сыйлықтың лауреаты', ru: 'Лауреат республиканской литературной премии', en: 'Laureate of a national literary prize' },
  },
  {
    id: 'l5',
    kind: 'laureate',
    fac: 'mit',
    year: 2023,
    accent: '#3E7FC0',
    tag: 'scholarship',
    name: { kz: 'Темірлан Асанұлы Жақсыбеков', ru: 'Темирлан Асанович Жаксыбеков', en: 'Temirlan Zhaksybekov' },
    pos: { kz: '2-курс студенті', ru: 'Студент 2 курса', en: '2nd-year student' },
    spec: { kz: 'Ақпараттық жүйелер', ru: 'Информационные системы', en: 'Information Systems' },
    bio: {
      kz: 'Университеттің ашық деректер платформасының авторларының бірі.',
      ru: 'Один из авторов университетской платформы открытых данных.',
      en: 'A co-author of the university’s open-data platform.',
    },
    highlight: { kz: 'Облыс әкімінің стипендиаты', ru: 'Стипендиат акима области', en: 'Regional governor’s scholar' },
  },
  {
    id: 'l6',
    kind: 'laureate',
    fac: 'phys',
    year: 2024,
    accent: '#2A6E8E',
    tag: 'prize',
    name: { kz: 'Ерасыл Мұратұлы Тоқтаров', ru: 'Ерасыл Муратович Токтаров', en: 'Yerassyl Toktarov' },
    pos: { kz: 'Докторант', ru: 'Докторант', en: 'PhD candidate' },
    spec: { kz: 'Энергетика', ru: 'Энергетика', en: 'Energy Engineering' },
    bio: {
      kz: 'Жылу энергиясын сақтау жүйелерін зерттеуші, патент авторы.',
      ru: 'Исследователь систем накопления тепловой энергии, автор патента.',
      en: 'A researcher of thermal-energy storage systems and a patent holder.',
    },
    highlight: { kz: 'Ғылыми жетістіктері үшін университет сыйлығы', ru: 'Премия университета за научные достижения', en: 'University prize for research achievement' },
  },
]

export let VETERANS: Person[] = [
  {
    id: 'v1',
    kind: 'veteran',
    fac: 'mit',
    year: 1978,
    accent: '#134A8C',
    name: { kz: 'Қанат Сейітұлы Мұқанов', ru: 'Канат Сеитович Муканов', en: 'Kanat Mukanov' },
    pos: { kz: 'Профессор, кафедра негізін салушы', ru: 'Профессор, основатель научной школы', en: 'Professor, founder of a research school' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Математика', ru: 'Математика', en: 'Mathematics' },
    bio: {
      kz: 'Университетте 44 жыл еңбек етіп, бірнеше ұрпақ математиктерді тәрбиеледі.',
      ru: 'Проработал в университете 44 года, воспитал несколько поколений математиков.',
      en: 'Served the university for 44 years and educated several generations of mathematicians.',
    },
    badge: { kz: 'Университет ардагері', ru: 'Ветеран университета', en: 'University veteran' },
    highlight: { kz: 'ҚР білім беру ісінің еңбек сіңірген қызметкері', ru: 'Заслуженный работник образования РК', en: 'Honoured Education Worker of Kazakhstan' },
    meta: { kz: '1978 жылдан бері · 44 жыл еңбек өтілі', ru: 'На службе с 1978 · 44 года стажа', en: 'Since 1978 · 44 years of service' },
  },
  {
    id: 'v2',
    kind: 'veteran',
    fac: 'phys',
    year: 1972,
    accent: '#1E5A7E',
    name: { kz: 'Светлана Ивановна Петрова', ru: 'Светлана Ивановна Петрова', en: 'Svetlana Petrova' },
    pos: { kz: 'Доцент', ru: 'Доцент', en: 'Associate Professor' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Физика', ru: 'Физика', en: 'Physics' },
    bio: {
      kz: 'Факультет ашылғаннан бері жұмыс істеп, оқу зертханаларын құрды.',
      ru: 'Работает с момента открытия факультета, создала учебные лаборатории.',
      en: 'Has worked since the faculty opened and built its teaching laboratories.',
    },
    badge: { kz: 'Университет ардагері', ru: 'Ветеран университета', en: 'University veteran' },
    highlight: { kz: '«Еңбек ардагері» медалінің иегері', ru: 'Награждена медалью «Ветеран труда»', en: 'Awarded the “Veteran of Labour” medal' },
    meta: { kz: '1972 жылдан бері · 50 жыл еңбек өтілі', ru: 'На службе с 1972 · 50 лет стажа', en: 'Since 1972 · 50 years of service' },
  },
  {
    id: 'v3',
    kind: 'veteran',
    fac: 'law',
    year: 1985,
    accent: '#7E6422',
    name: { kz: 'Бақыт Әбдіұлы Жүсіпов', ru: 'Бакыт Абдиевич Жусупов', en: 'Bakyt Zhusupov' },
    pos: { kz: 'Профессор', ru: 'Профессор', en: 'Professor' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Құқықтану', ru: 'Юриспруденция', en: 'Jurisprudence' },
    bio: {
      kz: 'Заң мектебінің іргетасын қалаған ұстаздардың бірі.',
      ru: 'Один из преподавателей, заложивших основу юридической школы.',
      en: 'One of the educators who laid the foundation of the law school.',
    },
    badge: { kz: 'Университет ардагері', ru: 'Ветеран университета', en: 'University veteran' },
    meta: { kz: '1985 жылдан бері · 37 жыл еңбек өтілі', ru: 'На службе с 1985 · 37 лет стажа', en: 'Since 1985 · 37 years of service' },
  },
  {
    id: 'v4',
    kind: 'veteran',
    fac: 'phil',
    year: 1975,
    accent: '#3A4690',
    name: { kz: 'Роза Қажымұратқызы Әлібекова', ru: 'Роза Кажимуратовна Алибекова', en: 'Roza Alibekova' },
    pos: { kz: 'Профессор', ru: 'Профессор', en: 'Professor' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Қазақ тіл білімі', ru: 'Казахское языкознание', en: 'Kazakh Linguistics' },
    bio: {
      kz: 'Қазақ тіл білімі саласындағы оқулықтар мен сөздіктердің авторы.',
      ru: 'Автор учебников и словарей по казахскому языкознанию.',
      en: 'Author of textbooks and dictionaries in Kazakh linguistics.',
    },
    badge: { kz: 'Университет ардагері', ru: 'Ветеран университета', en: 'University veteran' },
    highlight: { kz: 'ҚР білім беру ісінің еңбек сіңірген қызметкері', ru: 'Заслуженный работник образования РК', en: 'Honoured Education Worker of Kazakhstan' },
    meta: { kz: '1975 жылдан бері · 47 жыл еңбек өтілі', ru: 'На службе с 1975 · 47 лет стажа', en: 'Since 1975 · 47 years of service' },
  },
  {
    id: 'v5',
    kind: 'veteran',
    fac: 'mit',
    year: 1981,
    accent: '#2A6BB0',
    name: { kz: 'Виктор Павлович Соколов', ru: 'Виктор Павлович Соколов', en: 'Viktor Sokolov' },
    pos: { kz: 'Аға оқытушы', ru: 'Старший преподаватель', en: 'Senior Lecturer' },
    org: { kz: 'Buketov University', ru: 'Buketov University', en: 'Buketov University' },
    spec: { kz: 'Информатика', ru: 'Информатика', en: 'Computer Science' },
    bio: {
      kz: 'Алғашқы есептеу орталығының негізін салушылардың бірі.',
      ru: 'Один из создателей первого вычислительного центра университета.',
      en: 'A co-founder of the university’s first computing centre.',
    },
    badge: { kz: 'Университет ардагері', ru: 'Ветеран университета', en: 'University veteran' },
    meta: { kz: '1981 жылдан бері · 41 жыл еңбек өтілі', ru: 'На службе с 1981 · 41 год стажа', en: 'Since 1981 · 41 years of service' },
  },
]

export const AUDIT: AuditEntry[] = [
  { who: 'moderator.pmi', act: { ru: 'Добавил выпускника', kz: 'Түлек қосты', en: 'Added alumnus' }, obj: 'Тлеубаева А.М.', t: '2026-06-16 14:22', tag: 'create' },
  { who: 'admin', act: { ru: 'Опубликовал запись', kz: 'Жазбаны жариялады', en: 'Published record' }, obj: 'Сеитов Н.Б.', t: '2026-06-16 11:08', tag: 'publish' },
  { who: 'moderator.is', act: { ru: 'Изменил биографию', kz: 'Өмірбаянды өзгертті', en: 'Edited biography' }, obj: 'Омаров Т.А.', t: '2026-06-15 17:45', tag: 'edit' },
  { who: 'moderator.phy', act: { ru: 'Загрузил видео', kz: 'Бейне жүктеді', en: 'Uploaded video' }, obj: 'Калиев Е.Т.', t: '2026-06-15 09:30', tag: 'media' },
  { who: 'admin', act: { ru: 'Создал модератора', kz: 'Модератор құрды', en: 'Created moderator' }, obj: 'moderator.kaz', t: '2026-06-14 16:12', tag: 'admin' },
  { who: 'moderator.pmi', act: { ru: 'Отправил на проверку', kz: 'Тексеруге жіберді', en: 'Sent for review' }, obj: 'Абенова Д.К.', t: '2026-06-14 10:01', tag: 'review' },
]

export const MODS: Moderator[] = [
  { login: 'moderator.pmi', fac: 'mit', scope: { ru: 'Прикладная математика', kz: 'Қолданбалы математика', en: 'Applied Mathematics' }, records: 247, status: 'active' },
  { login: 'moderator.is', fac: 'mit', scope: { ru: 'Информационные системы', kz: 'Ақпараттық жүйелер', en: 'Information Systems' }, records: 189, status: 'active' },
  { login: 'moderator.phy', fac: 'phys', scope: { ru: 'Физика', kz: 'Физика', en: 'Physics' }, records: 164, status: 'active' },
  { login: 'moderator.kaz', fac: 'phil', scope: { ru: 'Казахское языкознание', kz: 'Қазақ тіл білімі', en: 'Kazakh Linguistics' }, records: 221, status: 'pending' },
]

// ---------------------------------------------------------------------------
// Names are authored "Имя Отчество Фамилия" but presented surname-first
// (Фамилия Имя Отчество). Applied once, in place, to every person record so
// all consumers (profiles, cards, lists, breadcrumb, monogram initials) agree.
const surnameFirst = (loc: Loc): Loc => {
  const out: Loc = {}
  ;(Object.keys(loc) as (keyof Loc)[]).forEach((k) => {
    const parts = (loc[k] || '').trim().split(/\s+/)
    out[k] = parts.length < 2 ? loc[k] : [parts[parts.length - 1], ...parts.slice(0, -1)].join(' ')
  })
  return out
}
;[...ALU, ...TEACHERS, ...LAUREATES, ...VETERANS].forEach((r) => {
  r.name = surnameFirst(r.name)
})
Object.values(TEACH).forEach((t) => {
  t.name = surnameFirst(t.name)
})

// ---------------------------------------------------------------------------
// Hydration — replace the static fallback datasets with live API data.
// Consumers import these as ES live bindings, so reassigning updates everywhere
// once a re-render is triggered. API data is ALREADY surname-first, so assign
// directly and do NOT re-run `surnameFirst`.
export function hydrate(d: {
  faculties: Faculty[]
  alumni: Alumnus[]
  teach: Record<string, Teacher>
  teachers: Person[]
  laureates: Person[]
  veterans: Person[]
}) {
  FAC = d.faculties
  ALU = d.alumni
  TEACH = d.teach
  TEACHERS = d.teachers
  LAUREATES = d.laureates
  VETERANS = d.veterans
}
