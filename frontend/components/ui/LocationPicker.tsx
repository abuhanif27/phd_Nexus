'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Loader2, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

interface LocationPickerProps {
  onLocationSelect: (location: {
    address: string;
    latitude: number;
    longitude: number;
    google_place_id: string;
  } | null) => void;
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

  useEffect(() => {
    setQuery(defaultAddress || '');
  }, [defaultAddress]);

  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=bd&limit=5`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'NexusCare-App',
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
      google_place_id: `osm-${suggestion.place_id}`,
    };

    setQuery(newLocation.address);
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(newLocation);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(null);
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
    <div className="relative">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MapPin className="h-4 w-4 text-slate-400" />
        </div>
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-9 pr-24 h-10 text-sm"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-0.5">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 mr-1" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="h-7 w-7 p-0"
          >
            <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-pulse text-blue-500' : 'text-slate-400'}`} />
          </Button>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 last:border-0"
              onClick={() => handleSelectSuggestion(s)}
            >
              <div className="flex items-start gap-2">
                <Search className="mt-0.5 h-3 w-3 text-slate-400 shrink-0" />
                <span className="line-clamp-2">{s.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
