import type { MediaItem } from '../types'

// Explicit development preview only; never saved to a person's records.
export const DEMO_MEDIA: MediaItem[] = [
  {kind:'image',name:'Демо · Студенческая жизнь',url:'https://images.pexels.com/photos/7972502/pexels-photo-7972502.jpeg?auto=compress&w=1200'},
  {kind:'image',name:'Демо · На кампусе',url:'https://images.pexels.com/photos/7683694/pexels-photo-7683694.jpeg?auto=compress&w=1200'},
  {kind:'image',name:'Демо · Университет',url:'https://images.pexels.com/photos/7972506/pexels-photo-7972506.jpeg?auto=compress&w=1200'},
  {kind:'video',name:'Демо · Видеоматериал 1',url:'/demo-media/album-1.webm'},
  {kind:'video',name:'Демо · Видеоматериал 2',url:'/demo-media/album-2.webm'},
]
