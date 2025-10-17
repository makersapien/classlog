// src/app/book/[teacher]/[token]/page.tsx
import StudentBookingPortal from '@/components/StudentBookingPortal'

interface BookingPageProps {
  params: {
    teacher: string
    token: string
  }
}

export default function BookingPage({ params }: BookingPageProps) {
  return <StudentBookingPortal shareToken={params.token} />
}

// Generate metadata for the booking page
export async function generateMetadata({ params }: BookingPageProps) {
  return {
    title: 'Book Your Classes - ClassLogger',
    description: 'Book your classes with your teacher using ClassLogger',
    robots: 'noindex, nofollow', // Don't index booking pages for privacy
  }
}