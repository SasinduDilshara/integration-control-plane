import { useState, useCallback } from 'react';

export interface RegistryNavigationState {
  currentPath: string;
  pathSegments: string[];
}

export function useRegistryNavigation(initialPath = 'registry') {
  const [state, setState] = useState<RegistryNavigationState>(() => {
    // Remove leading slash if present and split into segments
    const cleanPath = initialPath.startsWith('/') ? initialPath.substring(1) : initialPath;
    const segments = cleanPath.split('/').filter((s) => s.length > 0);
    return {
      currentPath: segments.join('/'),
      pathSegments: segments,
    };
  });

  const navigateToPath = useCallback((path: string) => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const segments = cleanPath.split('/').filter((s) => s.length > 0);
    setState({
      currentPath: segments.join('/'),
      pathSegments: segments,
    });
  }, []);

  const navigateToSegment = useCallback((index: number) => {
    setState((prev) => {
      // index -1 means go to root (registry)
      if (index === -1) {
        return {
          currentPath: 'registry',
          pathSegments: ['registry'],
        };
      }
      const segments = prev.pathSegments.slice(0, index + 1);
      return {
        currentPath: segments.join('/'),
        pathSegments: segments,
      };
    });
  }, []);

  const navigateInto = useCallback((itemName: string) => {
    setState((prev) => {
      const newSegments = [...prev.pathSegments, itemName];
      return {
        currentPath: newSegments.join('/'),
        pathSegments: newSegments,
      };
    });
  }, []);

  const navigateUp = useCallback(() => {
    setState((prev) => {
      if (prev.pathSegments.length <= 1) {
        // Stay at registry root
        return {
          currentPath: 'registry',
          pathSegments: ['registry'],
        };
      }
      const newSegments = prev.pathSegments.slice(0, -1);
      return {
        currentPath: newSegments.join('/'),
        pathSegments: newSegments,
      };
    });
  }, []);

  return {
    currentPath: state.currentPath,
    pathSegments: state.pathSegments,
    navigateToPath,
    navigateToSegment,
    navigateInto,
    navigateUp,
  };
}
