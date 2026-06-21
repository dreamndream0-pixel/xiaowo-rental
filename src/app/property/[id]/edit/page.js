// src/app/property/[id]/edit/page.js
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import EditPropertyForm from '@/components/property/form/EditPropertyForm'

export default async function EditPropertyPage({ params }) {
  const { id } = params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login?redirect=/property/' + id + '/edit')
  }

  const property = await db.property.findFirst({
    where: { id, deletedAt: null },
    include: {
      images:    { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
      amenities: true,
      tags:      true,
    },
  })

  if (!property) {
    redirect('/account?mode=landlord')
  }

  if (property.landlordId !== session.user.id) {
    redirect('/account?mode=landlord')
  }

  return <EditPropertyForm property={JSON.parse(JSON.stringify(property))} />
}
