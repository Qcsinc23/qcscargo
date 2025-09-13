import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop component that automatically scrolls to the top of the page
 * whenever the route changes. This ensures consistent user experience
 * when navigating between pages.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll to top of page when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Use smooth scrolling for better UX
    })
  }, [pathname]) // Re-run effect when pathname changes

  return null
}