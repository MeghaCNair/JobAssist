"""Common US locations data for job preferences"""

STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
    "Wisconsin", "Wyoming"
]

MAJOR_CITIES = [
    "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", 
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", 
    "Fort Worth", "Columbus", "San Francisco", "Charlotte", "Indianapolis", "Seattle", 
    "Denver", "Boston", "El Paso", "Detroit", "Nashville", "Portland", "Memphis", 
    "Oklahoma City", "Las Vegas", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", 
    "Tucson", "Fresno", "Sacramento", "Atlanta", "Kansas City", "Miami", "Raleigh", 
    "Minneapolis", "Cleveland", "New Orleans", "Tampa", "Honolulu", "Pittsburgh", 
    "Cincinnati", "Orlando", "Buffalo", "Rochester", "Salt Lake City"
]

TECH_HUBS = [
    "San Francisco Bay Area", "Seattle", "New York City", "Boston", "Austin",
    "Washington DC", "Denver", "San Diego", "Portland", "Raleigh-Durham",
    "Atlanta", "Chicago", "Los Angeles", "Dallas-Fort Worth", "Phoenix",
    "Salt Lake City", "Nashville", "Charlotte", "Minneapolis", "Miami"
]

def get_all_locations():
    """Return a combined list of states and major cities"""
    return sorted(list(set(STATES + MAJOR_CITIES + TECH_HUBS)))

def get_states():
    """Return list of US states"""
    return sorted(STATES)

def get_major_cities():
    """Return list of major US cities"""
    return sorted(MAJOR_CITIES)

def get_tech_hubs():
    """Return list of major US tech hubs"""
    return sorted(TECH_HUBS) 