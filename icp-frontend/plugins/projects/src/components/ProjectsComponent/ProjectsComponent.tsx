import {
    Header,
    Page,
    Content,
    HeaderLabel,
} from '@backstage/core-components';
import { ProjectsFetchComponent } from '../ProjectsFetchComponent';

export const ProjectsComponent = () => (
    <Page themeId="tool">
        <Header title="Integration Projects">
            <HeaderLabel label="Owner" value="Team X" />
            <HeaderLabel label="Lifecycle" value="Alpha" />
        </Header>
        <Content>
            <ProjectsFetchComponent />
        </Content>
    </Page>
);
