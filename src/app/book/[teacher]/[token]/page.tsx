// src/app/book/[teacher]/[token]/page.tsx
import StudentBookingPortal from '@/components/StudentBookingPortal'

interface BookingPageProps {
  params: Promise<{
    teacher: string
    token: string
  }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { token } = await params
  return <StudentBookingPortal shareToken={token} />
}

// Generate metadata for the booking page
export async function generateMetadata() {
  return {
    title: 'Book Your Classes - ClassLogger',
    description: 'Book your classes with your teacher using ClassLogger',
    robots: 'noindex, nofollow', // Don't index booking pages for privacy
  }
}
