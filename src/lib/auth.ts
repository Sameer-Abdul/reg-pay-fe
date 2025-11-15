import NextAuth, { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

// Helper function to make API calls to the backend
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const url = `${apiUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Authentication failed');
  }

  return response.json();
}

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      isAdmin?: boolean;
      accessToken?: string;
      tenantId?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    isAdmin?: boolean;
    tenantId?: string;
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    isAdmin?: boolean;
    tenantId?: string;
    accessToken?: string;
  }
}

// Generate a random token (not used for JWT, just for session handling)
function generateRandomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Function to validate user credentials with the backend
async function validateUser(credentials: { email: string; password: string }) {
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.user) {
      console.log('Authentication failed:', response.message || 'Unknown error');
      return null;
    }

    return response.user;
  } catch (error) {
    console.error('Error during authentication:', error);
    return null;
  }
}

// Debug function to log auth events
function debug(...args: any[]) {
  if (process.env.NEXTAUTH_DEBUG === 'true') {
    console.log('[Auth]', ...args);
  }
}

// Ensure NEXTAUTH_URL is set in development
if (process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  console.warn('NEXTAUTH_URL not set, defaulting to http://localhost:3000');
}

// Ensure required environment variables are set
const requiredEnvVars = ['NEXTAUTH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('NEXTAUTH_URL');
}

// Get base URL for cookies
const isProduction = process.env.NODE_ENV === 'production';
const protocol = isProduction ? 'https://' : 'http://';
const host = process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
const baseUrl = `${protocol}${host}`;

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  } else {
    console.warn(`⚠️  ${errorMsg}`);
  }
}

export const authOptions: NextAuthOptions = {
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Security
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  
  // Configure cookies
  useSecureCookies: false, // Disable secure cookies in development
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Disable secure in development
        domain: 'localhost', // Explicitly set domain for local development
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  
  // Debug configuration
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  
  // Configure JWT
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Logger configuration
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    }
  },
  
  // Pages configuration
  pages: {
    signIn: '/event-scheduler/login',
    error: '/event-scheduler/login?error=', // Allow passing error messages
  },
  
  // Authentication providers
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password are required');
          }

          const user = await validateUser(credentials);
          
          if (!user) {
            throw new Error('Invalid email or password');
          }

          // The backend should return a proper JWT token
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin || false,
            tenantId: user.tenantId,
            accessToken: user.accessToken || generateRandomToken(),
          };
        } catch (error: any) {
          debug('Authorization error:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
  ],
  
  // Callbacks for JWT and session handling
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
          isAdmin: user.isAdmin,
          tenantId: user.tenantId,
          accessToken: user.accessToken,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          isAdmin: token.isAdmin as boolean,
          tenantId: token.tenantId as string | undefined,
          accessToken: token.accessToken as string | undefined,
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Use the configured base URL for redirects
      const targetBaseUrl = baseUrl || baseUrl;
      const dashboardUrl = `${targetBaseUrl}/event-scheduler/dashboard`;
      
      console.log('Redirect called with:', { url, baseUrl, targetBaseUrl });

      console.log('Redirect called with:', { url, baseUrl, targetBaseUrl });

      // If no URL was provided, redirect to dashboard
      if (!url || url === '/') {
        console.log('No URL provided, redirecting to dashboard');
        return dashboardUrl;
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        // Prevent redirecting back to login after successful login
        if (url === '/login' || url.startsWith('/login')) {
          console.log('Prevented login redirect, going to dashboard');
          return dashboardUrl;
        }
        // Handle relative URLs by appending to the base URL
        const redirectUrl = `${targetBaseUrl}${url}`;
        console.log('Handling relative URL, redirecting to:', redirectUrl);
        return redirectUrl;
      }

      // Handle absolute URLs
      try {
        const urlObj = new URL(url);
        const targetHost = new URL(targetBaseUrl).hostname;

        // If this is a login URL, redirect to dashboard instead
        if (urlObj.pathname === '/login' || urlObj.pathname.startsWith('/login')) {
          console.log('Prevented login redirect, going to dashboard');
          return dashboardUrl;
        }

        // Allow same-origin redirects
        if (urlObj.hostname === targetHost || 
            (!isProduction && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'))) {
          console.log('Allowing same-origin redirect to:', url);
          return url;
        }

        console.log('Blocked cross-origin redirect, defaulting to dashboard');
        return dashboardUrl;

      } catch (e) {
        console.error('Error parsing URL in redirect:', e);
        return dashboardUrl;
      }
    },
  },
};

// Check if NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET is not set. This may cause authentication issues in production.');
}

// Create NextAuth handler
export const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
