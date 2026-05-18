'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

interface LocationPickerProps {
  onLocationSelect: (location: {
    address: string;
    latitude: number;
    longitude: number;
    google_place_id: string; // Keeping field name for compatibility, will store OSM ID
  }) => void;
  defaultAddress?: string;
  placeholder?: string;
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({ onLocationSelect, defaultAddress = '', placeholder = 'Enter your address' }: LocationPickerProps) {
  const [query, setQuery] = useState(defaultAddress);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      // Using OpenStreetMap's Nominatim API (Free)
      // Restricting to Bangladesh (countrycodes=bd)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=bd&limit=5`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'NexusCare-App', // Important for Nominatim policy
          },
        }
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const newLocation = {
      address: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      google_place_id: `osm-${suggestion.place_id}`, // Prefix with osm to distinguish
    };

    setQuery(newLocation.address);
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(newLocation);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding using Nominatim (Free)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'NexusCare-App',
              },
            }
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            const newLocation = {
              address: data.display_name,
              latitude,
              longitude,
              google_place_id: `osm-${data.place_id}`,
            };
            setQuery(newLocation.address);
            onLocationSelect(newLocation);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
      }
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-20"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            title="Use current location"
          >
            <Navigation className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => handleSelectSuggestion(s)}
            >
              <div className="flex items-start gap-2">
                <Search className="mt-1 h-3 w-3 text-gray-400" />
                <span>{s.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      <p className="text-xs text-gray-500">
        Start typing your address and select from the suggestions to verify your location. (Powered by OpenStreetMap)
      </p>
    </div>
  );
}
