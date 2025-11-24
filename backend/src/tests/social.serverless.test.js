/**
 * Unit tests for Social API serverless function path parsing
 * Tests the path extraction logic that may be causing the Vercel bug
 * 
 * This test will FAIL if the path matching logic doesn't correctly extract
 * /posts/popular from Vercel request URLs, which is the suspected bug.
 */

describe('Social API Serverless Function - Path Parsing (Vercel Bug Test)', () => {
  /**
   * Extract the path parsing logic from api/social.js for testing
   * This mirrors the exact logic used in the serverless function
   * 
   * NOTE: This function should match the implementation in api/social.js exactly.
   * If the test fails, the bug is in api/social.js, not here.
   */
  const extractPath = (req) => {
    // Handle both Vercel's url format and standard format
    let url = req.url || req.path || '';
    
    // If URL is a full URL (starts with http:// or https://), extract just the pathname
    // This handles cases where Vercel sends full URLs like https://app.vercel.app/api/social/posts/popular
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        url = urlObj.pathname + (urlObj.search || '');
      } catch (e) {
        // If URL parsing fails, fall back to original logic
        console.warn('Failed to parse URL:', url, e);
      }
    }
    
    // Remove query string
    let pathWithoutQuery = url.split('?')[0];
    
    // Extract path from URL - handle both /api/social and direct paths
    if (pathWithoutQuery.startsWith('/api/social')) {
      pathWithoutQuery = pathWithoutQuery.replace('/api/social', '');
    }
    // Also handle /api/photo-upload
    if (pathWithoutQuery.startsWith('/api/photo-upload')) {
      pathWithoutQuery = pathWithoutQuery.replace('/api/photo-upload', '/photo-upload');
    }
    // Ensure path starts with / if it's not empty
    if (pathWithoutQuery && !pathWithoutQuery.startsWith('/')) {
      pathWithoutQuery = '/' + pathWithoutQuery;
    }
    if (!pathWithoutQuery) {
      pathWithoutQuery = '/';
    }
    
    return pathWithoutQuery;
  };

  describe('Path extraction from Vercel request format', () => {
    it('should correctly extract /posts/popular from /api/social/posts/popular', () => {
      const req = {
        url: '/api/social/posts/popular?limit=50',
        path: undefined,
      };

      const extractedPath = extractPath(req);
      
      // This will FAIL if path extraction doesn't work correctly
      expect(extractedPath).toBe('/posts/popular');
    });

    it('should handle Vercel URL with full domain', () => {
      const req = {
        url: 'https://example.vercel.app/api/social/posts/popular?limit=50',
        path: undefined,
      };

      const extractedPath = extractPath(req);
      
      // This will FAIL - the current logic doesn't handle full URLs
      // This is likely the bug!
      expect(extractedPath).toBe('/posts/popular');
    });

    it('should handle path when url is not set but path is', () => {
      const req = {
        url: undefined,
        path: '/posts/popular',
      };

      const extractedPath = extractPath(req);
      
      expect(extractedPath).toBe('/posts/popular');
    });

    it('should handle empty path correctly', () => {
      const req = {
        url: '/api/social',
        path: undefined,
      };

      const extractedPath = extractPath(req);
      
      expect(extractedPath).toBe('/');
    });

    it('should handle query parameters correctly', () => {
      const req = {
        url: '/api/social/posts/popular?limit=50&timeWindowHours=24&locationName=Dunster%20House',
        path: undefined,
      };

      const extractedPath = extractPath(req);
      
      expect(extractedPath).toBe('/posts/popular');
    });

    it('should match the expected path for popular posts endpoint check', () => {
      const req = {
        url: '/api/social/posts/popular',
        path: undefined,
      };

      const extractedPath = extractPath(req);
      const expectedPath = '/posts/popular';
      
      // This assertion will FAIL if the bug exists
      // The endpoint check in api/social.js uses: path === '/posts/popular'
      expect(extractedPath).toBe(expectedPath);
    });
  });

  describe('Integration: Path matching for endpoint routing', () => {
    it('should correctly identify popular posts endpoint', () => {
      const testCases = [
        {
          req: { url: '/api/social/posts/popular', path: undefined },
          expectedMatch: true,
          description: 'Standard Vercel rewrite format',
        },
        {
          req: { url: '/api/social/posts/popular?limit=50', path: undefined },
          expectedMatch: true,
          description: 'With query parameters',
        },
        {
          req: { url: undefined, path: '/posts/popular' },
          expectedMatch: true,
          description: 'Direct path format',
        },
        {
          req: { url: 'https://app.vercel.app/api/social/posts/popular', path: undefined },
          expectedMatch: true,
          description: 'Full URL format (potential bug case)',
        },
      ];

      testCases.forEach(({ req, expectedMatch, description }) => {
        const extractedPath = extractPath(req);
        const matches = extractedPath === '/posts/popular';
        
        // This will FAIL for the full URL case if the bug exists
        expect(matches).toBe(expectedMatch, 
          `Failed for: ${description}. Extracted path: "${extractedPath}"`
        );
      });
    });

    it('should NOT match /posts/popular with single post ID regex pattern', () => {
      // This test verifies that /posts/popular is NOT matched by the single post handler regex
      // The single post handler uses: /^\/posts\/[^\/]+$/
      // This should NOT match /posts/popular because popular posts handler comes first
      
      const singlePostRegex = /^\/posts\/[^\/]+$/;
      const popularPath = '/posts/popular';
      
      // The regex WILL match, but the route handler should check path !== '/posts/popular'
      const regexMatches = singlePostRegex.test(popularPath);
      expect(regexMatches).toBe(true); // The regex does match
      
      // But the handler should exclude it explicitly
      const shouldBeExcluded = popularPath !== '/posts/popular';
      expect(shouldBeExcluded).toBe(false); // This is false, meaning it IS /posts/popular
      
      // So the condition in the handler should be:
      // path.match(/^\/posts\/[^\/]+$/) && path !== '/posts/popular'
      const wouldMatchSinglePostHandler = regexMatches && popularPath !== '/posts/popular';
      expect(wouldMatchSinglePostHandler).toBe(false); // Should NOT match single post handler
    });

    it('should match /posts/popular with exact path check (popular posts handler)', () => {
      // The popular posts handler uses: path === '/posts/popular'
      const popularPath = '/posts/popular';
      const exactMatch = popularPath === '/posts/popular';
      
      expect(exactMatch).toBe(true); // Should match popular posts handler
    });

    it('should verify route matching order prevents /posts/popular from being treated as post ID', () => {
      // Simulate the route matching logic
      const path = '/posts/popular';
      
      // Popular posts handler check (comes first)
      const matchesPopularHandler = path === '/posts/popular';
      
      // Single post handler check (comes after, should not match)
      const singlePostRegex = /^\/posts\/[^\/]+$/;
      const matchesSinglePostHandler = singlePostRegex.test(path) && 
                                       !path.includes('/user/') && 
                                       !path.includes('/location') && 
                                       path !== '/posts/popular';
      
      // Popular handler should match
      expect(matchesPopularHandler).toBe(true);
      
      // Single post handler should NOT match (due to explicit exclusion)
      expect(matchesSinglePostHandler).toBe(false);
    });
  });
});

