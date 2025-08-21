// frontend/src/pages/CreateProject.js
import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  FormControl, 
  FormLabel, 
  FormErrorMessage,
  FormHelperText,
  Input, 
  Textarea, 
  Select, 
  Button, 
  VStack, 
  HStack, 
  SimpleGrid, 
  NumberInput, 
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Image,
  Progress,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  IconButton,
  CloseButton
} from '@chakra-ui/react';
import { FaUpload, FaImage, FaFileAlt, FaTrash, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../hooks/useContracts';
import { useIPFS } from '../hooks/useIPFS';
import { useWeb3 } from '../contexts/Web3Context';
import { getIPFSUrl } from '../utils/ipfs';

const CreateProject = () => {
  const navigate = useNavigate();
  const { isConnected, isRegistered } = useWeb3();
  const { createProject, loading } = useContracts();
  const { uploadImage, uploadDocuments, uploading, uploadProgress } = useIPFS();
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    targetAmount: '',
    duration: '90',
    projectImage: null,
    documents: [],
    imageIPFSHash: '',
    documentsIPFSHash: ''
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  
  // File preview states
  const [imagePreview, setImagePreview] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Input change handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Image upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setFormData(prev => ({ ...prev, projectImage: file }));

      // Upload to IPFS immediately for better UX
      const result = await uploadImage(file);
      setFormData(prev => ({ ...prev, imageIPFSHash: result.cid }));

      toast({
        title: 'Image Uploaded',
        description: 'Project image uploaded to IPFS successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Image upload error:', error);
      // Error handling is done in useIPFS hook
      
      // Clear preview on error
      setImagePreview('');
      setFormData(prev => ({ 
        ...prev, 
        projectImage: null, 
        imageIPFSHash: '' 
      }));
    }
  };

  // Documents upload handler
  const handleDocumentsUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // Add files to state for preview
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setFormData(prev => ({ 
        ...prev, 
        documents: [...prev.documents, ...Array.from(files)]
      }));

      // Upload to IPFS
      if (files.length > 0) {
        const result = await uploadDocuments(files);
        setFormData(prev => ({ ...prev, documentsIPFSHash: result.cid }));
      }

    } catch (error) {
      console.error('Documents upload error:', error);
      // Error handling is done in useIPFS hook
    }
  };

  // Remove uploaded file
  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Remove image
  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    setFormData(prev => ({ 
      ...prev, 
      projectImage: null, 
      imageIPFSHash: '' 
    }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Please enter a valid target amount';
    } else if (parseFloat(formData.targetAmount) < 10) {
      newErrors.targetAmount = 'Minimum target amount is 10 USDC';
    } else if (parseFloat(formData.targetAmount) > 100000) {
      newErrors.targetAmount = 'Maximum target amount is 100,000 USDC';
    }

    if (!formData.duration || parseInt(formData.duration) < 30) {
      newErrors.duration = 'Minimum duration is 30 days';
    } else if (parseInt(formData.duration) > 365) {
      newErrors.duration = 'Maximum duration is 365 days';
    }

    if (!formData.imageIPFSHash) {
      newErrors.projectImage = 'Project image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to create a project.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!isRegistered) {
      toast({
        title: 'Registration Required',
        description: 'Please register your account first.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: 'Validation Failed',
        description: 'Please fix the errors and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        imageIPFSHash: formData.imageIPFSHash,
        documentsIPFSHash: formData.documentsIPFSHash || '',
        targetAmountUSDC: parseFloat(formData.targetAmount),
        durationDays: parseInt(formData.duration),
        location: formData.location.trim(),
        category: formData.category
      };

      const result = await createProject(projectData);
      
      // Navigate to project detail page
      if (result.projectId) {
        navigate(`/projects/${result.projectId}`);
      } else {
        navigate('/projects');
      }

    } catch (error) {
      console.error('Project creation failed:', error);
      // Error handling is done in useContracts hook
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Button 
            leftIcon={<FaArrowLeft />} 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/projects')}
            mb={4}
          >
            Back to Projects
          </Button>
          
          <Heading as="h1" size="xl" mb={2}>
            Create New Project
          </Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')}>
            Share your farming project with the community and raise funding
          </Text>
        </Box>

        {/* Registration Check */}
        {!isRegistered && (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Registration Required</AlertTitle>
              <AlertDescription>
                You need to register your account before creating projects.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Main Form */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody p={8}>
            <form onSubmit={handleSubmit}>
              <VStack spacing={8} align="stretch">
                
                {/* Basic Information */}
                <Box>
                  <Heading size="md" mb={4}>Basic Information</Heading>
                  
                  <VStack spacing={6} align="stretch">
                    <FormControl isRequired isInvalid={!!errors.title}>
                      <FormLabel>Project Title</FormLabel>
                      <Input
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="e.g., Organic Rice Farming with Smart Irrigation"
                        maxLength={100}
                      />
                      <FormErrorMessage>{errors.title}</FormErrorMessage>
                      <FormHelperText>
                        {formData.title.length}/100 characters
                      </FormHelperText>
                    </FormControl>

                    <FormControl isRequired isInvalid={!!errors.description}>
                      <FormLabel>Project Description</FormLabel>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe your project in detail. Include your farming methods, goals, expected outcomes, and why investors should support you..."
                        rows={8}
                        maxLength={2000}
                      />
                      <FormErrorMessage>{errors.description}</FormErrorMessage>
                      <FormHelperText>
                        {formData.description.length}/2000 characters. Be detailed and specific.
                      </FormHelperText>
                    </FormControl>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <FormControl isRequired isInvalid={!!errors.category}>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          placeholder="Select category"
                        >
                          <option value="Rice Cultivation">Rice Cultivation</option>
                          <option value="Fruit Cultivation">Fruit Cultivation</option>
                          <option value="Vegetable Cultivation">Vegetable Cultivation</option>
                          <option value="Livestock">Livestock</option>
                          <option value="Fisheries">Fisheries</option>
                          <option value="Agroforestry">Agroforestry</option>
                          <option value="Poultry">Poultry</option>
                          <option value="Dairy Farming">Dairy Farming</option>
                        </Select>
                        <FormErrorMessage>{errors.category}</FormErrorMessage>
                      </FormControl>

                      <FormControl isRequired isInvalid={!!errors.location}>
                        <FormLabel>Location</FormLabel>
                        <Input
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="e.g., Rangpur Division, Bangladesh"
                        />
                        <FormErrorMessage>{errors.location}</FormErrorMessage>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </Box>

                <Divider />

                {/* Funding Details */}
                <Box>
                  <Heading size="md" mb={4}>Funding Details</Heading>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <FormControl isRequired isInvalid={!!errors.targetAmount}>
                      <FormLabel>Target Amount (USDC)</FormLabel>
                      <NumberInput min={10} max={100000} precision={2}>
                        <NumberInputField
                          value={formData.targetAmount}
                          onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                          placeholder="e.g., 1000"
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormErrorMessage>{errors.targetAmount}</FormErrorMessage>
                      <FormHelperText>
                        Minimum: 10 USDC, Maximum: 100,000 USDC
                      </FormHelperText>
                    </FormControl>

                    <FormControl isRequired isInvalid={!!errors.duration}>
                      <FormLabel>Project Duration (Days)</FormLabel>
                      <Select
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="120">120 days</option>
                        <option value="180">180 days</option>
                        <option value="365">365 days</option>
                      </Select>
                      <FormErrorMessage>{errors.duration}</FormErrorMessage>
                      <FormHelperText>
                        How long will your project take to complete?
                      </FormHelperText>
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Media Upload */}
                <Box>
                  <Heading size="md" mb={4}>Project Media</Heading>
                  
                  <VStack spacing={6} align="stretch">
                    {/* Project Image */}
                    <FormControl isRequired isInvalid={!!errors.projectImage}>
                      <FormLabel>Project Image</FormLabel>
                      
                      {!imagePreview ? (
                        <Box
                          borderWidth={2}
                          borderStyle="dashed"
                          borderColor={borderColor}
                          borderRadius="lg"
                          p={8}
                          textAlign="center"
                          cursor="pointer"
                          _hover={{ borderColor: 'blue.400' }}
                          onClick={() => document.getElementById('image-upload').click()}
                        >
                          <VStack spacing={3}>
                            <FaImage size={32} color="gray" />
                            <Text>Click to upload project image</Text>
                            <Text fontSize="sm" color="gray.500">
                              PNG, JPG, WebP up to 10MB
                            </Text>
                          </VStack>
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            display="none"
                          />
                        </Box>
                      ) : (
                        <Box position="relative" borderRadius="lg" overflow="hidden">
                          <Image
                            src={imagePreview}
                            alt="Project preview"
                            maxH="300px"
                            w="100%"
                            objectFit="cover"
                          />
                          <IconButton
                            icon={<FaTrash />}
                            position="absolute"
                            top={2}
                            right={2}
                            colorScheme="red"
                            size="sm"
                            onClick={removeImage}
                            aria-label="Remove image"
                          />
                          {formData.imageIPFSHash && (
                            <Badge
                              position="absolute"
                              bottom={2}
                              left={2}
                              colorScheme="green"
                            >
                              Uploaded to IPFS
                            </Badge>
                          )}
                        </Box>
                      )}
                      
                      <FormErrorMessage>{errors.projectImage}</FormErrorMessage>
                      
                      {uploading && (
                        <Box mt={2}>
                          <Text fontSize="sm" mb={1}>Uploading to IPFS...</Text>
                          <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                        </Box>
                      )}
                    </FormControl>

                    {/* Documents Upload */}
                    <FormControl>
                      <FormLabel>Additional Documents (Optional)</FormLabel>
                      <Box
                        borderWidth={2}
                        borderStyle="dashed"
                        borderColor={borderColor}
                        borderRadius="lg"
                        p={6}
                        textAlign="center"
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.400' }}
                        onClick={() => document.getElementById('docs-upload').click()}
                      >
                        <VStack spacing={2}>
                          <FaFileAlt size={24} color="gray" />
                          <Text>Upload supporting documents</Text>
                          <Text fontSize="sm" color="gray.500">
                            PDF, DOC, TXT up to 5MB each
                          </Text>
                        </VStack>
                        <Input
                          id="docs-upload"
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleDocumentsUpload}
                          display="none"
                        />
                      </Box>
                      
                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <VStack align="stretch" mt={4} spacing={2}>
                          <Text fontWeight="medium">Uploaded Documents:</Text>
                          {uploadedFiles.map((file, index) => (
                            <Flex
                              key={index}
                              align="center"
                              justify="space-between"
                              p={3}
                              bg="gray.50"
                              borderRadius="md"
                            >
                              <HStack>
                                <FaFileAlt />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="medium">
                                    {file.name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatFileSize(file.size)}
                                  </Text>
                                </VStack>
                              </HStack>
                              <IconButton
                                icon={<FaTrash />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => removeFile(index)}
                                aria-label="Remove file"
                              />
                            </Flex>
                          ))}
                        </VStack>
                      )}
                      
                      <FormHelperText>
                        Business plans, land certificates, or other relevant documents
                      </FormHelperText>
                    </FormControl>
                  </VStack>
                </Box>

                <Divider />

                {/* Submit Button */}
                <Box>
                  <Alert status="info" borderRadius="lg" mb={6}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">Ready to Submit?</AlertTitle>
                      <AlertDescription fontSize="sm">
                        Your project will be immediately published and available for investments. 
                        Make sure all information is accurate.
                      </AlertDescription>
                    </Box>
                  </Alert>

                  <Flex justify="space-between" align="center">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/projects')}
                      isDisabled={loading || uploading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      type="submit"
                      colorScheme="green"
                      size="lg"
                      leftIcon={<FaUpload />}
                      isLoading={loading || uploading}
                      loadingText={uploading ? 'Uploading...' : 'Creating...'}
                      isDisabled={!isConnected || !isRegistered}
                    >
                      Create Project
                    </Button>
                  </Flex>
                </Box>

              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default CreateProject;