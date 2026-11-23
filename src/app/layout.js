// src/app/layout.js
import { Noto_Sans_TC, Noto_Serif_TC, Montserrat } from 'next/font/google'
import Providers from './providers'
import PageProgress from '@/components/layout/PageProgress'
import PullToRefresh from '@/components/layout/PullToRefresh'
import ButtonEffects from '@/components/layout/ButtonEffects'
import EmojiIconRuntime from '@/components/layout/EmojiIconRuntime'
import '../styles/globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto',
  display: 'swap',
})

const notoSerifTC = Noto_Serif_TC({
  subsets: ['latin'],
  weight: ['600', '700', '900'],
  variable: '--font-noto-serif',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata = {
  title: { default: '小蝸出租 · Snail Rental', template: '%s · 小蝸出租' },
  description: '城市裡的小窩・安心回家的地方。優質套房雅房出租，嚴選認證房東，安心媒合。',
  keywords: ['租屋', '套房', '雅房', '出租', '台北租屋', '小蝸出租'],
  openGraph: {
    title: '小蝸出租 · Snail Rental',
    description: '城市裡的小窩・安心回家的地方',
    type: 'website',
    locale: 'zh_TW',
  },
}

// Google Analytics 4（資源「小蝸出租」）。Search Console 也靠這段碼驗證網站擁有權，所以放在 <head> 裡。
const GA_MEASUREMENT_ID = 'G-F2F3MZRQN0'
const GA_INIT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" className={`${notoSansTC.variable} ${notoSerifTC.variable} ${montserrat.variable}`}>
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: GA_INIT }} />
      </head>
      <body><PageProgress /><PullToRefresh /><ButtonEffects /><EmojiIconRuntime /><Providers>{children}</Providers></body>
    </html>
  )
}
