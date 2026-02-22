import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface LocationResult {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
}

const MOCK_LOCATIONS: LocationResult[] = [
  { id: '1', address: '10 Momrow Terrace, Menands, NY 12204', latitude: 42.6856, longitude: -73.7254 },
  { id: '2', address: '123 Main Street, Albany, NY 12207', latitude: 42.6526, longitude: -73.7562 },
  { id: '3', address: '456 Broadway, Albany, NY 12204', latitude: 42.6608, longitude: -73.7547 },
  { id: '4', address: '789 Central Avenue, Albany, NY 12206', latitude: 42.6655, longitude: -73.7885 },
  { id: '5', address: '321 State Street, Schenectady, NY 12305', latitude: 42.8142, longitude: -73.9396 },
  { id: '6', address: '555 Wolf Road, Colonie, NY 12205', latitude: 42.7157, longitude: -73.8128 },
  { id: '7', address: '100 Western Avenue, Albany, NY 12203', latitude: 42.6541, longitude: -73.7831 },
  { id: '8', address: '200 Lark Street, Albany, NY 12210', latitude: 42.6563, longitude: -73.7614 },
  { id: '9', address: '350 Northern Boulevard, Albany, NY 12204', latitude: 42.6782, longitude: -73.7498 },
  { id: '10', address: '450 New Karner Road, Albany, NY 12205', latitude: 42.7094, longitude: -73.8423 },
  { id: '11', address: '75 Woodlawn Avenue, Saratoga Springs, NY 12866', latitude: 43.0831, longitude: -73.7846 },
  { id: '12', address: '42 Caroline Street, Saratoga Springs, NY 12866', latitude: 43.0841, longitude: -73.7854 },
  { id: '13', address: '1500 Washington Avenue, Albany, NY 12222', latitude: 42.6866, longitude: -73.8265 },
  { id: '14', address: '60 State Street, Troy, NY 12180', latitude: 42.7284, longitude: -73.6918 },
  { id: '15', address: '15 Park Avenue, Clifton Park, NY 12065', latitude: 42.8496, longitude: -73.7990 },
];

interface LocationSearchProps {
  value: string;
  onSelect: (location: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  testID?: string;
}

export default function LocationSearch({ value, onSelect, placeholder, testID }: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchLocations = useCallback((text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const lower = text.toLowerCase();
      const filtered = MOCK_LOCATIONS.filter((loc) =>
        loc.address.toLowerCase().includes(lower)
      ).slice(0, 5);

      if (filtered.length === 0 && text.trim().length >= 3) {
        const randomLat = 42.6856 + (Math.random() - 0.5) * 0.1;
        const randomLon = -73.7254 + (Math.random() - 0.5) * 0.1;
        filtered.push({
          id: `custom_${Date.now()}`,
          address: text.trim(),
          latitude: randomLat,
          longitude: randomLon,
        });
      }

      setResults(filtered);
      setShowDropdown(filtered.length > 0);
      setIsSearching(false);
    }, 300);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    searchLocations(text);
  }, [searchLocations]);

  const handleSelect = useCallback((location: LocationResult) => {
    setQuery(location.address);
    setShowDropdown(false);
    onSelect({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <MapPin color={Colors.teal} size={16} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? 'Search address...'}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          testID={testID}
        />
        {isSearching && <ActivityIndicator size="small" color={Colors.teal} />}
        {query.length > 0 && !isSearching && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <X color={Colors.textMuted} size={16} />
          </Pressable>
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
            >
              <MapPin color={Colors.textMuted} size={14} />
              <Text style={styles.dropdownText} numberOfLines={2}>{item.address}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { zIndex: 1000 } : { elevation: 10 }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemPressed: {
    backgroundColor: Colors.card,
  },
  dropdownText: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
