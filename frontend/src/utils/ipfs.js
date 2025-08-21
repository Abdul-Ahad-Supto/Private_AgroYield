// frontend/src/utils/ipfs.js - Pinata Implementation
import axios from 'axios';

// Pinata configuration - get free API key from https://pinata.cloud
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY || '';
const PINATA_JWT = process.env.REACT_APP_PINATA_JWT || '';

// Pinata API endpoints
const PINATA_UPLOAD_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

// IPFS Gateway URLs (in order of preference)
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

/**
 * Check if Pinata is properly configured
 * @returns {boolean} - Whether the service is ready
 */
export const isIPFSReady = () => {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    console.warn('Pinata not configured. Please set REACT_APP_PINATA_JWT or REACT_APP_PINATA_API_KEY + REACT_APP_PINATA_SECRET_KEY');
    return false;
  }
  return true;
};

/**
 * Get Pinata headers for authentication
 */
const getPinataHeaders = () => {
  if (PINATA_JWT) {
    return {
      'Authorization': `Bearer ${PINATA_JWT}`,
    };
  } else {
    return {
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET_KEY,
    };
  }
};

/**
 * Upload a single file to IPFS via Pinata
 * @param {File} file - The file to upload
 * @param {string} fileName - Optional custom filename
 * @returns {Object} - { cid, fileName, url }
 */
export const uploadFileToIPFS = async (file, fileName = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!isIPFSReady()) {
      throw new Error('Pinata not configured. Please check your environment variables.');
    }

    // Create form data
    const formData = new FormData();
    
    // Create a unique filename if not provided
    const timestamp = Date.now();
    const finalFileName = fileName || `${timestamp}-${file.name}`;
    
    // Append file with custom name
    formData.append('file', file, finalFileName);
    
    // Add metadata
    const metadata = JSON.stringify({
      name: finalFileName,
      keyvalues: {
        project: 'AgroYield',
        timestamp: timestamp.toString(),
        originalName: file.name
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
      customPinPolicy: {
        regions: [
          {
            id: 'FRA1',
            desiredReplicationCount: 2
          },
          {
            id: 'NYC1', 
            desiredReplicationCount: 2
          }
        ]
      }
    });
    formData.append('pinataOptions', options);

    console.log('Uploading file to Pinata:', finalFileName);
    
    // Upload to Pinata
    const response = await axios.post(PINATA_UPLOAD_URL, formData, {
      headers: {
        ...getPinataHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      maxContentLength: 100 * 1024 * 1024, // 100MB
      timeout: 60000 // 60 seconds
    });

    const cid = response.data.IpfsHash;
    const url = `${IPFS_GATEWAYS[0]}${cid}`;
    
    console.log('File uploaded successfully:', { cid, url });
    
    return {
      cid: cid,
      fileName: finalFileName,
      url: url,
      gateway: `${IPFS_GATEWAYS[0]}${cid}`,
      pinataResponse: response.data
    };
    
  } catch (error) {
    console.error('Pinata upload error:', error);
    
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      
      let errorMsg = 'Upload failed';
      if (error.response.status === 401) {
        errorMsg = 'Unauthorized - Check your Pinata API credentials';
      } else if (error.response.status === 429) {
        errorMsg = 'Rate limit exceeded - Please try again in a few minutes';
      } else if (error.response.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      throw new Error(`Failed to upload to IPFS: ${errorMsg}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach Pinata service');
    } else {
      throw new Error(`Upload error: ${error.message}`);
    }
  }
};

/**
 * Upload JSON data to IPFS
 * @param {Object} jsonData - JSON object to upload
 * @param {string} fileName - Optional filename
 * @returns {Object} - Upload result
 */
export const uploadJSONToIPFS = async (jsonData, fileName = null) => {
  try {
    if (!isIPFSReady()) {
      throw new Error('Pinata not configured. Please check your environment variables.');
    }

    const timestamp = Date.now();
    const finalFileName = fileName || `data-${timestamp}.json`;
    
    const requestBody = {
      pinataContent: jsonData,
      pinataMetadata: {
        name: finalFileName,
        keyvalues: {
          project: 'AgroYield',
          type: 'json',
          timestamp: timestamp.toString()
        }
      },
      pinataOptions: {
        cidVersion: 1
      }
    };

    console.log('Uploading JSON to Pinata:', finalFileName);
    
    const response = await axios.post(PINATA_JSON_URL, requestBody, {
      headers: {
        ...getPinataHeaders(),
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const cid = response.data.IpfsHash;
    const url = `${IPFS_GATEWAYS[0]}${cid}`;
    
    return {
      cid: cid,
      fileName: finalFileName,
      url: url,
      gateway: `${IPFS_GATEWAYS[0]}${cid}`,
      data: jsonData
    };
    
  } catch (error) {
    console.error('JSON upload error:', error);
    throw error;
  }
};

/**
 * Upload project image with optimized settings
 * @param {File} imageFile - Image file to upload
 * @returns {Object} - Upload result with multiple gateway URLs
 */
export const uploadProjectImage = async (imageFile) => {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Create optimized filename
    const timestamp = Date.now();
    const extension = imageFile.name.split('.').pop();
    const fileName = `project-image-${timestamp}.${extension}`;

    return await uploadFileToIPFS(imageFile, fileName);
    
  } catch (error) {
    console.error('Project image upload error:', error);
    throw error;
  }
};

/**
 * Upload project documents (PDF, DOC, etc.)
 * @param {FileList} files - Multiple document files
 * @returns {Object} - Upload result for documents
 */
export const uploadProjectDocuments = async (files) => {
  try {
    if (!files || files.length === 0) {
      return { cid: '', url: '', fileCount: 0 };
    }

    const timestamp = Date.now();
    const uploadPromises = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`File ${file.name} is too large. Maximum size is 5MB per file.`);
      }

      const extension = file.name.split('.').pop();
      const fileName = `document-${i + 1}-${timestamp}.${extension}`;
      
      uploadPromises.push(uploadFileToIPFS(file, fileName));
    }

    // Upload all documents
    const results = await Promise.all(uploadPromises);
    
    // Return the first result (for backward compatibility)
    const firstResult = results[0];
    
    return {
      cid: firstResult.cid,
      url: firstResult.url,
      fileCount: results.length,
      files: results.map(r => ({
        cid: r.cid,
        fileName: r.fileName,
        url: r.url
      }))
    };
    
  } catch (error) {
    console.error('Document upload error:', error);
    throw error;
  }
};

/**
 * Upload user profile data to IPFS
 * @param {Object} profileData - User profile information
 * @returns {Object} - Upload result for profile
 */
export const uploadProfileData = async (profileData) => {
  try {
    const timestamp = Date.now();
    const profileJSON = {
      ...profileData,
      uploadedAt: timestamp,
      version: '1.0'
    };

    return await uploadJSONToIPFS(profileJSON, `profile-${timestamp}.json`);
    
  } catch (error) {
    console.error('Profile upload error:', error);
    throw error;
  }
};

/**
 * Retrieve data from IPFS using CID
 * @param {string} cid - IPFS Content Identifier
 * @param {string} fileName - Optional filename if in directory
 * @returns {string} - URL to access the content
 */
export const getIPFSUrl = (cid, fileName = '') => {
  if (!cid) return '';
  
  const path = fileName ? `${cid}/${fileName}` : cid;
  return `${IPFS_GATEWAYS[0]}${path}`;
};

/**
 * Get multiple gateway URLs for redundancy
 * @param {string} cid - IPFS Content Identifier
 * @param {string} fileName - Optional filename
 * @returns {Array} - Array of gateway URLs
 */
export const getIPFSGateways = (cid, fileName = '') => {
  if (!cid) return [];
  
  const path = fileName ? `${cid}/${fileName}` : cid;
  return IPFS_GATEWAYS.map(gateway => `${gateway}${path}`);
};

/**
 * Fetch JSON data from IPFS
 * @param {string} cid - IPFS Content Identifier
 * @param {string} fileName - JSON filename
 * @returns {Object} - Parsed JSON data
 */
export const fetchJSONFromIPFS = async (cid, fileName = '') => {
  try {
    const url = getIPFSUrl(cid, fileName);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error fetching JSON from IPFS:', error);
    
    // Try alternative gateways
    const gateways = getIPFSGateways(cid, fileName);
    for (let i = 1; i < gateways.length; i++) {
      try {
        const response = await fetch(gateways[i]);
        if (response.ok) {
          return await response.json();
        }
      } catch (gatewayError) {
        console.warn(`Gateway ${i} failed:`, gatewayError.message);
      }
    }
    
    throw new Error('Failed to fetch from all IPFS gateways');
  }
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {boolean} - Whether file is valid
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    minSize = 1024 // 1KB minimum
  } = options;

  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size < minSize) {
    throw new Error(`File too small. Minimum size is ${minSize} bytes`);
  }

  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
};

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Export default configuration
export const ipfsConfig = {
  apiKey: PINATA_API_KEY,
  secretKey: PINATA_SECRET_KEY,
  jwt: PINATA_JWT,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedDocumentTypes: ['application/pdf', 'application/msword', 'text/plain'],
  gateways: IPFS_GATEWAYS
};