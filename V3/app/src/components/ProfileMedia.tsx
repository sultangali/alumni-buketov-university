import { useRef, useState } from 'react'
import { useApp } from '../AppContext'
import { AvailableMedia } from './AvailableMedia'
import { Icon } from './icons'
import type { MediaItem } from '../types'

export function ProfileMedia({ media }: { media: MediaItem[] }) {
  const { ui, L } = useApp()
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(0)
  const photos = media.filter(m => m.kind === 'image' && m.url)
  const videos = media.filter(m => m.kind === 'video' && m.url)
  const move = (step: number) => setSelected(i => (i + step + photos.length) % photos.length)
  if (!photos.length && !videos.length) return null
  return <section className="profile-section profile-album">
    <h2>{L({ ru: 'Альбом', kz: 'Альбом', en: 'Album' })}</h2>
    {!!photos.length && <div className="album-group">
      <h3><Icon name="image" size={22}/>{ui.photos} <small>{photos.length}</small></h3>
      <div className="album-photos">{photos.map((m, i) => <button key={`${m.url}-${i}`} onClick={() => { setSelected(i); dialog.current?.showModal() }} aria-label={`${ui.photos}: ${m.name || i + 1}`}>
        <AvailableMedia url={m.url} kind="image" label={m.name || `${ui.photos} ${i + 1}`} />
        <span>{m.name || `${ui.photos} ${i + 1}`}</span>
      </button>)}</div>
    </div>}
    {!!videos.length && <div className="album-group">
      <h3><Icon name="play" size={22}/>{ui.videos} <small>{videos.length}</small></h3>
      <div className="album-videos">{videos.map((m, i) => <figure key={`${m.url}-${i}`}>
        <AvailableMedia url={m.url} kind="video" label={m.name || `${ui.videos} ${i + 1}`} />
        <figcaption>{m.name || `${ui.videos} ${i + 1}`}</figcaption>
      </figure>)}</div>
    </div>}
    {!!photos.length && <dialog ref={dialog} className="album-viewer" aria-label={ui.photos} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close() }} onKeyDown={e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
    }}>
      <div className="album-viewer-toolbar"><span>{selected + 1} / {photos.length}</span><button autoFocus onClick={() => dialog.current?.close()} aria-label={L({ ru: 'Закрыть', kz: 'Жабу', en: 'Close' })}>×</button></div>
      <AvailableMedia url={photos[selected]?.url || ''} kind="image" label={photos[selected]?.name || ui.photos} />
      <div className="album-viewer-caption">
        <button disabled={photos.length < 2} onClick={() => move(-1)} aria-label={L({ ru: 'Предыдущее фото', kz: 'Алдыңғы фото', en: 'Previous photo' })}>←</button>
        <p>{photos[selected]?.name}</p>
        <button disabled={photos.length < 2} onClick={() => move(1)} aria-label={L({ ru: 'Следующее фото', kz: 'Келесі фото', en: 'Next photo' })}>→</button>
      </div>
    </dialog>}
  </section>
}
