// frontend/src/components/CORSSafeImage.js - FIXED VERSION - Prevent Loading Loops
import React, { useState, useEffect, useRef } from 'react';
import { Image, Skeleton, Box } from '@chakra-ui/react';
import { 
  getImageUrlSync, 
  getCORSSafeImageUrl, 
  FALLBACK_IMAGES, 
  DEFAULT_FALLBACK,
  isValidIPFSHash 
} from '../utils/imageUtils';

const CORSSafeImage = ({ 
  ipfsHash, 
  category = 'Rice Cultivation',
  alt = 'Project Image',
  fallbackSrc,
  onLoad,
  onError,
  loading: externalLoading = false,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to prevent loops
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const lastHashRef = useRef(null);

  const MAX_RETRIES = 2;

  // Get the final fallback URL
  const getFallbackUrl = () => {
    return fallbackSrc || FALLBACK_IMAGES[category] || DEFAULT_FALLBACK;
  };

  // FIXED: Stable load function with loop prevention
  useEffect(() => {
    let isMounted = true;
    
    // Prevent loading if already loading or hash hasn't changed
    if (loadingRef.current || lastHashRef.current === ipfsHash) {
      return;
    }

    const loadImage = async () => {
      if (!isMounted || loadingRef.current) return;
      
      loadingRef.current = true;
      setIsLoading(true);
      setHasError(false);

      try {
        // Check if we have a valid IPFS hash
        if (!isValidIPFSHash(ipfsHash)) {
          // Use fallback for invalid/empty hashes
          if (isMounted) {
            const fallbackUrl = getFallbackUrl();
            setImageSrc(fallbackUrl);
            setIsLoading(false);
            lastHashRef.current = ipfsHash;
          }
          return;
        }

        // Start with synchronous URL for immediate display
        const syncUrl = getImageUrlSync(ipfsHash, category);
        if (isMounted) {
          setImageSrc(syncUrl);
        }

        // Then try to get the best CORS-safe URL (only if hash changed)
        if (lastHashRef.current !== ipfsHash) {
          try {
            const corsUrl = await getCORSSafeImageUrl(ipfsHash, category);
            
            if (isMounted && corsUrl !== syncUrl) {
              setImageSrc(corsUrl);
            }
          } catch (corsError) {
            console.warn('CORS URL fetch failed, using sync URL:', corsError);
            // Keep the sync URL, don't change anything
          }
        }

        lastHashRef.current = ipfsHash;
        
      } catch (error) {
        console.warn('Error loading image:', error);
        if (isMounted) {
          const fallbackUrl = getFallbackUrl();
          setImageSrc(fallbackUrl);
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        loadingRef.current = false;
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [ipfsHash, category]); // Only depend on ipfsHash and category

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadingRef.current = false;
    };
  }, []);

  const handleImageLoad = (event) => {
    if (!mountedRef.current) return;
    
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(event);
  };

  const handleImageError = (event) => {
    if (!mountedRef.current) return;
    
    console.warn('Image failed to load:', imageSrc);
    
    // Try fallback if not already using it
    const fallbackUrl = getFallbackUrl();
    if (imageSrc !== fallbackUrl && retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setImageSrc(fallbackUrl);
      return;
    }

    // Final error state
    setIsLoading(false);
    setHasError(true);
    if (onError) onError(event);
  };

  // Show skeleton while loading or if external loading
  if ((isLoading && !imageSrc) || externalLoading) {
    return (
      <Skeleton 
        {...props} 
        isLoaded={false}
        startColor="gray.200"
        endColor="gray.300"
      />
    );
  }

  // Don't render if no image source
  if (!imageSrc) {
    return (
      <Box 
        {...props}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.100"
        color="gray.500"
        fontSize="sm"
      >
        No image available
      </Box>
    );
  }

  return (
    <Box position="relative" {...props}>
      <Image
        src={imageSrc}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        loading="lazy"
        {...props}
      />
      
      {hasError && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          textAlign="center"
          color="gray.500"
          fontSize="sm"
          pointerEvents="none"
          bg="whiteAlpha.800"
          p={2}
          borderRadius="md"
        >
          Image unavailable
        </Box>
      )}
    </Box>
  );
};

// FIXED: Use React.memo with proper comparison
export default React.memo(CORSSafeImage, (prevProps, nextProps) => {
  // Only re-render if ipfsHash, category, or key props change
  return (
    prevProps.ipfsHash === nextProps.ipfsHash &&
    prevProps.category === nextProps.category &&
    prevProps.alt === nextProps.alt &&
    prevProps.loading === nextProps.loading
  );
});