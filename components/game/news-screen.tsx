'use client'

interface NewsScreenProps {
  onBack: () => void
}

/** Changelog shown on the "Новости" screen — newest first */
const NEWS: { version: string; date: string; items: string[] }[] = [
  {
    version: 'Beta 1.22',
    date: 'Сегодня',
    items: [
      'СЕКРЕТНЫЙ хоррор-уровень «Саша VS Шампунь» — открывается по коду. Подсказка: кто жоско воняет?',
      'Игра теперь на весь экран — тёмные боковушки убраны',
      'Базовая музыка теперь «02. Beta Main Menu»',
      'Новая категория лидерборда: Победы над шампунем (секретно)',
      'Новый персонаж в галерее: ШАМПУНЬ',
    ],
  },
  {
    version: 'Beta 1.21',
    date: 'Ранее',
    items: [
      'Новая кнопка «Новости» — ты сейчас здесь!',
      'Теперь можно менять музыку в игре: 3 трека на выбор (в Настройках и Звуках)',
      'Кнопка «Поддержать автора» в настройках',
      'В бесконечном режиме монеты дают x1.5',
      'Радиация на 6 уровне теперь не заканчивается до конца боя',
      'ЗлойВадимНаТачке теперь говорит своим голосом при появлении',
      'Реплики персонажей на стартовом экране показываются над ними',
      'Концовка после 6 уровня больше не пролистывается сама',
    ],
  },
  {
    version: 'Beta 1.2',
    date: 'Ранее',
    items: [
      'Бесконечный режим: выживай волны, рекорд в лидерборде «Пережито волн»',
      'Новая реклама: +50 за 10 секунд, +321 и таблетка за полный просмотр',
      'Экран «Звуки» — все звуки игры с описаниями',
      'На 6 уровне из мини Арсения спавнится маленький злой клон Дриггерта',
      'Таблетка доступна со 2 уровня, радиация стала опаснее',
      'На уровне «67» монеты дают x2, Арсений переименован в Арсения-Тренера',
    ],
  },
  {
    version: 'Beta 1.1',
    date: 'Ранее',
    items: [
      'Секретный уровень 7 «67» с собственной песней',
      'Дриггерт-охранник за 60 монет на 6 уровне',
      'Пасхалки при нажатии на персонажей в меню',
      'Игра стала устанавливаемой на телефон и ПК (PWA)',
    ],
  },
]

export function NewsScreen({ onBack }: NewsScreenProps) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center gap-5 overflow-y-auto bg-cover bg-center py-6"
      style={{ backgroundImage: "url('/assets/background.png')" }}
    >
      <h2 className="text-5xl font-black text-white" style={{ textShadow: '3px 3px 0 #1a1a2e' }}>
        Новости
      </h2>

      <div className="flex w-full max-w-2xl flex-col gap-4 px-6">
        {NEWS.map((entry) => (
          <article
            key={entry.version}
            className="flex flex-col gap-2 rounded-xl border-4 border-border bg-card px-5 py-4 shadow-[4px_4px_0_#1a1a2e]"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-xl font-black text-primary">{entry.version}</h3>
              <span className="text-xs font-bold text-muted-foreground">{entry.date}</span>
            </header>
            <ul className="flex flex-col gap-1">
              {entry.items.map((item) => (
                <li
                  key={item}
                  className="text-pretty text-sm font-bold leading-relaxed text-card-foreground"
                >
                  {'• '}
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border-4 border-border bg-card px-8 py-3 text-xl font-black text-card-foreground shadow-[4px_4px_0_#1a1a2e] transition-transform hover:scale-105"
      >
        Назад
      </button>
    </div>
  )
}
