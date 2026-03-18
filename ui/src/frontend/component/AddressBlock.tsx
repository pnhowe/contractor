import React from 'react';
import { connect } from 'react-redux';
import { fetchAddressBlockList, fetchAddressBlock } from '../store/addressBlocksSlice';
import type { AddressBlockListItem, AddressBlockDetail } from '../store/addressBlocksSlice';
import { Alert, Box, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { dateStr } from '../lib/utils';

interface OwnProps {
  id?: string;
  site?: string;
}

interface StateProps {
  list: AddressBlockListItem[] | null;
  detail: AddressBlockDetail | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

type Props = OwnProps & StateProps & { dispatch: AppDispatch };

class AddressBlock extends React.Component<Props>
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
      props.dispatch( fetchAddressBlock( props.id ) );
    }
    else
    {
      props.dispatch( fetchAddressBlockList( props.site ) );
    }
  }

  renderDetail( detail: AddressBlockDetail )
  {
    const { addressBlock: ab, addresses, reserved, dynamic } = detail;
    return (
      <Box>
        <Table size="small" sx={{ mt: 1 }}>
          <TableBody>
            <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ ab.name }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + ab.site?.toString() }>{ ab.site?.toString() }</Link></TableCell></TableRow>
            <TableRow><TableCell variant="head">Subnet</TableCell><TableCell>{ ab.subnet }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Prefix</TableCell><TableCell>{ ab.prefix }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Gateway</TableCell><TableCell>{ ab.gateway }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Netmask</TableCell><TableCell>{ ab.netmask }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Size (Number of Ips)</TableCell><TableCell>{ ab.size }</TableCell></TableRow>
            <TableRow><TableCell variant="head">IsIPv4</TableCell><TableCell>{ ab.isIpV4 }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Max Address</TableCell><TableCell>{ ab._max_address }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dateStr( ab.created ) }</TableCell></TableRow>
            <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dateStr( ab.updated ) }</TableCell></TableRow>
          </TableBody>
        </Table>
        <Typography variant="h6" sx={{ mt: 2 }}>Address List</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">Id</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Ip Address</TableCell>
              <TableCell>Offset</TableCell>
              <TableCell>Reason/Networked</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { ( addresses || [] ).map( ( addr ) => (
              <TableRow key={ 'a-' + addr.id }>
                <TableCell align="right">{ addr.id }</TableCell>
                <TableCell>{ addr.type }</TableCell>
                <TableCell>{ addr.ip_address }</TableCell>
                <TableCell>{ addr.offset }</TableCell>
                <TableCell>{ addr.networked?.toString() }</TableCell>
                <TableCell>{ dateStr( addr.created ) }</TableCell>
                <TableCell>{ dateStr( addr.updated ) }</TableCell>
              </TableRow>
            ) ) }
            { ( reserved || [] ).map( ( addr ) => (
              <TableRow key={ 'r-' + addr.id }>
                <TableCell align="right">{ addr.id }</TableCell>
                <TableCell>{ addr.type }</TableCell>
                <TableCell>{ addr.ip_address }</TableCell>
                <TableCell>{ addr.offset }</TableCell>
                <TableCell>{ addr.reason }</TableCell>
                <TableCell>{ dateStr( addr.created ) }</TableCell>
                <TableCell>{ dateStr( addr.updated ) }</TableCell>
              </TableRow>
            ) ) }
            { ( dynamic || [] ).map( ( addr ) => (
              <TableRow key={ 'd-' + addr.id }>
                <TableCell align="right">{ addr.id }</TableCell>
                <TableCell>{ addr.type }</TableCell>
                <TableCell>{ addr.ip_address }</TableCell>
                <TableCell>{ addr.offset }</TableCell>
                <TableCell></TableCell>
                <TableCell>{ dateStr( addr.created ) }</TableCell>
                <TableCell>{ dateStr( addr.updated ) }</TableCell>
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
          <Link component={ RouterLink } to="/addressblocks">&larr; Address Blocks</Link>
          <Typography variant="h5" gutterBottom>Address Block Detail</Typography>
          { this.props.detail !== null && this.renderDetail( this.props.detail! ) }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">Id</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Subnet</TableCell>
            <TableCell>Prefix</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ( this.props.list || [] ).map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/addressblock/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.name }</TableCell>
              <TableCell>{ item.subnet }</TableCell>
              <TableCell>{ item.prefix }</TableCell>
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
  list: state.addressBlocks.list,
  detail: state.addressBlocks.detail,
  authenticated: state.app.authenticated,
  loading: state.addressBlocks.loading,
  error: state.addressBlocks.error,
} );

export default connect( mapStateToProps )( AddressBlock );
