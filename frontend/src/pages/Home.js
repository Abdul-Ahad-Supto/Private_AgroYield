import React from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Button, 
  Stack, 
  SimpleGrid, 
  Card, 
  CardBody, 
  CardFooter,
  Image,
  useColorModeValue
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaSeedling, FaHandHoldingUsd, FaShieldAlt, FaChartLine } from 'react-icons/fa';

const features = [
  {
    icon: FaSeedling,
    title: 'Empower Farmers',
    description: 'Access funding for your agricultural projects and grow your farming business with community support.'
  },
  {
    icon: FaHandHoldingUsd,
    title: 'Invest in Agriculture',
    description: 'Support sustainable farming initiatives and earn returns on your investments.'
  },
  {
    icon: FaShieldAlt,
    title: 'Verified Projects',
    description: 'Every project is thoroughly vetted and verified by our network of validators.'
  },
  {
    icon: FaChartLine,
    title: 'Transparent Returns',
    description: 'Track your investments and returns in real-time with blockchain transparency.'
  }
];

const Home = () => {
  // Color mode values
  const bgGradient = useColorModeValue(
    'linear(to-r, teal.500, blue.500)',
    'linear(to-r, teal.600, blue.600)'
  );
  const featureTextColor = useColorModeValue('gray.600', 'gray.400');
  const howItWorksBg = useColorModeValue('gray.50', 'gray.800');
  const stepCardBg = useColorModeValue('white', 'gray.700');
  const stepTextColor = useColorModeValue('gray.600', 'gray.300');
  const ctaBg = useColorModeValue('white', 'gray.800');
  const ctaTextColor = useColorModeValue('gray.700', 'white');

  return (
    <Box>
      {/* Hero Section */}
      <Box bg={bgGradient} color="white" py={20}>
        <Container maxW={'6xl'} py={16}>
          <Stack spacing={8} textAlign="center" align="center">
            <Heading as="h1" size="3xl" fontWeight="extrabold" color="#009C9C">
              Decentralized Agriculture Investment Platform
            </Heading>
            <Text fontSize="xl" maxW="3xl" color="#009C9C">
              Connect farmers with investors to fund sustainable agriculture projects in Bangladesh.
              Earn competitive returns while supporting local farming communities.
            </Text>
            <Stack direction={['column', 'row']} spacing={4} pt={4}>
              <Button
                as={RouterLink}
                to="/create-project"
                colorScheme="whiteAlpha"
                size="lg"
                _hover={{ bg: 'whiteAlpha.300' }}
              >
                Start a Project
              </Button>
              <Button
                as={RouterLink}
                to="/projects"
                colorScheme="white"
                variant="outline"
                size="lg"
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Browse Projects
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW={'6xl'} py={16}>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
          {features.map((feature, index) => (
            <Card key={index} variant="outline" _hover={{ shadow: 'lg', transform: 'translateY(-4px)' }} transition="all 0.2s">
              <CardBody textAlign="center">
                <Box display="flex" justifyContent="center" mb={4}>
                  <feature.icon size={32} color="#4FD1C5" />
                </Box>
                <Heading size="md" mb={2}>{feature.title}</Heading>
                <Text color={featureTextColor}>
                  {feature.description}
                </Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* How It Works */}
      <Box bg={howItWorksBg} py={16}>
        <Container maxW={'6xl'}>
          <Heading as="h2" size="xl" textAlign="center" mb={12}>
            How AgroYield Works
          </Heading>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
            {[
              {
                title: '1. Create or Discover',
                description: 'Farmers create projects, investors browse and discover opportunities.'
              },
              {
                title: '2. Fund & Verify',
                description: 'Fund projects and track verification through our oracle network.'
              },
              {
                title: '3. Grow & Earn',
                description: 'Farmers grow their projects, investors earn returns on successful yields.'
              }
            ].map((step, index) => (
              <Box key={index} textAlign="center" p={6} bg={stepCardBg} rounded="lg" shadow="md">
                <Text fontSize="2xl" fontWeight="bold" mb={2} color="teal.500">
                  {step.title}
                </Text>
                <Text color={stepTextColor}>
                  {step.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container maxW={'6xl'} py={16} textAlign="center">
        <Heading as="h2" size="xl" mb={6}>
          Ready to Get Started?
        </Heading>
        <Text fontSize="xl" mb={8} maxW="2xl" mx="auto">
          Join AgroYield today and be part of the future of sustainable agriculture investment.
        </Text>
        <Stack direction={['column', 'row']} spacing={4} justify="center">
          <Button
            as={RouterLink}
            to="../../auth"
            colorScheme="teal"
            size="lg"
          >
            Create Account
          </Button>
          <Button
            as={RouterLink}
            to="/learn-more"
            variant="outline"
            size="lg"
          >
            Learn More
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default Home;
