import { extendTheme } from '@chakra-ui/react';

const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#e6f7f7',
    100: '#b3e8e8',
    200: '#80d9d9',
    300: '#4dcaca',
    400: '#26bdbd',
    500: '#00b0b0',
    600: '#009c9c',
    700: '#008787',
    800: '#007373',
    900: '#005a5a',
  },
  teal: {
    50: '#e6f7f7',
    100: '#b3e8e8',
    200: '#80d9d9',
    300: '#4dcaca',
    400: '#26bdbd',
    500: '#00b0b0',
    600: '#009c9c',
    700: '#008787',
    800: '#007373',
    900: '#005a5a',
  },
};

const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
      color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
    },
  }),
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
    },
    sizes: {
      lg: {
        h: 12,
        minW: 12,
        fontSize: 'lg',
        px: 6,
      },
      md: {
        h: 10,
        minW: 10,
        fontSize: 'md',
        px: 4,
      },
    },
    variants: {
      solid: (props) => ({
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
          _disabled: {
            bg: 'brand.400',
          },
        },
        _active: {
          bg: 'brand.700',
        },
      }),
      outline: (props) => ({
        border: '2px solid',
        borderColor: 'brand.500',
        color: 'brand.500',
        _hover: {
          bg: 'brand.50',
        },
      }),
    },
    defaultProps: {
      size: 'md',
      variant: 'solid',
      colorScheme: 'brand',
    },
  },
  Input: {
    baseStyle: {
      field: {
        _focus: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        },
      },
    },
  },
  Select: {
    baseStyle: {
      field: {
        _focus: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        },
      },
    },
  },
  Link: {
    baseStyle: {
      color: 'brand.500',
      _hover: {
        textDecoration: 'none',
        color: 'brand.600',
      },
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  styles,
  components,
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    normal: 'normal',
    none: 1,
    shorter: 1.25,
    short: 1.375,
    base: 1.5,
    tall: 1.625,
    taller: '2',
  },
  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
});

export default theme;
