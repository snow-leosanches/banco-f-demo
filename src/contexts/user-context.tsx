import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { CmrTier, Customer } from '@/lib/config'
import { setUserForTracking, clearUserForTracking, setCustomerContext, clearCustomerContext } from '@/lib/snowplow-config'
import { getManualLoginUserId, toGuid } from '@/lib/user-id'

const DEMO_USER_KEY = 'bancof-demo-user'

export interface DemoUser {
  email: string
  isLoggedIn: boolean
  userId?: string
  name?: string
  phone?: string
  firstName?: string
  customerId?: string
  cmrTier?: CmrTier | null
  comuna?: string
}

export type LoginDetails = {
  email: string
  userId: string
  name?: string
  phone?: string
  firstName?: string
  customerId: string
  cmrTier?: CmrTier | null
  comuna?: string
}

interface UserContextValue {
  user: DemoUser | null
  customer: Customer | null
  isLoading: boolean
  login: (details: LoginDetails) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

function normalizeDemoUser(user: DemoUser): DemoUser & { userId: string; customerId: string } {
  const userId =
    toGuid(user.userId) ??
    toGuid(user.customerId) ??
    (user.email ? getManualLoginUserId(user.email) : crypto.randomUUID())
  const customerId = toGuid(user.customerId) ?? userId
  return { ...user, userId, customerId }
}

function demoUserToCustomer(user: DemoUser): Customer | null {
  if (!user.customerId || !user.comuna) return null
  return {
    customerId: user.customerId,
    firstName: user.firstName || user.name?.split(' ')[0] || 'Cliente',
    cmrTier: user.cmrTier ?? null,
    comuna: user.comuna,
  }
}

function applyIdentity(user: DemoUser) {
  const next = normalizeDemoUser(user)
  setUserForTracking(next.userId)
  const customer = demoUserToCustomer(next)
  if (customer) setCustomerContext(customer)
  else clearCustomerContext()
  return next
}

/**
 * Demo login state. Restores from localStorage, identifies the Snowplow
 * tracker (`setUserId`), and attaches the `customer` entity via
 * `addGlobalContexts` so cmr_tier / comuna / customer_id are available for
 * the warehouse and Signals.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(DEMO_USER_KEY)
        if (raw) {
          const savedUser = applyIdentity(JSON.parse(raw) as DemoUser)
          setUser(savedUser)
          window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(savedUser))
        }
      } catch {
        // Ignore malformed localStorage state.
      } finally {
        setIsLoading(false)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const login = (details: LoginDetails) => {
    const nextUser = applyIdentity({ ...details, isLoggedIn: true })
    setUser(nextUser)
    window.localStorage.setItem(DEMO_USER_KEY, JSON.stringify(nextUser))
  }

  const logout = () => {
    setUser(null)
    window.localStorage.removeItem(DEMO_USER_KEY)
    clearUserForTracking()
    clearCustomerContext()
  }

  return (
    <UserContext.Provider
      value={{ user, customer: user ? demoUserToCustomer(user) : null, isLoading, login, logout }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
