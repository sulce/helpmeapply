import { NextRequest, NextResponse } from 'next/server'

// Common locations for job search
const COMMON_LOCATIONS = [
  // Major US Cities
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Indianapolis, IN',
  'Charlotte, NC',
  'San Francisco, CA',
  'Seattle, WA',
  'Denver, CO',
  'Boston, MA',
  'Atlanta, GA',
  'Miami, FL',
  'Detroit, MI',
  'Orlando, FL',
  'Portland, OR',
  'Las Vegas, NV',
  'Nashville, TN',
  'Raleigh, NC',
  'Tampa, FL',
  'Minneapolis, MN',
  
  // Major Canadian Cities
  'Toronto, ON, Canada',
  'Montreal, QC, Canada',
  'Vancouver, BC, Canada',
  'Calgary, AB, Canada',
  'Edmonton, AB, Canada',
  'Ottawa, ON, Canada',
  'Winnipeg, MB, Canada',
  'Quebec City, QC, Canada',
  'Hamilton, ON, Canada',
  'Kitchener, ON, Canada',
  
  // Major UK Cities
  'London, UK',
  'Manchester, UK',
  'Birmingham, UK',
  'Leeds, UK',
  'Glasgow, UK',
  'Edinburgh, UK',
  'Liverpool, UK',
  'Bristol, UK',
  
  // Major Australian Cities
  'Sydney, Australia',
  'Melbourne, Australia',
  'Brisbane, Australia',
  'Perth, Australia',
  'Adelaide, Australia',
  
  // Remote/Flexible Options
  'Remote',
  'Work From Home',
  'Hybrid - Remote',
  'Anywhere',
]

// US States
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

// Canadian Provinces
const CANADIAN_PROVINCES = [
  'Alberta, Canada',
  'British Columbia, Canada', 
  'Manitoba, Canada',
  'New Brunswick, Canada',
  'Newfoundland and Labrador, Canada',
  'Northwest Territories, Canada',
  'Nova Scotia, Canada',
  'Nunavut, Canada',
  'Ontario, Canada',
  'Prince Edward Island, Canada',
  'Quebec, Canada',
  'Saskatchewan, Canada',
  'Yukon, Canada'
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')?.toLowerCase() || ''
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        locations: []
      })
    }

    // Filter locations based on query
    const filteredLocations = [
      ...COMMON_LOCATIONS,
      ...US_STATES,
      ...CANADIAN_PROVINCES
    ]
      .filter(location => 
        location.toLowerCase().includes(query) ||
        location.toLowerCase().startsWith(query)
      )
      .sort((a, b) => {
        // Prioritize exact matches and starts-with matches
        const aStartsWith = a.toLowerCase().startsWith(query)
        const bStartsWith = b.toLowerCase().startsWith(query)
        
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        
        // Then sort by length (shorter = more relevant)
        return a.length - b.length
      })
      .slice(0, 10) // Limit to top 10 results

    return NextResponse.json({
      success: true,
      locations: filteredLocations.map(location => ({
        id: location.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: location,
        formatted: location
      }))
    })

  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json(
      { error: 'Failed to search locations' },
      { status: 500 }
    )
  }
}