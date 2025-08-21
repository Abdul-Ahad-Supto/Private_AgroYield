// frontend/src/utils/debugCORS.js - Debug and fix CORS issues

// First, let's create a simple debug function to test what's working
export const debugImageLoading = () => {
  console.log("🔍 Starting CORS Debug Test...");
  
  const testUrls = [
    // Test different image sources
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f06?w=400',
    'https://ipfs.io/ipfs/QmTestHash', // This will fail - testing
    'https://gateway.ipfs.io/ipfs/QmTestHash', // This will fail - testing
    'https://cloudflare-ipfs.com/ipfs/QmTestHash' // This will fail - testing
  ];
  
  testUrls.forEach((url, index) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log(`✅ Image ${index + 1} loaded successfully: ${url}`);
    };
    
    img.onerror = (error) => {
      console.error(`❌ Image ${index + 1} failed to load: ${url}`, error);
    };
    
    img.src = url;
  });
};

// Call this in your browser console to test
if (typeof window !== 'undefined') {
  window.debugImageLoading = debugImageLoading;
}