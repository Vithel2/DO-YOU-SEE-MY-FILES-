'use client'

interface TutorialOverlayProps {
  onClose: () => void
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border-4 border-border bg-card p-6 shadow-[8px_8px_0_#1a1a2e] md:p-8">
        <h2 id="tutorial-title" className="text-4xl font-black text-card-foreground">
          Обучение
        </h2>
        <ul className="flex flex-col gap-3 text-lg font-medium leading-relaxed text-card-foreground">
          <li className="flex items-center gap-3">
            <img src="/assets/can-ded.png" alt="" className="h-10 w-10 shrink-0" />
            <span>
              С неба падают банки — кликай по ним! Банка «Дед» даёт{' '}
              <strong>+5</strong> валюты.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <img src="/assets/can-shiza.png" alt="" className="h-10 w-10 shrink-0" />
            <span>
              Банка с таблетками от шизофрении даёт <strong>+10</strong> валюты. Она
              падает реже!
            </span>
          </li>
          <li className="flex items-center gap-3">
            <img src="/assets/arseniy-ezhp.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            <span>
              Трать валюту на призыв Арсениев — кнопки внизу экрана. Они пойдут в бой
              сами.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <img src="/assets/enemy-base.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
            <span>
              Защити свою будку слева и уничтожь вражескую базу справа, откуда лезут
              друзья Арсения!
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-xl border-4 border-border bg-primary px-14 py-3 text-2xl font-black text-primary-foreground shadow-[5px_5px_0_#1a1a2e] transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#1a1a2e]"
        >
          Го
        </button>
      </div>
    </div>
  )
}
