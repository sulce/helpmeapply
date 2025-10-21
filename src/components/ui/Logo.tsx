import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
}

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl'
}

export function Logo({ className, size = 'md', showText = true, href = '/' }: LogoProps) {
  const logoContent = (
    <div className={cn('flex items-center space-x-2', className)}>
      <Image
        src="https://res.cloudinary.com/drvfzwgjm/image/upload/v1761079284/6d9abdda-f20a-4568-8638-09bc7f5949c5_bzags5.jpg"
        alt="HelpMeApply AI Logo"
        width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        className={cn('rounded-lg object-contain', sizeClasses[size])}
        priority
      />
      {showText && (
        <span className={cn('font-bold text-gray-900', textSizeClasses[size])}>
          HelpMeApply AI
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}