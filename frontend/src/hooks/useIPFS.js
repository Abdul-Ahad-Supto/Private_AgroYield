import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { 
  uploadProjectImage, 
  uploadProjectDocuments, 
  uploadProfileData,
  isIPFSReady,
  validateFile 
} from '../utils/ipfs';

export const useIPFS = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const toast = useToast();

  const uploadImage = useCallback(async (file) => {
    if (!isIPFSReady()) {
      toast({
        title: 'IPFS Configuration Error',
        description: 'Web3.Storage token not configured. Please check your environment variables.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw new Error('IPFS not configured');
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      
      // Validate file
      validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      setUploadProgress(30);
      
      const result = await uploadProjectImage(file);
      
      setUploadProgress(100);
      
      toast({
        title: 'Image Uploaded Successfully',
        description: `Image stored on IPFS: ${result.fileName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      return result;
      
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const uploadDocuments = useCallback(async (files) => {
    if (!isIPFSReady()) {
      throw new Error('IPFS not configured');
    }

    try {
      setUploading(true);
      setUploadProgress(20);
      
      const result = await uploadProjectDocuments(files);
      
      setUploadProgress(100);
      
      if (result.fileCount > 0) {
        toast({
          title: 'Documents Uploaded',
          description: `${result.fileCount} documents uploaded to IPFS`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: 'Document Upload Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  const uploadProfile = useCallback(async (profileData) => {
    try {
      setUploading(true);
      
      const result = await uploadProfileData(profileData);
      
      toast({
        title: 'Profile Data Uploaded',
        description: 'Profile stored on IPFS',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      return result;
      
    } catch (error) {
      console.error('Profile upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  }, [toast]);

  return {
    uploading,
    uploadProgress,
    uploadImage,
    uploadDocuments,
    uploadProfile,
    isReady: isIPFSReady()
  };
};
