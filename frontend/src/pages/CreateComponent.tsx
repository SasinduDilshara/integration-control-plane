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

import { Button, Divider, Form, PageTitle, PageContent, Stack } from '@wso2/oxygen-ui';
import { useState, type JSX } from 'react';
import { Link as NavigateLink, useParams } from 'react-router';
import { projectUrl } from '../paths';
import { ExternalLinkIcon, Import, Network, WSO2 } from '@wso2/oxygen-ui-icons-react';
import IntegrationTypeCard from '../components/ComponentCreate/IntegrationTypeCard';
import IntegrationWizard from '../components/ComponentCreate/IntegrationWizard';
import SampleAppCard from '../components/ComponentCreate/SampleAppCard';
import SampleIntegrationsSection from '../components/ComponentCreate/SampleIntegrationsSection';

const SelectionView = ({ onNext }: { onNext: () => void }) => (
  <Stack maxWidth="xl" mx="auto" spacing={2}>
    <Stack direction="row" spacing={2}>
      <Form.Stack direction="row" width="md">
        <IntegrationTypeCard icon={Network} title="Create a new Integration" description="Start developing in a complete, browser-based development environment." tooltipText="What is this?" onClick={onNext} />
        <IntegrationTypeCard icon={Import} title="Import an Integration" description="Connect your existing code repository, and start building instantly" tooltipText="What is this?" />
      </Form.Stack>
      <Divider orientation="vertical" flexItem />
      <SampleIntegrationsSection>
        {['Sample Integration 1', 'Sample Integration 2', 'Sample Integration 3'].map((t, i) => (
          <SampleAppCard key={i} title={t} subtitle={t} description={t} icon={<WSO2 />} />
        ))}
        <Form.CardButton alignItems="center" sx={{ width: 280 }}>
          <Button variant="text" size="small" endIcon={<ExternalLinkIcon size={16} />}>
            View more samples..
          </Button>
        </Form.CardButton>
      </SampleIntegrationsSection>
    </Stack>
  </Stack>
);

export default function CreateComponent(): JSX.Element {
  const { orgId, id } = useParams<{ orgId: string; id?: string }>();
  const [step, setStep] = useState<'select' | 'config'>('select');

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton component={step === 'select' && orgId && id ? <NavigateLink to={projectUrl(orgId, id)} /> : undefined} onClick={step === 'config' ? () => setStep('select') : undefined} />
        <PageTitle.Header>{step === 'select' ? 'Get started with your Integration' : 'Import your Integration'}</PageTitle.Header>
        <PageTitle.SubHeader>Follow the steps below to {step === 'select' ? 'create a new' : 'import your'} integration</PageTitle.SubHeader>
      </PageTitle>

      {step === 'select' ? <SelectionView onNext={() => setStep('config')} /> : <IntegrationWizard />}
    </PageContent>
  );
}
