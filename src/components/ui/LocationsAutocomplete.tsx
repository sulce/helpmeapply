'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { Plus, Trash2, MapPin, Globe, Home } from 'lucide-react'

interface Location {
  id: string
  name: string
  formatted: string
}

interface LocationsAutocompleteProps {
  selectedLocations: string[]
  onLocationsChange: (locations: string[]) => void
  placeholder?: string
  maxLocations?: number
}

export function LocationsAutocomplete({
  selectedLocations,
  onLocationsChange,
  placeholder = "Search for locations...",
  maxLocations = 5
}: LocationsAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length >= 1) {
        setIsLoading(true)
        try {
          const response = await fetch(`/api/locations/search?query=${encodeURIComponent(query)}`)
          if (response.ok) {
            const data = await response.json()
            setSuggestions(data.locations || [])
            setShowSuggestions(true)
          }
        } catch (error) {
          console.error('Error fetching location suggestions:', error)
          // Fallback to basic suggestions if API fails
          const fallbackSuggestions = [
            'Remote', 'New York, NY', 'San Francisco, CA', 'Toronto, ON, Canada', 'London, UK'
          ].filter(loc => loc.toLowerCase().includes(query.toLowerCase()))
           .map(name => ({ id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'), name, formatted: name }))
          setSuggestions(fallbackSuggestions)
          setShowSuggestions(fallbackSuggestions.length > 0)
        } finally {
          setIsLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 200) // Reduced delay for better responsiveness

    return () => clearTimeout(timeoutId)
  }, [query])

  const addLocation = (locationName: string) => {
    if (locationName && !selectedLocations.includes(locationName) && selectedLocations.length < maxLocations) {
      onLocationsChange([...selectedLocations, locationName])
      setQuery('')
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
      inputRef.current?.focus()
    }
  }

  const removeLocation = (index: number) => {
    const newLocations = selectedLocations.filter((_, i) => i !== index)
    onLocationsChange(newLocations)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (query.trim()) {
          addLocation(query.trim())
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          addLocation(suggestions[selectedIndex].name)
        } else if (query.trim()) {
          addLocation(query.trim())
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const getLocationIcon = (location: string) => {
    const lower = location.toLowerCase()
    if (lower.includes('remote') || lower.includes('home') || lower.includes('anywhere')) {
      return <Home className="h-4 w-4 text-green-600" />
    }
    if (lower.includes('hybrid')) {
      return <Globe className="h-4 w-4 text-blue-600" />
    }
    return <MapPin className="h-4 w-4 text-gray-600" />
  }

  return (
    <div className="space-y-3">
      {/* Input Section */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              placeholder={selectedLocations.length >= maxLocations ? `Maximum ${maxLocations} locations` : placeholder}
              disabled={selectedLocations.length >= maxLocations}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.map((location, index) => (
                  <button
                    key={location.id}
                    ref={el => { suggestionRefs.current[index] = el }}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                      index === selectedIndex ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                    onClick={() => addLocation(location.name)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {getLocationIcon(location.name)}
                    <span className="text-sm">{location.formatted}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (query.trim()) {
                addLocation(query.trim())
              }
            }}
            disabled={!query.trim() || selectedLocations.length >= maxLocations}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick suggestions for empty input */}
        {query === '' && selectedLocations.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-gray-500 mr-2">Popular:</span>
            {['Remote', 'New York, NY', 'San Francisco, CA', 'Toronto, ON, Canada'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addLocation(suggestion)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {getLocationIcon(suggestion)}
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Locations */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((location, index) => (
            <span
              key={index}
              className="bg-primary-100 text-primary-800 px-3 py-1 rounded-md text-sm flex items-center gap-2"
            >
              {getLocationIcon(location)}
              {location}
              <button
                type="button"
                onClick={() => removeLocation(index)}
                className="text-primary-600 hover:text-primary-800 ml-1"
                title="Remove location"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500">
        <p>💡 Start typing to search for cities, states, countries, or select &quot;Remote&quot; for remote work</p>
        {selectedLocations.length > 0 && (
          <p className="mt-1">✅ {selectedLocations.length}/{maxLocations} locations selected</p>
        )}
      </div>

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowSuggestions(false)
            setSelectedIndex(-1)
          }}
        />
      )}
    </div>
  )
}