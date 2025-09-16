import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BusinessHours {
  open_time: string | null
  close_time: string | null
  is_closed: boolean
  is_holiday: boolean
  holiday_name: string | null
  day_name: string
}

interface BusinessHoursDisplay {
  weekdayHours: string
  saturdayHours: string
  sundayHours: string
  todayStatus: string
  isOpen: boolean
}

export function useBusinessHours() {
  const [businessHours, setBusinessHours] = useState<BusinessHoursDisplay>({
    weekdayHours: 'Mon-Fri 9AM-6PM',
    saturdayHours: 'Sat 9AM-2PM',
    sundayHours: 'Sun Closed',
    todayStatus: 'Loading...',
    isOpen: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBusinessHours()

    // Set up real-time subscription for business hours changes
    const subscription = supabase
      .channel('business_hours_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'business_hours' 
        }, 
        () => {
          console.log('Business hours changed, refetching...')
          fetchBusinessHours()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchBusinessHours = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get business hours for all days of the week
      const { data: weeklyHours, error: weeklyError } = await supabase
        .from('business_hours')
        .select('*')
        .is('specific_date', null)
        .order('day_of_week')

      if (weeklyError) {
        throw weeklyError
      }

      // Get today's business hours
      const today = new Date().toISOString().split('T')[0]
      const { data: todayHours, error: todayError } = await supabase
        .rpc('get_business_hours', { check_date: today })

      if (todayError) {
        console.warn('Could not fetch today\'s hours:', todayError)
      }

      // Process weekly hours
      const hoursMap: { [key: number]: BusinessHours } = {}
      weeklyHours?.forEach(hour => {
        if (hour.day_of_week !== null) {
          hoursMap[hour.day_of_week] = {
            open_time: hour.open_time,
            close_time: hour.close_time,
            is_closed: hour.is_closed,
            is_holiday: hour.is_holiday,
            holiday_name: hour.holiday_name,
            day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hour.day_of_week]
          }
        }
      })

      // Format display strings
      const formatTime = (time: string | null) => {
        if (!time) return ''
        const [hours, minutes] = time.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${displayHour}${minutes !== '00' ? ':' + minutes : ''}${ampm}`
      }

      // Build weekday hours (Mon-Fri)
      let weekdayHours = 'Mon-Fri Closed'
      const mondayHours = hoursMap[1] // Monday
      if (mondayHours && !mondayHours.is_closed && mondayHours.open_time && mondayHours.close_time) {
        weekdayHours = `Mon-Fri ${formatTime(mondayHours.open_time)}-${formatTime(mondayHours.close_time)}`
      }

      // Build Saturday hours
      let saturdayHours = 'Sat Closed'
      const satHours = hoursMap[6] // Saturday
      if (satHours && !satHours.is_closed && satHours.open_time && satHours.close_time) {
        saturdayHours = `Sat ${formatTime(satHours.open_time)}-${formatTime(satHours.close_time)}`
      }

      // Build Sunday hours
      let sundayHours = 'Sun Closed'
      const sunHours = hoursMap[0] // Sunday
      if (sunHours && !sunHours.is_closed && sunHours.open_time && sunHours.close_time) {
        sundayHours = `Sun ${formatTime(sunHours.open_time)}-${formatTime(sunHours.close_time)}`
      }

      // Build today's status
      let todayStatus = 'Closed'
      let isOpen = false
      
      if (todayHours && todayHours.length > 0) {
        const today = todayHours[0]
        if (today.is_closed) {
          todayStatus = today.is_holiday ? `Closed - ${today.holiday_name}` : 'Closed Today'
        } else if (today.open_time && today.close_time) {
          const normalize = (time: string) => time.slice(0, 5)

          todayStatus = `Open ${normalize(today.open_time)}-${normalize(today.close_time)}`

          // Check if currently open by comparing normalized HH:MM strings
          const now = new Date()
          const currentTime = now.toTimeString().slice(0, 5)
          const openTime = normalize(today.open_time)
          const closeTime = normalize(today.close_time)
          isOpen = currentTime >= openTime && currentTime <= closeTime
        }
      }

      setBusinessHours({
        weekdayHours,
        saturdayHours,
        sundayHours,
        todayStatus,
        isOpen
      })

    } catch (err) {
      console.error('Error fetching business hours:', err)
      setError('Failed to load business hours')
      
      // Fallback to hardcoded hours
      setBusinessHours({
        weekdayHours: 'Mon-Fri 9AM-6PM',
        saturdayHours: 'Sat 9AM-2PM',
        sundayHours: 'Sun Closed',
        todayStatus: 'Hours unavailable',
        isOpen: false
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    businessHours,
    loading,
    error,
    refetch: fetchBusinessHours
  }
}
