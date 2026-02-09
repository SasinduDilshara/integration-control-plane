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

import { useState, useMemo, type JSX } from 'react';
import { Box, Button, Card, CardContent, Chip, IconButton, ListingTable, Menu, MenuItem, Select, FormControl, FormLabel, TablePagination, PageContent, PageTitle, type ListingTableDensity } from '@wso2/oxygen-ui';
import { Plus, MoreVertical, Filter, Download, FileText, Key, Shield, RefreshCw, Lock, Inbox } from '@wso2/oxygen-ui-icons-react';
import { useNavigate, useParams, Link as NavigateLink } from 'react-router';
import { mockComponents } from '../mock-data/mockComponents';
import { projectUrl, newComponentUrl, componentOverviewUrl, editComponentUrl } from '../paths';
import { getStatusColor } from '../config/statusColors';

const ICONS: Record<string, any> = {
  Authentication: Key,
  Authorization: Shield,
  Registration: FileText,
  Recovery: RefreshCw,
  'Multi-Factor Authentication': Lock,
};

type Filters = { type: string; status: string; query: string };

const FilterBar = ({ filters, onChange }: { filters: Filters; onChange: (f: Partial<Filters>) => void }) => (
  <Card variant="outlined" sx={{ mb: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'end' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <FormLabel>Type</FormLabel>
          <Select value={filters.type} onChange={(e) => onChange({ type: e.target.value as string })}>
            <MenuItem value="all">All Types</MenuItem>
            {['Authentication', 'Authorization', 'Registration', 'Recovery', 'Multi-Factor Authentication'].map((t) => (
              <MenuItem key={t} value={t}>
                {t === 'Multi-Factor Authentication' ? 'MFA' : t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <FormLabel>Status</FormLabel>
          <Select value={filters.status} onChange={(e) => onChange({ status: e.target.value as string })}>
            <MenuItem value="all">All Status</MenuItem>
            {['active', 'inactive', 'draft'].map((s) => (
              <MenuItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<Filter size={18} />}>
          More Filters
        </Button>
      </Box>
    </CardContent>
  </Card>
);

const ActionMenu = ({ anchor, onClose, onView, onEdit }: { anchor: HTMLElement | null; onClose: () => void; onView: () => void; onEdit: () => void }) => (
  <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={onClose}>
    <MenuItem onClick={onView}>View Details</MenuItem>
    <MenuItem onClick={onEdit}>Edit</MenuItem>
    <MenuItem onClick={onClose}>Duplicate</MenuItem>
    <MenuItem onClick={onClose}>Export</MenuItem>
    <MenuItem onClick={onClose} sx={{ color: 'error.main' }}>
      Delete
    </MenuItem>
  </Menu>
);

export default function Components(): JSX.Element {
  const navigate = useNavigate();
  const { id, orgId } = useParams<{ id: string; orgId: string }>();
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    status: 'all',
    query: '',
  });
  const [density, setDensity] = useState<ListingTableDensity>('standard');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(5);
  const [menu, setMenu] = useState<{
    el: HTMLElement | null;
    id: string | null;
  }>({ el: null, id: null });

  const list = useMemo(() => {
    const q = filters.query.toLowerCase();
    return mockComponents.filter((c) => (filters.type === 'all' || c.type === filters.type) && (filters.status === 'all' || c.status === filters.status) && (!q || [c.name, c.type, c.category, c.description].some((s) => s.toLowerCase().includes(q))));
  }, [filters]);

  const paginated = list.slice(page * rows, (page + 1) * rows);
  const Icon = (type: string) => ICONS[type] || FileText;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton component={<NavigateLink to={orgId && id ? projectUrl(orgId, id) : '#'} />} />
        <PageTitle.Header>Components</PageTitle.Header>
        <PageTitle.SubHeader>Manage authentication components</PageTitle.SubHeader>
        <PageTitle.Actions>
          <Button variant="outlined" startIcon={<Download size={18} />}>
            Export
          </Button>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => orgId && id && navigate(newComponentUrl(orgId, id))}>
            New Component
          </Button>
        </PageTitle.Actions>
      </PageTitle>

      <FilterBar filters={filters} onChange={(f) => setFilters((p) => ({ ...p, ...f }))} />

      <ListingTable.Provider searchValue={filters.query} onSearchChange={(q) => setFilters((p) => ({ ...p, query: q }))} density={density} onDensityChange={setDensity}>
        <ListingTable.Container disablePaper>
          <ListingTable.Toolbar showSearch searchPlaceholder="Search components..." actions={<ListingTable.DensityControl />} />
          <ListingTable variant="card" density={density}>
            <ListingTable.Head>
              <ListingTable.Row>
                {['name', 'type', 'category', 'status', 'author', 'lastModified'].map((f) => (
                  <ListingTable.Cell key={f}>
                    <ListingTable.SortLabel field={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</ListingTable.SortLabel>
                  </ListingTable.Cell>
                ))}
                <ListingTable.Cell align="right">Actions</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {paginated.length === 0 ? (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={7}>
                    <ListingTable.EmptyState
                      illustration={<Inbox size={64} />}
                      title="No components found"
                      description="Try adjusting your filters"
                      action={
                        !filters.query && filters.type === 'all' ? (
                          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => orgId && id && navigate(newComponentUrl(orgId, id))}>
                            Create Component
                          </Button>
                        ) : undefined
                      }
                    />
                  </ListingTable.Cell>
                </ListingTable.Row>
              ) : (
                paginated.map((c) => {
                  const TI = Icon(c.type);
                  return (
                    <ListingTable.Row key={c.id} variant="card" hover clickable onClick={() => orgId && id && navigate(componentOverviewUrl(orgId, id, c.id))}>
                      <ListingTable.Cell>
                        <ListingTable.CellIcon icon={<TI size={20} />} primary={c.name} secondary={c.description} />
                      </ListingTable.Cell>
                      <ListingTable.Cell>
                        <Chip label={c.type} size="small" variant="outlined" />
                      </ListingTable.Cell>
                      <ListingTable.Cell>{c.category}</ListingTable.Cell>
                      <ListingTable.Cell>
                        <Chip label={c.status} size="small" color={getStatusColor(c.status)} />
                      </ListingTable.Cell>
                      <ListingTable.Cell>{c.author}</ListingTable.Cell>
                      <ListingTable.Cell>{c.lastModified}</ListingTable.Cell>
                      <ListingTable.Cell align="right">
                        <ListingTable.RowActions visibility="hover">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenu({ el: e.currentTarget, id: c.id });
                            }}>
                            <MoreVertical size={18} />
                          </IconButton>
                        </ListingTable.RowActions>
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  );
                })
              )}
            </ListingTable.Body>
          </ListingTable>
          <TablePagination
            component="div"
            count={list.length}
            rowsPerPage={rows}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRows(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </ListingTable.Container>
      </ListingTable.Provider>

      <ActionMenu
        anchor={menu.el}
        onClose={() => setMenu({ el: null, id: null })}
        onView={() => {
          orgId && id && menu.id && navigate(componentOverviewUrl(orgId, id, menu.id));
          setMenu({ el: null, id: null });
        }}
        onEdit={() => {
          orgId && id && menu.id && navigate(editComponentUrl(orgId, id, menu.id));
          setMenu({ el: null, id: null });
        }}
      />
    </PageContent>
  );
}
