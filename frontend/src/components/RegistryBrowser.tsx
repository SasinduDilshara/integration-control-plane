/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { type JSX, useState } from 'react';
import { Box, CircularProgress, Typography, Alert, Button, Stack } from '@wso2/oxygen-ui';
import { ArrowUp } from '@wso2/oxygen-ui-icons-react';
import { useRegistryNavigation } from '../hooks/useRegistryNavigation';
import { useRegistryDirectory, type GqlRegistryDirectoryItem } from '../api/queries';
import { RegistryBreadcrumb } from './RegistryBreadcrumb';
import { RegistryDirectoryView } from './RegistryDirectoryView';
import { RegistryFileViewer } from './RegistryFileViewer';

interface RegistryBrowserProps {
  runtimeId: string;
  initialPath?: string;
}

export function RegistryBrowser({ runtimeId, initialPath = 'registry' }: RegistryBrowserProps): JSX.Element {
  const { currentPath, pathSegments, navigateToSegment, navigateInto, navigateUp } = useRegistryNavigation(initialPath);
  const [selectedFile, setSelectedFile] = useState<{ item: GqlRegistryDirectoryItem; path: string } | null>(null);

  const { data: directoryData, isLoading, error } = useRegistryDirectory(runtimeId, currentPath, false);

  const handleNavigateInto = (itemName: string) => {
    // Navigate into directory - path is derived from current location + item name from response
    navigateInto(itemName);
  };

  const handleSelectFile = (item: GqlRegistryDirectoryItem) => {
    // Construct full file path from current directory path + file name from response
    const filePath = `${currentPath}/${item.name}`;
    setSelectedFile({ item, path: filePath });
  };

  const handleCloseFileViewer = () => {
    setSelectedFile(null);
  };

  const handleBreadcrumbNavigate = (index: number) => {
    // index -1 means root
    if (index === -1) {
      navigateToSegment(-1);
    } else {
      navigateToSegment(index);
    }
  };

  const isAtRoot = pathSegments.length === 1 && pathSegments[0] === 'registry';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        {!isAtRoot && (
          <Button variant="text" size="small" startIcon={<ArrowUp size={16} />} onClick={navigateUp}>
            Up
          </Button>
        )}
        <Box sx={{ flex: 1 }}>
          <RegistryBreadcrumb pathSegments={pathSegments} onNavigate={handleBreadcrumbNavigate} />
        </Box>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load registry directory: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : directoryData ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {directoryData.count} item{directoryData.count !== 1 ? 's' : ''}
          </Typography>
          <RegistryDirectoryView items={directoryData.items} onNavigateInto={handleNavigateInto} onSelectFile={handleSelectFile} />
        </>
      ) : (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No data available
        </Typography>
      )}

      {selectedFile && <RegistryFileViewer runtimeId={runtimeId} filePath={selectedFile.path} item={selectedFile.item} onClose={handleCloseFileViewer} />}
    </Box>
  );
}
