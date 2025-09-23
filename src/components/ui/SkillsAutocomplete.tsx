'use client'

import { useState, useRef, useEffect } from 'react'
import { searchSkills, getPopularSkills, type SkillSuggestion } from '@/lib/skillsDatabase'
import { X, Plus } from 'lucide-react'

interface SkillsAutocompleteProps {
  selectedSkills: Array<{
    id: string
    name: string
    category: string
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  }>
  onSkillsChange: (skills: Array<{
    id: string
    name: string
    category: string
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  }>) => void
  placeholder?: string
}

export function SkillsAutocomplete({ 
  selectedSkills, 
  onSkillsChange, 
  placeholder = "Search skills..." 
}: SkillsAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length >= 2) {
      const results = searchSkills(query)
      setSuggestions(results)
      setShowSuggestions(true)
    } else if (query.length === 0) {
      setSuggestions(getPopularSkills())
      setShowSuggestions(false)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    setActiveSuggestion(-1)
  }, [query])

  const addSkill = (skillSuggestion: SkillSuggestion) => {
    // Check if skill already exists
    if (selectedSkills.some(skill => skill.name.toLowerCase() === skillSuggestion.name.toLowerCase())) {
      return
    }

    const newSkill = {
      id: Date.now().toString(),
      name: skillSuggestion.name,
      category: skillSuggestion.category,
      proficiency: 'Intermediate' as const
    }

    onSkillsChange([...selectedSkills, newSkill])
    setQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeSkill = (skillId: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill.id !== skillId))
  }

  const updateSkillProficiency = (skillId: string, proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert') => {
    onSkillsChange(
      selectedSkills.map(skill => 
        skill.id === skillId ? { ...skill, proficiency } : skill
      )
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeSuggestion >= 0) {
          addSkill(suggestions[activeSuggestion])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setActiveSuggestion(-1)
        break
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.name}
                onClick={() => addSkill(suggestion)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between ${
                  index === activeSuggestion ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{suggestion.name}</div>
                  <div className="text-sm text-gray-500">{suggestion.category}</div>
                </div>
                <Plus className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {/* Popular Skills (when no query) */}
        {query.length === 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">Popular skills:</p>
            <div className="flex flex-wrap gap-2">
              {getPopularSkills().slice(0, 6).map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => addSkill(skill)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full border"
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Selected Skills ({selectedSkills.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedSkills.map((skill) => (
              <div key={skill.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({skill.category})</span>
                  </div>
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={skill.proficiency}
                  onChange={(e) => updateSkillProficiency(skill.id, e.target.value as any)}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}