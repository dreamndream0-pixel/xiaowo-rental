// src/app/contact/page.js  (Server Component)
import Navbar from '@/components/layout/NavbarWrapper'
import Footer from '@/components/layout/Footer'
import ContactForm from '@/components/contact/ContactForm'

export const metadata = {
  title: '成為房東 | 小蝸出租',
  description: '想把房子交給小蝸出租管理嗎？留下聯絡方式，我們會盡快與您聯繫。',
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <ContactForm />
      <Footer />
    </>
  )
}
