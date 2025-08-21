import React from 'react';
import { 
  Box, 
  Container, 
  Stack, 
  Text, 
  Link, 
  useColorModeValue,
  SimpleGrid,
  Heading
} from '@chakra-ui/react';
import { FaGithub, FaTwitter, FaDiscord, FaMedium } from 'react-icons/fa';

const Footer = () => {
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const currentYear = new Date().getFullYear();
  
  const socialLinks = [
    { icon: <FaGithub />, label: 'GitHub', href: 'https://github.com/agroyield' },
    { icon: <FaTwitter />, label: 'Twitter', href: 'https://twitter.com/agroyield' },
    { icon: <FaDiscord />, label: 'Discord', href: 'https://discord.gg/agroyield' },
    { icon: <FaMedium />, label: 'Medium', href: 'https://medium.com/agroyield' },
  ];
  
  const links = [
    {
      header: 'Platform',
      links: [
        { label: 'Explore', href: '/projects' },
        { label: 'How it Works', href: '/how-it-works' },
        { label: 'Governance', href: '/governance' },
        { label: 'Token', href: '/token' },
      ],
    },
    {
      header: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Careers', href: '/careers' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      header: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Risk Disclosure', href: '/risk' },
      ],
    },
  ];

  return (
    <Box
      bg={bgColor}
      color={useColorModeValue('gray.700', 'gray.200')}
      borderTopWidth={1}
      borderStyle={'solid'}
      borderColor={borderColor}
    >
      <Container as={Stack} maxW={'7xl'} py={10}>
        <SimpleGrid
          templateColumns={{ base: '1fr', md: '2fr 1fr 1fr 1fr' }}
          spacing={8}
        >
          <Stack spacing={6}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                AgroYield
              </Text>
            </Box>
            <Text fontSize={'sm'} maxW={'md'}>
              Decentralized agriculture investment platform connecting farmers with 
              investors to fund sustainable farming projects in Bangladesh.
            </Text>
            <Stack direction={'row'} spacing={6}>
              {socialLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  isExternal
                  _hover={{ color: 'brand.500' }}
                  fontSize="xl"
                  aria-label={link.label}
                >
                  {link.icon}
                </Link>
              ))}
            </Stack>
          </Stack>
          
          {links.map((link, index) => (
            <Stack key={index} align={'flex-start'}>
              <Heading as="h3" size="sm" mb={4}>
                {link.header}
              </Heading>
              {link.links.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  _hover={{ color: 'brand.500' }}
                >
                  {item.label}
                </Link>
              ))}
            </Stack>
          ))}
        </SimpleGrid>
        
        <Box
          borderTopWidth={1}
          borderStyle={'solid'}
          borderColor={borderColor}
          pt={8}
          mt={8}
          textAlign={{ base: 'center', md: 'left' }}
        >
          <Text>
            © {currentYear} AgroYield. All rights reserved.
          </Text>
          <Text fontSize={'sm'} mt={2}>
            Built with ❤️ for sustainable agriculture
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
