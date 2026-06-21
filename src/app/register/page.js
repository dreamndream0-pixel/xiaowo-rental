// src/app/register/page.js  (Server Component)
import Navbar from '@/components/layout/NavbarWrapper'
import RegisterForm from '@/components/auth/RegisterForm'

export const metadata = { title: '註冊 | 小蝸出租' }

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <RegisterForm />
    </>
  )
}
