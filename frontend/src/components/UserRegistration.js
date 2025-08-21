// frontend/src/components/UserRegistration.js
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Box,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Badge,
  Checkbox,
  Link
} from '@chakra-ui/react';
import { FaUser, FaSeedling, FaMoneyBillWave } from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import { useIPFS } from '../hooks/useIPFS';

const UserRegistration = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '', // 'farmer' or 'investor'
    bio: '',
    location: '',
    experience: '',
    profilePicture: null
  });
  
  const [errors, setErrors] = useState({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Profile Details, 3: Confirmation
  
  const { registerUser, loading } = useContracts();
  const { uploadProfile, uploading } = useIPFS();
  const toast = useToast();

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (formData.role === 'farmer' && !formData.experience.trim()) {
      newErrors.experience = 'Experience description is required for farmers';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: 'File Too Large',
          description: 'Profile picture must be less than 2MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, profilePicture: file }));
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!acceptTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the terms and conditions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      let profileIPFSHash = '';

      // IMPORTANT: Always upload profile data that includes the role
      const profileData = {
        name: formData.name,
        role: formData.role, // ← This is crucial!
        bio: formData.bio,
        location: formData.location,
        experience: formData.experience,
        registrationDate: new Date().toISOString(),
        userType: formData.role, // Additional field for clarity
        profileVersion: '1.0'
      };

      console.log('🔍 Uploading profile with role:', profileData.role);

      // Upload profile data to IPFS (this includes the role information)
      const uploadResult = await uploadProfile(profileData);
      profileIPFSHash = uploadResult.cid;

      console.log('✅ Profile uploaded to IPFS:', profileIPFSHash);

      // Register user on blockchain with IPFS hash containing role data
      await registerUser(formData.name, profileIPFSHash);

      // Success
      toast({
        title: 'Registration Successful!',
        description: `Welcome to AgroYield, ${formData.name}! Role: ${formData.role}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form and close modal
      setFormData({
        name: '',
        role: '',
        bio: '',
        location: '',
        experience: '',
        profilePicture: null
      });
      setStep(1);
      setAcceptTerms(false);
      
      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Registration error:', error);
      // Error handling is done in the useContracts hook
    }
  };

  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Welcome to AgroYield
        </Text>
        <Text color="gray.600">
          Let's get your profile set up to start your journey
        </Text>
      </Box>

      <FormControl isRequired isInvalid={!!errors.name}>
        <FormLabel>Full Name</FormLabel>
        <Input
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your full name"
          maxLength={50}
        />
        <FormErrorMessage>{errors.name}</FormErrorMessage>
        <FormHelperText>This will be displayed on your profile</FormHelperText>
      </FormControl>

      <FormControl isRequired isInvalid={!!errors.role}>
        <FormLabel>I am a:</FormLabel>
        <VStack spacing={3}>
          <Box
            p={4}
            border="2px"
            borderColor={formData.role === 'farmer' ? 'green.500' : 'gray.200'}
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleInputChange('role', 'farmer')}
            _hover={{ borderColor: 'green.300' }}
            w="100%"
          >
            <HStack>
              <FaSeedling color={formData.role === 'farmer' ? '#38A169' : '#A0AEC0'} />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontWeight="bold">Farmer</Text>
                <Text fontSize="sm" color="gray.600">
                  Create projects and raise funding for your farming initiatives
                </Text>
              </VStack>
              {formData.role === 'farmer' && (
                <Badge colorScheme="green">Selected</Badge>
              )}
            </HStack>
          </Box>

          <Box
            p={4}
            border="2px"
            borderColor={formData.role === 'investor' ? 'blue.500' : 'gray.200'}
            borderRadius="md"
            cursor="pointer"
            onClick={() => handleInputChange('role', 'investor')}
            _hover={{ borderColor: 'blue.300' }}
            w="100%"
          >
            <HStack>
              <FaMoneyBillWave color={formData.role === 'investor' ? '#3182CE' : '#A0AEC0'} />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontWeight="bold">Investor</Text>
                <Text fontSize="sm" color="gray.600">
                  Invest in farming projects and earn returns
                </Text>
              </VStack>
              {formData.role === 'investor' && (
                <Badge colorScheme="blue">Selected</Badge>
              )}
            </HStack>
          </Box>
        </VStack>
        <FormErrorMessage>{errors.role}</FormErrorMessage>
      </FormControl>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Profile Details
        </Text>
        <Text color="gray.600">
          Tell us more about yourself
        </Text>
      </Box>

      <FormControl isRequired isInvalid={!!errors.location}>
        <FormLabel>Location</FormLabel>
        <Input
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          placeholder="e.g., Dhaka, Bangladesh"
        />
        <FormErrorMessage>{errors.location}</FormErrorMessage>
      </FormControl>

      <FormControl>
        <FormLabel>Bio</FormLabel>
        <Textarea
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          placeholder="Tell us about yourself..."
          rows={3}
          maxLength={500}
        />
        <FormHelperText>
          {formData.bio.length}/500 characters
        </FormHelperText>
      </FormControl>

      {formData.role === 'farmer' && (
        <FormControl isRequired isInvalid={!!errors.experience}>
          <FormLabel>Farming Experience</FormLabel>
          <Textarea
            value={formData.experience}
            onChange={(e) => handleInputChange('experience', e.target.value)}
            placeholder="Describe your farming background and experience..."
            rows={4}
            maxLength={1000}
          />
          <FormErrorMessage>{errors.experience}</FormErrorMessage>
          <FormHelperText>
            Share your farming experience, specialties, and achievements
          </FormHelperText>
        </FormControl>
      )}

      <FormControl>
        <FormLabel>Profile Picture (Optional)</FormLabel>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          p={1}
        />
        <FormHelperText>
          Upload a profile picture (max 2MB, JPG/PNG)
        </FormHelperText>
      </FormControl>
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={6} align="stretch">
      <Box textAlign="center">
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Confirm Registration
        </Text>
        <Text color="gray.600">
          Review your information before completing registration
        </Text>
      </Box>

      <Box p={4} bg="gray.50" borderRadius="md">
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontWeight="bold">Name:</Text>
            <Text>{formData.name}</Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="bold">Role:</Text>
            <Badge colorScheme={formData.role === 'farmer' ? 'green' : 'blue'}>
              {formData.role}
            </Badge>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontWeight="bold">Location:</Text>
            <Text>{formData.location}</Text>
          </HStack>
          
          {formData.bio && (
            <Box>
              <Text fontWeight="bold" mb={1}>Bio:</Text>
              <Text fontSize="sm" color="gray.600">{formData.bio}</Text>
            </Box>
          )}
          
          {formData.experience && (
            <Box>
              <Text fontWeight="bold" mb={1}>Experience:</Text>
              <Text fontSize="sm" color="gray.600">{formData.experience}</Text>
            </Box>
          )}
        </VStack>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">Blockchain Registration</AlertTitle>
          <AlertDescription fontSize="sm">
            Your profile will be registered on the blockchain. This action cannot be undone.
          </AlertDescription>
        </Box>
      </Alert>

      <Checkbox
        isChecked={acceptTerms}
        onChange={(e) => setAcceptTerms(e.target.checked)}
      >
        <Text fontSize="sm">
          I accept the{' '}
          <Link color="blue.500" href="/terms" isExternal>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link color="blue.500" href="/privacy" isExternal>
            Privacy Policy
          </Link>
        </Text>
      </Checkbox>
    </VStack>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <FaUser />
            <Text>Register Your Account</Text>
          </HStack>
          <Text fontSize="sm" fontWeight="normal" color="gray.600" mt={1}>
            Step {step} of 3
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button
              variant="outline"
              onClick={step === 1 ? onClose : handleBack}
              isDisabled={loading || uploading}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            <HStack spacing={2}>
              {step < 3 ? (
                <Button
                  colorScheme="blue"
                  onClick={handleNext}
                  isDisabled={loading || uploading}
                >
                  Next
                </Button>
              ) : (
                <Button
                  colorScheme="green"
                  onClick={handleSubmit}
                  isLoading={loading || uploading}
                  loadingText={uploading ? 'Uploading...' : 'Registering...'}
                  isDisabled={!acceptTerms}
                >
                  Complete Registration
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UserRegistration;