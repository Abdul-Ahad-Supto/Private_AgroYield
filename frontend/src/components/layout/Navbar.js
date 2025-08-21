// frontend/src/components/layout/Navbar.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Button, 
  Text, 
  Link, 
  useColorModeValue,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  useDisclosure,
  useColorMode,
  Stack,
  HStack,
  Badge
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon, HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { FaEthereum, FaSeedling, FaMoneyBillWave } from 'react-icons/fa';
import { useWeb3 } from '../../contexts/Web3Context'; // Only Web3Context needed!

const NavLink = ({ children, to }) => (
  <Link
    as={RouterLink}
    px={2}
    py={1}
    rounded={'md'}
    _hover={{
      textDecoration: 'none',
      bg: useColorModeValue('gray.200', 'gray.700'),
    }}
    to={to}
  >
    {children}
  </Link>
);

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Only use Web3Context - no AuthContext needed!
  const { 
    account, 
    isConnected, 
    isRegistered,
    userProfile,
    connectWallet,
    disconnectWallet 
  } = useWeb3();
  
  const navigate = useNavigate();

  const getNavigationLinks = () => {
    if (!isConnected) {
      return [
        { name: 'Home', path: '/' },
        { name: 'Projects', path: '/projects' }
      ];
    }

    const baseLinks = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Projects', path: '/projects' },
      { name: 'Governance', path: '/governance' }
    ];

    // Add project creation for registered users
    if (isRegistered) {
      baseLinks.push({ name: 'Create Project', path: '/create-project' });
    }
    
    return baseLinks;
  };

  const Links = getNavigationLinks();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  const getRoleBadge = () => {
    if (!isRegistered || !userProfile) return null;
    
    const role = userProfile.role || 'investor';
    const colorScheme = role === 'farmer' ? 'green' : 'blue';
    
    return (
      <Badge colorScheme={colorScheme} size="sm" ml={2}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <Box bg={useColorModeValue('gray.100', 'gray.900')} px={4}>
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <IconButton
          size={'md'}
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
          aria-label={'Open Menu'}
          display={{ md: 'none' }}
          onClick={isOpen ? onClose : onOpen}
        />
        
        <HStack spacing={8} alignItems={'center'}>
          <Box display="flex" alignItems="center">
            <FaEthereum size={24} />
            <Text fontSize="xl" fontWeight="bold" ml={2}>
              AgroYield
            </Text>
          </Box>
          <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
            {Links.map((link) => (
              <NavLink key={link.name} to={link.path}>
                {link.name}
              </NavLink>
            ))}
          </HStack>
        </HStack>

        <Flex alignItems={'center'}>
          <Stack direction={'row'} spacing={4} align="center">
            <Button onClick={toggleColorMode}>
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
            
            {isConnected ? (
              <Menu>
                <MenuButton
                  as={Button}
                  rounded={'full'}
                  variant={'link'}
                  cursor={'pointer'}
                  minW={0}
                >
                  <HStack spacing={2}>
                    <Avatar
                      size={'sm'}
                      name={userProfile?.name || formatAddress(account)}
                    />
                    <Box display={{ base: 'none', md: 'flex' }} flexDirection="column" alignItems="flex-start">
                      <HStack spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {userProfile?.name || formatAddress(account)}
                        </Text>
                        {getRoleBadge()}
                      </HStack>
                      <Text fontSize="xs" color="gray.500" fontFamily="mono">
                        {formatAddress(account)}
                      </Text>
                    </Box>
                  </HStack>
                </MenuButton>
                <MenuList zIndex={9999}>
                  <MenuItem onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={() => navigate('/profile')}>
                    Profile
                  </MenuItem>
                  
                  {/* Show different options based on role */}
                  {isRegistered && userProfile?.role === 'farmer' && (
                    <MenuItem onClick={() => navigate('/create-project')}>
                      Create Project
                    </MenuItem>
                  )}
                  
                  {isRegistered && userProfile?.role === 'investor' && (
                    <MenuItem onClick={() => navigate('/projects')}>
                      Browse Projects
                    </MenuItem>
                  )}
                  
                  <MenuDivider />
                  
                  <MenuItem onClick={handleDisconnect} color="red.500">
                    Disconnect Wallet
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                onClick={connectWallet}
                colorScheme="teal"
                size="sm"
                leftIcon={<FaEthereum />}
              >
                Connect Wallet
              </Button>
            )}
          </Stack>
        </Flex>
      </Flex>

      {isOpen ? (
        <Box pb={4} display={{ md: 'none' }}>
          <Stack as={'nav'} spacing={4}>
            {Links.map((link) => (
              <NavLink key={link.name} to={link.path} onClick={onClose}>
                {link.name}
              </NavLink>
            ))}
            
            {!isConnected && (
              <Button
                onClick={() => {
                  connectWallet();
                  onClose();
                }}
                colorScheme="teal"
                size="sm"
              >
                Connect Wallet
              </Button>
            )}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
};

export default Navbar;