'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, GraduationCap } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm({
  schoolName,
  schoolLogoUrl,
}: {
  schoolName: string
  schoolLogoUrl?: string | null
}) {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const initials = schoolName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormData) {
    setError(null)
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    if (result?.error) {
      setError('Invalid email or password. Please try again.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          {schoolLogoUrl ? (
            <div className="mb-4 flex items-center justify-center rounded-2xl bg-white px-4 py-3 shadow-lg">
              <Image
                src={schoolLogoUrl}
                alt={`${schoolName} logo`}
                width={140}
                height={80}
                className="max-h-20 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg">
              {initials ? (
                <span className="text-lg font-bold text-primary-foreground">{initials}</span>
              ) : (
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800 text-center">{schoolName}</h1>
          <p className="text-slate-500 text-sm mt-1">Administration Portal</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email" type="email" placeholder="admin@school.com"
                  autoComplete="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password" type="password" placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  className={errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                ) : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
