import React from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Button, 
  VStack, 
  useColorModeValue,
  Image,
  Link
} from '@chakra-ui/react';
import { FaHome, FaArrowLeft } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';

const NotFound = () => {
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const pageBgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const secondaryTextColor = useColorModeValue('gray.500', 'gray.500');
  
  return (
    <Box minH="100vh" display="flex" alignItems="center" bg={pageBgColor}>
      <Container maxW="container.md" py={16}>
        <VStack spacing={8} textAlign="center">
          <Box textAlign="center" maxW="md" mx="auto">
            <Image
              src="https://cdn.dribbble.com/users/1175431/screenshots/6188233/media/ad42057889c385dd8f84b8330c092fa3.gif"
              alt="404 Not Found"
              borderRadius="lg"
              mb={8}
              mx="auto"
              maxH="300px"
              objectFit="cover"
            />
            
            <Heading as="h1" size="2xl" mb={4} fontWeight="extrabold">
              404 - Page Not Found
            </Heading>
            
            <Text fontSize="xl" color={textColor} mb={8}>
              Oops! The page you're looking for doesn't exist or has been moved.
            </Text>
            
            <VStack spacing={4}>
              <Button
                as={RouterLink}
                to="/"
                leftIcon={<FaHome />}
                colorScheme="brand"
                size="lg"
                px={8}
              >
                Go to Homepage
              </Button>
              
              <Button
                leftIcon={<FaArrowLeft />}
                variant="outline"
                colorScheme="brand"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </VStack>
            
            <Text mt={8} color={secondaryTextColor} fontSize="sm">
              Need help? Contact our support team at{' '}
              <Link href="mailto:support@agroyield.finance" color="brand.500">
                support@agroyield.finance
              </Link>
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default NotFound;
