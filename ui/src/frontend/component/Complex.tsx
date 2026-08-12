import React, { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ErrorPanel from './ErrorPanel';
import { fetchComplexList, fetchComplex } from '../store/complexesSlice';
import { DEFAULT_PAGE_SIZE } from '../store/sliceFactory';
import { Box, Chip, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, stateColor } from '../lib/utils';

interface Props {
  id?: string;
  site?: string;
}

const Complex: React.FC<Props> = ( { id, site } ) =>
{
  const dispatch = useDispatch<AppDispatch>();
  const authenticated = useSelector( ( s: RootState ) => s.app.authenticated );
  const updateVersion = useSelector( ( s: RootState ) => s.app.updateVersion );
  const { list, total, detail, loading, error } = useSelector( ( s: RootState ) => s.complexes );
  const [page, setPage] = useState( 0 );
  const [rowsPerPage, setRowsPerPage] = useState( DEFAULT_PAGE_SIZE );

  const fetchData = useCallback( () =>
  {
    if ( !authenticated ) return;
    if ( id !== undefined ) dispatch( fetchComplex( id ) );
    else dispatch( fetchComplexList( { site: site ?? '', position: page * rowsPerPage, count: rowsPerPage } ) );
  }, [authenticated, dispatch, id, site, page, rowsPerPage, updateVersion] );

  useEffect( () => { setPage( 0 ); }, [site] );
  useEffect( () => { fetchData(); }, [fetchData] );

  if ( loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if ( error ) return <ErrorPanel error={ error } onRetry={ fetchData } />;

  if ( id !== undefined )
  {
    return (
      <Box>
        <Link component={ RouterLink } to="/complexes">&larr; Complexes</Link>
        <Typography variant="h5" gutterBottom>Complex Detail</Typography>
        { detail !== null &&
          <Table size="small" sx={{ mt: 1 }}>
            <TableBody>
              <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + detail.site?.toString() }>{ detail.site?.toString() }</Link></TableCell></TableRow>
              <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ detail.description }</TableCell></TableRow>
              <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ detail.name }</TableCell></TableRow>
              <TableRow><TableCell variant="head">State</TableCell><TableCell>{ detail.state }</TableCell></TableRow>
              <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ detail.type }</TableCell></TableRow>
              <TableRow><TableCell variant="head">Members</TableCell><TableCell><ul>{ ( detail.members || [] ).map( ( item, index ) => (
                <li key={ index }>{ item.toString() }</li>
              ) ) }</ul></TableCell></TableRow>
              <TableRow><TableCell variant="head">Built at Percentage</TableCell><TableCell>{ detail.built_percentage }%</TableCell></TableRow>
              <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( detail.created ) }</TableCell></TableRow>
              <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( detail.updated ) }</TableCell></TableRow>
            </TableBody>
          </Table>
        }
      </Box>
    );
  }

  return (
    <Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">Id</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/complex/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.description }</TableCell>
              <TableCell>{ item.type }</TableCell>
              <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={ total }
        page={ page }
        rowsPerPage={ rowsPerPage }
        rowsPerPageOptions={ [25, 50, 100] }
        onPageChange={ ( _, p ) => setPage( p ) }
        onRowsPerPageChange={ ( e ) => { setRowsPerPage( parseInt( e.target.value, 10 ) ); setPage( 0 ); } }
      />
    </Box>
  );
};

export default Complex;
