import {
    Header,
    Page,
    Content,
    ContentHeader,
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
            <ContentHeader title="All Projects">

            </ContentHeader>
            <ProjectsFetchComponent />
        </Content>
    </Page>
);
