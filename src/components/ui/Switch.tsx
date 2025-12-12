'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  showIcons?: boolean
  label?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, size = 'md', showIcons = false, label, disabled, checked, ...props }, ref) => {
    const sizeConfig = {
      sm: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translateX: 'peer-checked:translate-x-4',
        icon: 'h-3 w-3'
      },
      md: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translateX: 'peer-checked:translate-x-5',
        icon: 'h-3.5 w-3.5'
      },
      lg: {
        track: 'h-7 w-14',
        thumb: 'h-6 w-6',
        translateX: 'peer-checked:translate-x-7',
        icon: 'h-4 w-4'
      }
    }

    const config = sizeConfig[size]

    return (
      <label className={cn(
        "relative inline-flex items-center cursor-pointer group",
        disabled && "cursor-not-allowed opacity-50"
      )}>
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          disabled={disabled}
          {...props}
        />
        
        {/* Track */}
        <div
          className={cn(
            'relative rounded-full transition-all duration-200 ease-in-out',
            'peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50',
            'shadow-inner border-2',
            
            // Off state
            'bg-gray-200 border-gray-300',
            
            // On state  
            'peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-500',
            'peer-checked:border-green-400 peer-checked:shadow-lg',
            
            // Disabled state
            'peer-disabled:bg-gray-100 peer-disabled:border-gray-200',
            'peer-disabled:peer-checked:from-gray-300 peer-disabled:peer-checked:to-gray-400',
            
            config.track,
            className
          )}
        >
          {/* Thumb */}
          <div
            className={cn(
              'absolute top-0.5 left-0.5 bg-white rounded-full transition-all duration-200 ease-in-out',
              'flex items-center justify-center',
              'shadow-md border border-gray-200',
              'group-hover:shadow-lg',
              
              // Transform
              config.translateX,
              config.thumb,
              
              // Enhanced checked state
              'peer-checked:border-green-300 peer-checked:shadow-lg'
            )}
          >
            {/* Icons */}
            {showIcons && (
              <>
                <Check className={cn(
                  'text-green-600 transition-opacity duration-150',
                  checked ? 'opacity-100' : 'opacity-0',
                  config.icon
                )} />
                <X className={cn(
                  'text-gray-400 transition-opacity duration-150 absolute',
                  checked ? 'opacity-0' : 'opacity-100',
                  config.icon
                )} />
              </>
            )}
          </div>

          {/* On/Off Text (for larger sizes) */}
          {size === 'lg' && (
            <>
              <span className={cn(
                'absolute left-1 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white transition-opacity duration-150',
                checked ? 'opacity-100' : 'opacity-0'
              )}>
                ON
              </span>
              <span className={cn(
                'absolute right-1 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-500 transition-opacity duration-150',
                checked ? 'opacity-0' : 'opacity-100'
              )}>
                OFF
              </span>
            </>
          )}
        </div>

        {/* Label */}
        {label && (
          <span className={cn(
            'ml-3 text-sm font-medium transition-colors',
            checked ? 'text-green-700' : 'text-gray-600',
            disabled && 'text-gray-400'
          )}>
            {label}
          </span>
        )}

        {/* Status indicator dot */}
        <div className={cn(
          'ml-2 h-2 w-2 rounded-full transition-all duration-200',
          checked 
            ? 'bg-green-400 shadow-lg shadow-green-400/50' 
            : 'bg-gray-300',
          disabled && 'bg-gray-200'
        )} />
      </label>
    )
  }
)

Switch.displayName = 'Switch'