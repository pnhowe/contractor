import React from 'react';
import { connect } from 'react-redux';
import ConfigDialog from './ConfigDialog';
import { contractor } from '../store';
import { fetchFoundationList, fetchFoundation } from '../store/foundationsSlice';
import type { FoundationListItem, FoundationDetail } from '../store/foundationsSlice';
import { Alert, Box, Chip, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr, stateColor } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: FoundationListItem[] | null;
  detail: FoundationDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

export const extractId = ( uri: string ): string => uri.split( ':' )[ 1 ];

class Foundation extends React.Component<Props>
{
  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps: Props )
  {
    if ( prevProps.id !== this.props.id ||
         prevProps.site !== this.props.site ||
         ( !prevProps.authenticated && this.props.authenticated ) ||
         ( prevProps.list !== null && this.props.list === null ) ||
         ( prevProps.detail !== null && this.props.detail === null ) )
    {
      this.update( this.props );
    }
  }

  update( props: Props )
  {
    if( props.id !== undefined )
    {
      props.dispatch( fetchFoundation( props.id ) );
    }
    else
    {
      props.dispatch( fetchFoundationList( props.site ) );
    }
  }

  renderDetail( detail: FoundationDetail )
  {
    const { foundation: f, interface_list, dependencies } = detail;
    return (
      <Box>
        <ConfigDialog getConfig={ () => contractor.Building_Foundation_call_getConfig( this.props.id! ) } />
        <Table size="small" sx={{ mt: 1 }}>
          <TableBody>
            <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + f.site?.toString() }>{ f.site?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Locator</TableCell><TableCell>{ f.locator }</TableCell></TableRow>
            <TableRow><TableCell variant="head">State</TableCell><TableCell>{ f.state }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ f.type }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Blueprint</TableCell><TableCell><Link component={ RouterLink } to={ '/blueprint/f/' + f.blueprint?.toString() }>{ f.blueprint?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Id Map</TableCell><TableCell>{ JSON.stringify( f.id_map ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Class List</TableCell><TableCell>{ f.class_list }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( f.created ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( f.updated ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Located At</TableCell><TableCell>{ dateStr( f.located_at ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ dateStr( f.built_at ) }</TableCell></TableRow>
          </TableBody>
        </Table>
        <Typography variant="h6" sx={{ mt: 2 }}>Interfaces</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Physical Location</TableCell>
              <TableCell>Provisioning</TableCell>
              <TableCell>MAC</TableCell>
              <TableCell>PXE</TableCell>
              <TableCell>Network</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( interface_list || [] ).map( ( item: any, index: number ) => (
              <TableRow key={ index }>
                <TableCell>{ item.name }</TableCell>
                <TableCell>{ item.physical_location }</TableCell>
                <TableCell>{ item.is_provisioning ? 'Yes' : 'No' }</TableCell>
                <TableCell>{ item.mac }</TableCell>
                <TableCell>{ item.pxe ? <Link component={ RouterLink } to={ '/pxe/' + extractId( item.pxe ) }>{ extractId( item.pxe ) }</Link> : '' }</TableCell>
                <TableCell>{ item.network ? <Link component={ RouterLink } to={ '/network/' + extractId( item.network ) }>{ extractId( item.network ) }</Link> : '' }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        <Typography variant="h6" sx={{ mt: 2 }}>Depends on</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Id</TableCell>
              <TableCell>Foundation</TableCell>
              <TableCell>Structure</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( dependencies || [] ).map( ( dep ) => (
              <TableRow key={ dep.id }>
                <TableCell><Link component={ RouterLink } to={ '/dependency/' + dep.id }>{ dep.id }</Link></TableCell>
                <TableCell>{ dep.foundation?.toString() }</TableCell>
                <TableCell>{ dep.structure?.toString() }</TableCell>
                <TableCell>{ dep.state }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
      </Box>
    );
  }

  render()
  {
    if ( this.props.loading ) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if ( this.props.error ) return <Alert severity="error">{ this.props.error }</Alert>;
    if( this.props.id !== undefined )
    {
      return (
        <Box>
          <Link component={ RouterLink } to="/foundations">&larr; Foundations</Link>
          <Typography variant="h5" gutterBottom>Foundation Detail</Typography>
          { this.props.detail !== null && this.renderDetail( this.props.detail! ) }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">Id</TableCell>
            <TableCell>Locator</TableCell>
            <TableCell>Site</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/foundation/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.locator }</TableCell>
              <TableCell><Link component={ RouterLink } to={ '/site/' + item.site }>{ item.site }</Link></TableCell>
              <TableCell>{ item.type }</TableCell>
              <TableCell><Chip size="small" label={ item.state } color={ stateColor( item.state ) } /></TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

const mapStateToProps = ( state: RootState ) => ( {
  list: state.foundations.list,
  detail: state.foundations.detail,
  authenticated: state.app.authenticated,
  loading: state.foundations.loading,
  error: state.foundations.error,
} );

export default connect( mapStateToProps )( Foundation );
