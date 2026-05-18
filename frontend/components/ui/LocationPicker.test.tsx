import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';
import React from 'react';
import '@testing-library/jest-dom';

// Mock fetch
vi.stubGlobal("fetch", vi.fn());

describe('LocationPicker', () => {
  it('renders correctly', () => {
    render(<LocationPicker onLocationSelect={() => {}} />);
    expect(screen.getByPlaceholderText(/Enter your address/i)).toBeDefined();
  });

  it('shows suggestions when typing', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => [
        { place_id: 1, display_name: 'Dhaka, Bangladesh', lat: '23.8103', lon: '90.4125' }
      ],
    });

    render(<LocationPicker onLocationSelect={() => {}} />);
    const input = screen.getByPlaceholderText(/Enter your address/i);
    
    fireEvent.change(input, { target: { value: 'Dha' } });

    await waitFor(() => {
      expect(screen.getByText(/Dhaka, Bangladesh/i)).toBeDefined();
    });
  });

  it('calls onLocationSelect when a suggestion is clicked', async () => {
    const onSelect = vi.fn();
    (global.fetch as Mock).mockResolvedValueOnce({
      json: async () => [
        { place_id: 1, display_name: 'Dhaka, Bangladesh', lat: '23.8103', lon: '90.4125' }
      ],
    });

    render(<LocationPicker onLocationSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Enter your address/i);
    
    fireEvent.change(input, { target: { value: 'Dha' } });

    await waitFor(() => {
      const suggestion = screen.getByText(/Dhaka, Bangladesh/i);
      fireEvent.click(suggestion);
    });

    expect(onSelect).toHaveBeenCalledWith({
      address: 'Dhaka, Bangladesh',
      latitude: 23.8103,
      longitude: 90.4125,
      google_place_id: 'osm-1',
    });
  });
});
