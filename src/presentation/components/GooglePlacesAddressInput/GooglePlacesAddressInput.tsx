'use client';

import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { env } from '@/infrastructure/config/env';
import {
  parseGooglePlacesAddress,
  type GooglePlacesAddressSelection,
} from './googlePlaceAddress';
import styles from './GooglePlacesAddressInput.module.css';

export type GooglePlacesAddressInputProps = {
  readonly id: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly placeholder?: string;
  readonly includedRegionCodes?: readonly string[];
  readonly onChange: (value: string) => void;
  readonly onAddressSelected: (address: GooglePlacesAddressSelection) => void;
};

function NativeAddressInput({
  id,
  value,
  disabled,
  className,
  placeholder,
  onChange,
}: Omit<
  GooglePlacesAddressInputProps,
  'includedRegionCodes' | 'onAddressSelected'
>): ReactElement {
  return (
    <input
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function GooglePlacesAddressInputReady({
  id,
  value,
  disabled = false,
  className,
  placeholder,
  includedRegionCodes,
  onChange,
  onAddressSelected,
}: GooglePlacesAddressInputProps): ReactElement {
  const places = useMapsLibrary('places');
  const listId = `${useId()}-google-places`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);
  const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const regionCodesKey = includedRegionCodes?.join(',') ?? '';
  const query = value.trim();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!places || !open || query.length < 3 || disabled || selecting) {
      setPredictions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      if (sessionTokenRef.current == null) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
      setLoading(true);
      setStatusMessage(null);
      void places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken: sessionTokenRef.current,
        ...(regionCodesKey
          ? { includedRegionCodes: regionCodesKey.split(',').filter(Boolean) }
          : {}),
      })
        .then(({ suggestions }) => {
          if (requestId !== requestIdRef.current) return;
          const next = suggestions
            .map((suggestion) => suggestion.placePrediction)
            .filter(
              (prediction): prediction is google.maps.places.PlacePrediction =>
                prediction != null
            );
          setPredictions(next);
          setActiveIndex(-1);
          setStatusMessage(
            next.length === 0
              ? 'No verified addresses found. You can continue entering the address manually.'
              : null
          );
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setPredictions([]);
          setStatusMessage(
            'Address suggestions are unavailable. You can continue entering the address manually.'
          );
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [disabled, open, places, query, regionCodesKey, selecting]);

  const selectPrediction = useCallback(
    async (prediction: google.maps.places.PlacePrediction) => {
      setSelecting(true);
      setOpen(false);
      setStatusMessage(null);
      try {
        const requestedPlace = prediction.toPlace();
        const { place } = await requestedPlace.fetchFields({
          fields: ['addressComponents', 'formattedAddress', 'location'],
        });
        const location = place.location;
        const selected =
          location == null
            ? null
            : parseGooglePlacesAddress({
                components: place.addressComponents ?? [],
                formattedAddress: place.formattedAddress ?? prediction.text.text,
                latitude: location.lat(),
                longitude: location.lng(),
                placeId: prediction.placeId,
              });
        if (selected == null) {
          setStatusMessage(
            'Google could not provide complete address details. You can enter the address manually.'
          );
          return;
        }
        onAddressSelected(selected);
        sessionTokenRef.current = null;
        setPredictions([]);
      } catch {
        setStatusMessage(
          'Google could not load this address. You can continue entering the address manually.'
        );
      } finally {
        setSelecting(false);
      }
    },
    [onAddressSelected]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setOpen(true);
    setStatusMessage(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && predictions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % predictions.length);
      return;
    }
    if (event.key === 'ArrowUp' && predictions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? predictions.length - 1 : current - 1
      );
      return;
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      const prediction = predictions[activeIndex];
      if (prediction) void selectPrediction(prediction);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showDropdown =
    open && query.length >= 3 && (loading || predictions.length > 0 || statusMessage != null);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <input
        id={id}
        className={className}
        value={value}
        disabled={disabled || selecting}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listId : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        onFocus={() => setOpen(true)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {showDropdown ? (
        <div id={listId} className={styles.dropdown} role="listbox">
          {loading ? <p className={styles.status}>Finding verified addresses…</p> : null}
          {!loading
            ? predictions.map((prediction, index) => (
                <button
                  key={prediction.placeId}
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`${styles.suggestion}${activeIndex === index ? ` ${styles.suggestionActive}` : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void selectPrediction(prediction)}
                >
                  <span className={styles.suggestionMain}>
                    {prediction.mainText?.text ?? prediction.text.text}
                  </span>
                  {prediction.secondaryText?.text ? (
                    <span className={styles.suggestionSecondary}>
                      {prediction.secondaryText.text}
                    </span>
                  ) : null}
                </button>
              ))
            : null}
          {!loading && predictions.length === 0 && statusMessage ? (
            <p className={styles.status}>{statusMessage}</p>
          ) : null}
          <div className={styles.googleAttribution} aria-label="Powered by Google" />
        </div>
      ) : null}
    </div>
  );
}

export function GooglePlacesAddressInput(
  props: GooglePlacesAddressInputProps
): ReactElement {
  if (!env.googleMapsApiKey) {
    return (
      <NativeAddressInput
        id={props.id}
        value={props.value}
        disabled={props.disabled}
        className={props.className}
        placeholder={props.placeholder}
        onChange={props.onChange}
      />
    );
  }
  return <GooglePlacesAddressInputReady {...props} />;
}

export type { GooglePlacesAddressSelection } from './googlePlaceAddress';
