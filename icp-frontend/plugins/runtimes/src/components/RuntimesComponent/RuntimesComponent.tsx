import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,

} from '@backstage/core-components';
import { RuntimesFetchComponent } from '../RuntimesFetchComponent';

export const RuntimesComponent = () => (
  <Page themeId="tool">
    <Header title="Runtimes">
      <HeaderLabel label="Owner" value="Team X" />
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>
    <Content>
      <Grid container spacing={3} direction="column">
        <Grid item>
        </Grid>
        <Grid item>
          <RuntimesFetchComponent />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
