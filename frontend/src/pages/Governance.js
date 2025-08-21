import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text,
  FormHelperText,
  Select, 
  VStack, 
  HStack, 
  Button, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Progress,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  StatGroup,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Wrap,
  WrapItem,
  Avatar
} from '@chakra-ui/react';
import { 
  FaVoteYea, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaSortAmountDown, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaEllipsisV,
  FaChartLine,
  FaUserFriends,
  FaCoins
} from 'react-icons/fa';

// Mock data for proposals
const mockProposals = [
  {
    id: 1,
    title: 'Increase Platform Fee to 2%',
    description: 'Proposal to increase the platform fee from 1.5% to 2% to improve sustainability and fund development.',
    status: 'Active',
    votesFor: 120000,
    votesAgainst: 45000,
    totalVotes: 165000,
    startDate: '2023-06-01',
    endDate: '2023-06-15',
    createdBy: '0x1234...5678',
    createdAt: '2023-05-25'
  },
  {
    id: 2,
    title: 'Add New Region: Khulna Division',
    description: 'Proposal to expand operations to include farmers from Khulna Division.',
    status: 'Upcoming',
    votesFor: 0,
    votesAgainst: 0,
    totalVotes: 0,
    startDate: '2023-06-20',
    endDate: '2023-07-05',
    createdBy: '0x8765...4321',
    createdAt: '2023-06-10'
  },
  {
    id: 3,
    title: 'Update Smart Contract Parameters',
    description: 'Proposal to update key parameters in the smart contracts for better gas efficiency.',
    status: 'Executed',
    votesFor: 98000,
    votesAgainst: 12000,
    totalVotes: 110000,
    startDate: '2023-05-10',
    endDate: '2023-05-25',
    executedAt: '2023-05-26',
    createdBy: '0x5678...1234',
    createdAt: '2023-05-01'
  },
  {
    id: 4,
    title: 'Community Grant Program',
    description: 'Proposal to allocate 100,000 AGY tokens for community grants and initiatives.',
    status: 'Defeated',
    votesFor: 45000,
    votesAgainst: 85000,
    totalVotes: 130000,
    startDate: '2023-04-15',
    endDate: '2023-04-30',
    createdBy: '0xabcd...ef12',
    createdAt: '2023-04-01'
  }
];

const Governance = () => {
  const [proposals, setProposals] = useState(mockProposals);
  const [activeTab, setActiveTab] = useState('active');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    discussion: '',
    votingPeriod: '7'
  });
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const filteredProposals = proposals.filter(proposal => {
    if (activeTab === 'active') return proposal.status === 'Active';
    if (activeTab === 'upcoming') return proposal.status === 'Upcoming';
    if (activeTab === 'executed') return proposal.status === 'Executed';
    if (activeTab === 'defeated') return proposal.status === 'Defeated';
    return true;
  });

  const handleVote = (proposalId, support) => {
    // In a real app, this would interact with your smart contract
    const updatedProposals = proposals.map(proposal => {
      if (proposal.id === proposalId) {
        const voteChange = support ? 1 : -1;
        return {
          ...proposal,
          votesFor: support ? proposal.votesFor + 1 : proposal.votesFor,
          votesAgainst: !support ? proposal.votesAgainst + 1 : proposal.votesAgainst,
          totalVotes: proposal.totalVotes + 1
        };
      }
      return proposal;
    });
    
    setProposals(updatedProposals);
    
    toast({
      title: 'Vote Submitted',
      description: `Your vote has been recorded for proposal #${proposalId}.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleCreateProposal = () => {
    if (!newProposal.title || !newProposal.description) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    // In a real app, this would interact with your smart contract
    const newId = proposals.length > 0 ? Math.max(...proposals.map(p => p.id)) + 1 : 1;
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(newProposal.votingPeriod));
    
    const proposal = {
      id: newId,
      title: newProposal.title,
      description: newProposal.description,
      status: 'Upcoming',
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      createdBy: '0x1234...5678', // In a real app, this would be the connected wallet address
      createdAt: today.toISOString().split('T')[0]
    };
    
    setProposals([...proposals, proposal]);
    
    toast({
      title: 'Proposal Created',
      description: 'Your proposal has been submitted and is pending execution.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // Reset form
    setNewProposal({
      title: '',
      description: '',
      discussion: '',
      votingPeriod: '7'
    });
    
    onClose();
  };

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const getTimeRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = Math.max(0, end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days remaining`;
  };

  const getStatusBadge = (status) => {
    const colorSchemes = {
      'Active': 'green',
      'Upcoming': 'blue',
      'Executed': 'purple',
      'Defeated': 'red'
    };
    
    return (
      <Badge colorScheme={colorSchemes[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <HStack justify="space-between" align="flex-start">
            <Box>
              <Heading as="h1" size="xl" mb={2}>
                Governance
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.400')}>
                Participate in the decentralized governance of AgroYield
              </Text>
            </Box>
            <Button 
              leftIcon={<FaPlus />} 
              colorScheme="brand"
              onClick={onOpen}
            >
              New Proposal
            </Button>
          </HStack>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mt={8}>
            <StatCard 
              title="Total Proposals" 
              value={proposals.length.toString()} 
              icon={FaVoteYea} 
              change="+12% this month" 
            />
            <StatCard 
              title="Voting Power" 
              value="25,000 AGY" 
              icon={FaChartLine} 
              change="5,000 AGY delegated" 
            />
            <StatCard 
              title="Participation" 
              value="42%" 
              icon={FaUserFriends} 
              change="+8% from last month" 
            />
          </SimpleGrid>
        </Box>
        
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
          <Tabs 
            variant="enclosed" 
            colorScheme="brand"
            onChange={(index) => {
              const tabs = ['active', 'upcoming', 'executed', 'defeated'];
              setActiveTab(tabs[index] || 'all');
            }}
          >
            <TabList>
              <Tab>Active</Tab>
              <Tab>Upcoming</Tab>
              <Tab>Executed</Tab>
              <Tab>Defeated</Tab>
            </TabList>
            
            <TabPanels p={0}>
              <TabPanel p={0}>
                <ProposalList 
                  proposals={filteredProposals} 
                  onVote={handleVote} 
                  cardBg={cardBg}
                  borderColor={borderColor}
                />
              </TabPanel>
              <TabPanel p={0}>
                <ProposalList 
                  proposals={filteredProposals} 
                  onVote={handleVote} 
                  cardBg={cardBg}
                  borderColor={borderColor}
                />
              </TabPanel>
              <TabPanel p={0}>
                <ProposalList 
                  proposals={filteredProposals} 
                  onVote={handleVote} 
                  cardBg={cardBg}
                  borderColor={borderColor}
                />
              </TabPanel>
              <TabPanel p={0}>
                <ProposalList 
                  proposals={filteredProposals} 
                  onVote={handleVote} 
                  cardBg={cardBg}
                  borderColor={borderColor}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Card>
      </VStack>
      
      {/* Create Proposal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Proposal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel>Proposal Title</FormLabel>
                <Input 
                  placeholder="Proposal title" 
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea 
                  placeholder="Detailed description of your proposal" 
                  rows={6}
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                />
                <FormHelperText>
                  Clearly describe what this proposal aims to accomplish and why it's important.
                </FormHelperText>
              </FormControl>
              
              <FormControl>
                <FormLabel>Discussion Link (Optional)</FormLabel>
                <Input 
                  placeholder="https://forum.agroyield.org/..." 
                  value={newProposal.discussion}
                  onChange={(e) => setNewProposal({...newProposal, discussion: e.target.value})}
                />
                <FormHelperText>
                  Link to discussion about this proposal (e.g., forum post, Discord thread)
                </FormHelperText>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Voting Period</FormLabel>
                <Select
                  value={newProposal.votingPeriod}
                  onChange={(e) => setNewProposal({...newProposal, votingPeriod: e.target.value})}
                >
                  <option value="3">3 days</option>
                  <option value="5">5 days</option>
                  <option value="7">7 days (recommended)</option>
                  <option value="14">14 days</option>
                </Select>
              </FormControl>
              
              <Box bg={useColorModeValue('blue.50', 'blue.900')} p={4} borderRadius="md">
                <Text fontWeight="medium" mb={2}>Proposal Creation Requirements</Text>
                <Text fontSize="sm" mb={2}>
                  To create a proposal, you need to hold at least <strong>10,000 AGY</strong> or have been delegated voting power.
                </Text>
                <Text fontSize="sm" color={useColorModeValue('blue.700', 'blue.200')}>
                  Your voting power: <strong>25,000 AGY</strong> (Eligible)
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="brand" 
                onClick={handleCreateProposal}
                leftIcon={<FaVoteYea />}
              >
                Create Proposal
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

const StatCard = ({ title, value, icon: Icon, change, changeType = 'increase' }) => (
  <Card variant="outline" bg="transparent" borderWidth="1px" borderColor={useColorModeValue('gray.200', 'gray.600')}>
    <CardBody>
      <HStack justify="space-between">
        <Box>
          <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')} mb={1}>
            {title}
          </Text>
          <Stat>
            <StatNumber>{value}</StatNumber>
            <StatHelpText>
              <StatArrow type={changeType} />
              {change}
            </StatHelpText>
          </Stat>
        </Box>
        <Box 
          p={3} 
          bg={useColorModeValue('brand.50', 'brand.900')} 
          color="brand.500" 
          borderRadius="full"
        >
          <Icon size={20} />
        </Box>
      </HStack>
    </CardBody>
  </Card>
);

const ProposalList = ({ proposals, onVote, cardBg, borderColor }) => {
  const emptyTextColor = useColorModeValue('gray.500', 'gray.400');
  
  if (proposals.length === 0) {
    return (
      <Box p={8} textAlign="center">
        <Text color={emptyTextColor}>
          No proposals found in this category.
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} p={4}>
      {proposals.map((proposal) => (
        <ProposalCard 
          key={proposal.id} 
          proposal={proposal} 
          onVote={onVote}
          cardBg={cardBg}
          borderColor={borderColor}
        />
      ))}
    </VStack>
  );
};

const ProposalCard = ({ proposal, onVote, cardBg, borderColor }) => {
  // Color mode values - must be called unconditionally at the top
  const gray600 = useColorModeValue('gray.600', 'gray.400');
  const gray500 = useColorModeValue('gray.500', 'gray.400');
  const gray300 = useColorModeValue('gray.300', 'gray.400');
  const gray200 = useColorModeValue('gray.200', 'gray.600');
  const againstTextColor = useColorModeValue('gray.600', 'gray.400');
  
  const votesForPct = getVotePercentage(proposal.votesFor, proposal.totalVotes || 1);
  const votesAgainstPct = getVotePercentage(proposal.votesAgainst, proposal.totalVotes || 1);
  const timeRemaining = getTimeRemaining(proposal.endDate);
  const statusBadge = getStatusBadge(proposal.status);
  
  return (
    <Card 
      w="full" 
      variant="outline" 
      borderWidth="1px" 
      borderColor={borderColor}
      _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
      transition="all 0.2s"
    >
      <CardHeader pb={2}>
        <HStack justify="space-between" align="flex-start">
          <Box>
            <HStack spacing={2} mb={1}>
              <Text fontSize="sm" color={gray600}>
                #{proposal.id}
              </Text>
              {statusBadge}
            </HStack>
            <Heading size="md" mb={2}>
              {proposal.title}
            </Heading>
          </Box>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<FaEllipsisV />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem>View on IPFS</MenuItem>
              <MenuItem>Share</MenuItem>
              <MenuItem>View discussion</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
        
        <Text color={gray300} noOfLines={2}>
          {proposal.description}
        </Text>
      </CardHeader>
      
      <CardBody pt={0}>
        {/* Voting progress */}
        {proposal.status === 'Active' && (
          <Box mb={4}>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium">
                For: {votesForPct}% ({proposal.votesFor.toLocaleString()} AGY)
              </Text>
              <Text fontSize="sm" color={againstTextColor}>
                Against: {votesAgainstPct}% ({proposal.votesAgainst.toLocaleString()} AGY)
              </Text>
            </HStack>
            <HStack spacing={1} mb={2}>
              <Box 
                h="8px" 
                bg="green.400" 
                borderRadius="full" 
                flex={votesForPct / 100} 
              />
              <Box 
                h="8px" 
                bg="red.400" 
                borderRadius="full" 
                flex={votesAgainstPct / 100} 
              />
              <Box 
                h="8px" 
                bg={gray200} 
                borderRadius="full" 
                flex={(100 - votesForPct - votesAgainstPct) / 100}
              />
            </HStack>
            
            <HStack justify="space-between">
              <Text fontSize="xs" color={gray500}>
                {proposal.totalVotes.toLocaleString()} total votes
              </Text>
              <HStack spacing={2}>
                <FaClock size={12} color={gray500} />
                <Text fontSize="xs" color={gray500}>
                  {timeRemaining}
                </Text>
              </HStack>
            </HStack>
          </Box>
        )}
        
        {/* Proposal metadata */}
        <Wrap spacing={4} mt={4}>
          <WrapItem>
            <HStack>
              <Avatar size="sm" name={proposal.createdBy} src="" />
              <Box>
                <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                  Proposed by
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {proposal.createdBy}
                </Text>
              </Box>
            </HStack>
          </WrapItem>
          
          <WrapItem>
            <Box>
              <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                Voting starts
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {proposal.startDate}
              </Text>
            </Box>
          </WrapItem>
          
          <WrapItem>
            <Box>
              <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                Voting ends
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {proposal.endDate}
              </Text>
            </Box>
          </WrapItem>
        </Wrap>
      </CardBody>
      
      {proposal.status === 'Active' && (
        <CardFooter pt={0}>
          <HStack spacing={4} w="full">
            <Button 
              leftIcon={<FaCheck />} 
              colorScheme="green" 
              variant="outline" 
              flex={1}
              onClick={() => onVote(proposal.id, true)}
            >
              Vote For
            </Button>
            <Button 
              leftIcon={<FaTimes />} 
              colorScheme="red" 
              variant="outline" 
              flex={1}
              onClick={() => onVote(proposal.id, false)}
            >
              Vote Against
            </Button>
          </HStack>
        </CardFooter>
      )}
    </Card>
  );
};

// Helper functions
const getVotePercentage = (votes, total) => {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
};

const getTimeRemaining = (endDate) => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = Math.max(0, end - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days remaining`;
};

const getStatusBadge = (status) => {
  const colorSchemes = {
    'Active': 'green',
    'Upcoming': 'blue',
    'Executed': 'purple',
    'Defeated': 'red'
  };
  
  return (
    <Badge colorScheme={colorSchemes[status]}>
      {status}
    </Badge>
  );
};

export default Governance;
