import React from 'react';
import { connect } from 'react-redux';
import { fetchNetworkList, fetchNetwork } from '../store/networksSlice';
import type { NetworkListItem, NetworkDetail } from '../store/networksSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: NetworkListItem[] | null;
  detail: NetworkDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class Network extends React.Component<Props>
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
      props.dispatch( fetchNetwork( props.id ) );
    }
    else
    {
      props.dispatch( fetchNetworkList( props.site ) );
    }
  }

  renderDetail( detail: NetworkDetail )
  {
    const { network: n, networkAddressBlocks } = detail;
    return (
      <Box>
        <Table size="small" sx={{ mt: 1 }}>
          <TableBody>
            <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + n.site?.toString() }>{ n.site?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ n.name }</TableCell></TableRow>
            <TableRow><TableCell variant="head">MTU</TableCell><TableCell>{ n.mtu }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( n.created ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( n.updated ) }</TableCell></TableRow>
          </TableBody>
        </Table>
        <Typography variant="h6" sx={{ mt: 2 }}>Address Blocks</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Address Block</TableCell>
              <TableCell>Vlan</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( networkAddressBlocks || [] ).map( ( nab ) => (
              <TableRow key={ nab.id }>
                <TableCell><Link component={ RouterLink } to={ '/addressblock/' + nab.address_block?.toString() }>{ nab.address_block?.toString() }</Link></TableCell>
                <TableCell>{ nab.vlan }</TableCell>
                <TableCell>{ dateStr( nab.created ) }</TableCell>
                <TableCell>{ dateStr( nab.updated ) }</TableCell>
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
          <Link component={ RouterLink } to="/networks">&larr; Networks</Link>
          <Typography variant="h5" gutterBottom>Network Detail</Typography>
          { this.props.detail !== null && this.renderDetail( this.props.detail! ) }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Id</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/network/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.name }</TableCell>
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
  list: state.networks.list,
  detail: state.networks.detail,
  authenticated: state.app.authenticated,
  loading: state.networks.loading,
  error: state.networks.error,
} );

export default connect( mapStateToProps )( Network );
