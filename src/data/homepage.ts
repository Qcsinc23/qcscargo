import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  CalendarClock,
  Clock,
  Container,
  Globe,
  HeartHandshake,
  MapPin,
  Package,
  Phone,
  Plane,
  PlaneTakeoff,
  Radar,
  Shield,
  ShieldCheck,
  Truck,
  Warehouse
} from 'lucide-react'

export type Testimonial = {
  name: string
  location: string
  rating: number
  text: string
  shipmentType: string
}

export type ProcessStep = {
  step: number
  title: string
  description: string
  icon: LucideIcon
}

export type StatHighlight = {
  number: string
  label: string
}

export type Destination = {
  country: string
  city: string
  days: string
  rate: string
}

export type IconFeature = {
  title: string
  description: string
  icon: LucideIcon
}

export type StyledIconFeature = IconFeature & {
  iconBg: string
  iconColor: string
}

export type ServicePillar = {
  title: string
  description: string
  icon: LucideIcon
  points: string[]
}

export const testimonials: Testimonial[] = [
  {
    name: 'Maria Rodriguez',
    location: 'Newark, NJ to Georgetown, Guyana',
    rating: 5,
    text: 'QCS Cargo made shipping to my family in Georgetown so easy. Fast delivery and great customer service. Highly recommended!',
    shipmentType: 'Electronics & Household Items'
  },
  {
    name: 'David Thompson',
    location: 'Jersey City, NJ to Kingston, Jamaica',
    rating: 5,
    text: 'Professional service from start to finish. My business shipments always arrive on time and in perfect condition.',
    shipmentType: 'Business Equipment'
  },
  {
    name: 'Sarah Williams',
    location: 'Elizabeth, NJ to Port of Spain, Trinidad',
    rating: 5,
    text: 'The consolidation service saved me so much money. QCS Cargo really understands the Caribbean shipping needs.',
    shipmentType: 'Medical Supplies'
  }
]

export const processSteps: ProcessStep[] = [
  {
    step: 1,
    title: 'Get Quote & Schedule',
    description: 'Contact us for a detailed rate quote and arrange pickup or drop-off at our secure facility.',
    icon: Phone
  },
  {
    step: 2,
    title: 'Cargo Drop-off/Pickup',
    description: 'Bring your items to our Kearny facility or schedule convenient pickup service within 25 miles.',
    icon: Truck
  },
  {
    step: 3,
    title: 'Processing & Consolidation',
    description: 'We prepare documentation, consolidate shipments, and ensure compliance with Caribbean customs.',
    icon: Package
  },
  {
    step: 4,
    title: 'Air Freight Shipping',
    description: 'Express air cargo service with trusted carriers to your Caribbean destination.',
    icon: Plane
  },
  {
    step: 5,
    title: 'Destination Delivery',
    description: 'Local delivery coordination or airport pickup notification once your cargo arrives.',
    icon: MapPin
  }
]

export const stats: StatHighlight[] = [
  { number: '10+', label: 'Years Serving Caribbean Community' },
  { number: '5,000+', label: 'Successful Shipments' },
  { number: '3-5', label: 'Days Average Transit Time' },
  { number: '99%', label: 'Customer Satisfaction Rate' }
]

export const destinations: Destination[] = [
  { country: 'Guyana', city: 'Georgetown', days: '3-5 days', rate: 'from $3.50/lb' },
  { country: 'Jamaica', city: 'Kingston', days: '4-6 days', rate: 'from $3.75/lb' },
  { country: 'Trinidad', city: 'Port of Spain', days: '4-6 days', rate: 'from $4.00/lb' },
  { country: 'Barbados', city: 'Bridgetown', days: '5-7 days', rate: 'from $4.25/lb' },
  { country: 'Suriname', city: 'Paramaribo', days: '4-6 days', rate: 'from $3.75/lb' }
]

export const heroHighlights: IconFeature[] = [
  {
    title: 'Secure TSA Known Shipper',
    description: 'Compliant screening and documentation for every departure.',
    icon: ShieldCheck
  },
  {
    title: 'Weekly Flight Windows',
    description: 'Predictable departures with proactive status updates.',
    icon: CalendarClock
  },
  {
    title: 'Caribbean Customer Care',
    description: 'Dedicated team supporting families and businesses abroad.',
    icon: HeartHandshake
  }
]

export const logisticsSolutions: IconFeature[] = [
  {
    title: 'Door-to-Airport Air Freight',
    description: 'Coordinated pickup, consolidation, and priority loading for commercial and personal cargo.',
    icon: PlaneTakeoff
  },
  {
    title: 'Secured Warehousing',
    description: 'Climate-controlled storage, digital inventory, and compliance-ready documentation.',
    icon: Warehouse
  },
  {
    title: 'Commercial Cargo Programs',
    description: 'Tailored solutions for retailers and manufacturers shipping regularly to the Caribbean.',
    icon: Container
  },
  {
    title: 'Destination Delivery Partners',
    description: 'Trusted local handlers and customs partners across Caribbean hubs.',
    icon: HeartHandshake
  }
]

export const servicePillars: ServicePillar[] = [
  {
    title: 'Commercial Logistics Desk',
    description: 'Priority space allocation and dedicated account management for enterprises.',
    icon: BarChart3,
    points: ['Strategic lane planning', 'Inventory visibility', 'Preferred carrier access']
  },
  {
    title: 'Family & Personal Shipping',
    description: 'Barrels, care packages, and personal effects treated with white-glove service.',
    icon: Package,
    points: ['Barrel consolidation', 'Special handling requests', 'Photo confirmation on departure']
  },
  {
    title: 'Specialty & Oversized Cargo',
    description: 'Engineered crating, temperature control, and time-critical shipments.',
    icon: BadgeCheck,
    points: ['Hazmat coordination', 'Temperature monitoring', 'Time-critical escorts']
  }
]

export const whyChooseFeatures: StyledIconFeature[] = [
  {
    title: 'Caribbean Expertise',
    description: 'Deep understanding of customs requirements, cultural expectations, and destination logistics.',
    icon: Globe,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  {
    title: 'Precision Transit Times',
    description: 'Express air service with reliable 3-7 day delivery schedules to major Caribbean destinations.',
    icon: Clock,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  {
    title: 'Smart Consolidation',
    description: 'Maximize savings through intelligent consolidation of multiple shipments with precision logistics.',
    icon: Boxes,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600'
  },
  {
    title: 'Secure Handling',
    description: 'Climate-controlled facility with 24/7 surveillance and precision cargo handling protocols.',
    icon: Shield,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600'
  }
]

export const operationsHighlights: IconFeature[] = [
  {
    title: 'Real-time Consolidation Updates',
    description: 'Track every box through intake, staging, and outbound loading with instant alerts.',
    icon: Radar
  },
  {
    title: 'Verified Chain of Custody',
    description: 'Digital signatures and security seals maintained across the entire handling process.',
    icon: ShieldCheck
  },
  {
    title: 'Dedicated Destination Support',
    description: 'On-the-ground coordinators keep your receivers informed and prepared for delivery.',
    icon: HeartHandshake
  }
]
