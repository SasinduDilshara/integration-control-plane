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

import { type JSX } from 'react';
import { Breadcrumbs, Link, Typography } from '@wso2/oxygen-ui';
import { ChevronRight } from '@wso2/oxygen-ui-icons-react';

interface RegistryBreadcrumbProps {
  pathSegments: string[];
  onNavigate: (index: number) => void;
}

export function RegistryBreadcrumb({ pathSegments, onNavigate }: RegistryBreadcrumbProps): JSX.Element {
  // If we're at registry root, just show it as current location
  if (pathSegments.length === 1 && pathSegments[0] === 'registry') {
    return (
      <Breadcrumbs separator={<ChevronRight size={16} />} aria-label="registry path navigation">
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          Registry
        </Typography>
      </Breadcrumbs>
    );
  }

  return (
    <Breadcrumbs separator={<ChevronRight size={16} />} aria-label="registry path navigation">
      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const displayName = segment === 'registry' ? 'Registry' : segment;

        return isLast ? (
          <Typography key={index} variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
            {displayName}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            variant="body2"
            onClick={() => onNavigate(index)}
            sx={{
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}>
            {displayName}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
