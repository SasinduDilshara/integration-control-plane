import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { EnvironmentFetchComponent } from '../EnvironmentFetchComponent';

export const EnvironmentsComponent = () => (
  <Page themeId="tool">
    <Header title="Environments">
      <HeaderLabel label="Owner" value="Team X" />
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>
    <Content>
      <Grid container spacing={3} direction="column">
        <Grid item>
          <EnvironmentFetchComponent />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
