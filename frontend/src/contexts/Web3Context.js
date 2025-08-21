// frontend/src/contexts/Web3Context.js - FIXED VERSION - Stop Profile Loading Loop
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@chakra-ui/react';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  // Wallet connection state
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  
  // User registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  const toast = useToast();
  
  // FIXED: Refs to prevent infinite loops
  const profileFetchingRef = useRef(false);
  const lastCheckedAccountRef = useRef(null);
  const lastProfileHashRef = useRef(null);
  const mountedRef = useRef(true);

  // Expected network configuration
  const EXPECTED_CHAIN_ID = '0x13882'; // Polygon Amoy (80002)
  const NETWORK_CONFIG = {
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/'],
  };
  
  // FIXED: Cached IPFS fetching with proper error handling
  const ipfsCache = new Map();
  const fetchingPromises = new Map();

  const fetchUserRole = useCallback(async (profileIPFSHash) => {
    if (!profileIPFSHash || typeof profileIPFSHash !== 'string') {
      console.log('🔍 No valid IPFS hash provided for role fetch');
      return null;
    }
    
    // Check cache first
    if (ipfsCache.has(profileIPFSHash)) {
      console.log('📋 Using cached IPFS data for:', profileIPFSHash.substring(0, 10));
      return ipfsCache.get(profileIPFSHash);
    }
    
    // Check if already fetching
    if (fetchingPromises.has(profileIPFSHash)) {
      console.log('⏳ Waiting for existing IPFS fetch:', profileIPFSHash.substring(0, 10));
      return await fetchingPromises.get(profileIPFSHash);
    }
    
    console.log('🔍 Fetching role from IPFS:', profileIPFSHash.substring(0, 10));
    
    // Create fetch promise
    const fetchPromise = (async () => {
      try {
        const gateways = [
          'https://gateway.pinata.cloud/ipfs/',
          'https://ipfs.io/ipfs/',
          'https://cloudflare-ipfs.com/ipfs/',
          'https://dweb.link/ipfs/'
        ];
        
        for (const gateway of gateways) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${gateway}${profileIPFSHash}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const profileData = await response.json();
              console.log('✅ Profile data fetched from IPFS');
              
              const result = {
                role: profileData.role || profileData.userType || 'investor',
                bio: profileData.bio || '',
                location: profileData.location || '',
                experience: profileData.experience || '',
                registrationDate: profileData.registrationDate,
                name: profileData.name || ''
              };
              
              // Cache the result
              ipfsCache.set(profileIPFSHash, result);
              
              return result;
            }
          } catch (gatewayError) {
            if (gatewayError.name !== 'AbortError') {
              console.warn(`Gateway ${gateway} failed:`, gatewayError.message);
            }
            continue;
          }
        }
        
        console.warn('⚠️ Could not fetch profile from any gateway');
        return null;
        
      } catch (error) {
        console.error('❌ Error fetching user role:', error);
        return null;
      } finally {
        // Remove from fetching promises
        fetchingPromises.delete(profileIPFSHash);
      }
    })();
    
    // Store the promise
    fetchingPromises.set(profileIPFSHash, fetchPromise);
    
    return await fetchPromise;
  }, []);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this application');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please make sure MetaMask is unlocked.');
      }

      // Get current chain
      const currentChainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      // Switch to Amoy network if needed
      if (currentChainId !== EXPECTED_CHAIN_ID) {
        await switchToAmoyNetwork();
      }

      // Create provider and signer
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      // Update state
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(network.chainId.toString());
      setIsConnected(true);

      toast({
        title: 'Wallet Connected',
        description: `Connected to ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      return accounts[0];

    } catch (error) {
      console.error('Wallet connection error:', error);
      
      let errorMessage = 'Failed to connect wallet';
      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.message.includes('MetaMask')) {
        errorMessage = error.message;
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Please check MetaMask.';
      }

      toast({
        title: 'Connection Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, toast]);

  // Switch to Amoy network
  const switchToAmoyNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: EXPECTED_CHAIN_ID }],
      });
    } catch (switchError) {
      // Network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
        } catch (addError) {
          throw new Error('Failed to add Amoy network to MetaMask');
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount('');
    setChainId('');
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setIsRegistered(false);
    setUserProfile(null);
    
    // Clear refs
    lastCheckedAccountRef.current = null;
    lastProfileHashRef.current = null;
    profileFetchingRef.current = false;

    toast({
      title: 'Wallet Disconnected',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // FIXED: Stable user registration check with proper loop prevention
  const checkUserRegistration = useCallback(async (address, contracts) => {
    // CRITICAL: Prevent infinite loops
    if (!address || !contracts?.projectFactory || !mountedRef.current) {
      return;
    }
    
    // Skip if already checking for this account
    if (profileFetchingRef.current || lastCheckedAccountRef.current === address) {
      console.log('⏭️ Skipping registration check - already checking or same account');
      return;
    }

    try {
      profileFetchingRef.current = true;
      setCheckingRegistration(true);
      
      console.log('🔍 Checking registration for:', address.substring(0, 10));
      
      const registered = await contracts.projectFactory.isUserRegistered(address);
      
      if (!mountedRef.current) return;
      
      setIsRegistered(registered);
      lastCheckedAccountRef.current = address;

      if (registered) {
        console.log('✅ User is registered, fetching profile...');
        const profile = await contracts.projectFactory.getUserProfile(address);
        
        if (!mountedRef.current) return;
        
        // Only fetch role data if IPFS hash is new
        let roleData = null;
        const currentHash = profile.profileIPFSHash;
        
        if (currentHash && currentHash !== lastProfileHashRef.current) {
          console.log('🔍 New IPFS hash detected, fetching role data...');
          roleData = await fetchUserRole(currentHash);
          lastProfileHashRef.current = currentHash;
        } else if (userProfile?.role) {
          // Use existing role data
          console.log('📋 Using existing role data');
          roleData = {
            role: userProfile.role,
            bio: userProfile.bio,
            location: userProfile.location,
            experience: userProfile.experience,
            name: userProfile.name
          };
        }
        
        if (!mountedRef.current) return;
        
        const newProfile = {
          name: profile.name,
          profileIPFSHash: profile.profileIPFSHash,
          registeredAt: profile.registeredAt.toString(),
          projectCount: profile.projectCount.toString(),
          totalInvested: ethers.utils.formatUnits(profile.totalInvested, 6),
          totalRaised: ethers.utils.formatUnits(profile.totalRaised, 6),
          role: roleData?.role || 'investor',
          bio: roleData?.bio || '',
          location: roleData?.location || '',
          experience: roleData?.experience || ''
        };
        
        setUserProfile(newProfile);
        console.log('✅ User profile loaded with role:', roleData?.role || 'investor');
      } else {
        console.log('ℹ️ User not registered');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('❌ Error checking user registration:', error);
      if (mountedRef.current) {
        setIsRegistered(false);
        setUserProfile(null);
      }
    } finally {
      if (mountedRef.current) {
        setCheckingRegistration(false);
      }
      profileFetchingRef.current = false;
    }
  }, [fetchUserRole, userProfile?.role, userProfile?.bio, userProfile?.location, userProfile?.experience, userProfile?.name]);

  // Sign message for authentication
  const signMessage = useCallback(async (message) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Message signing error:', error);
      
      if (error.code === 4001) {
        throw new Error('Message signing rejected by user');
      }
      throw new Error('Failed to sign message');
    }
  }, [signer]);

  // Get current network info
  const getNetworkInfo = useCallback(async () => {
    if (!provider) return null;

    try {
      const network = await provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
        isAmoy: network.chainId === 80002
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }, [provider]);

  // Get wallet balance (MATIC)
  const getBalance = useCallback(async (address = account) => {
    if (!provider || !address) return '0';

    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }, [provider, account]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log('Accounts changed:', accounts);
      
      if (accounts.length === 0) {
        // No accounts connected
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Account changed - reset everything
        setAccount(accounts[0]);
        setIsRegistered(false);
        setUserProfile(null);
        lastCheckedAccountRef.current = null;
        lastProfileHashRef.current = null;
        
        toast({
          title: 'Account Changed',
          description: `Switched to ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    const handleChainChanged = (newChainId) => {
      console.log('Chain changed to:', newChainId);
      const chainIdNumber = parseInt(newChainId, 16);
      setChainId(chainIdNumber.toString());

      if (newChainId !== EXPECTED_CHAIN_ID) {
        toast({
          title: 'Network Changed',
          description: 'Please switch back to Polygon Amoy network',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    const handleConnect = (connectInfo) => {
      console.log('Wallet connected:', connectInfo);
    };

    const handleDisconnect = (error) => {
      console.log('Wallet disconnected:', error);
      disconnectWallet();
    };

    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('connect', handleConnect);
    window.ethereum.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('connect', handleConnect);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [account, toast, disconnectWallet]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        // Check if already connected
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts && accounts.length > 0) {
          // Silently reconnect
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          const web3Signer = web3Provider.getSigner();
          const network = await web3Provider.getNetwork();

          setProvider(web3Provider);
          setSigner(web3Signer);
          setAccount(accounts[0]);
          setChainId(network.chainId.toString());
          setIsConnected(true);

          console.log('Auto-connected to:', accounts[0].substring(0, 10));
        }
      } catch (error) {
        console.error('Auto-connection error:', error);
      }
    };

    checkConnection();
  }, []);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      profileFetchingRef.current = false;
      ipfsCache.clear();
      fetchingPromises.clear();
    };
  }, []);

  // Format address for display
  const formatAddress = useCallback((address, chars = 4) => {
    if (!address) return '';
    return `${address.substring(0, 2 + chars)}...${address.substring(address.length - chars)}`;
  }, []);

  // Validate if on correct network
  const isOnCorrectNetwork = useCallback(() => {
    return chainId === '80002'; // Amoy testnet
  }, [chainId]);

  // Context value
  const contextValue = {
    // Connection state
    account,
    chainId,
    isConnected,
    isConnecting,
    provider,
    signer,

    // User state
    isRegistered,
    userProfile,
    checkingRegistration,

    // Connection methods
    connectWallet,
    disconnectWallet,
    switchToAmoyNetwork,

    // User methods
    checkUserRegistration,
    signMessage,

    // Utility methods
    getNetworkInfo,
    getBalance,
    formatAddress,
    isOnCorrectNetwork,

    // Network info
    expectedChainId: EXPECTED_CHAIN_ID,
    networkConfig: NETWORK_CONFIG
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export default Web3Context;