import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class AddressBlock extends React.Component
{
  state = {
      addressBlock_list: [],
      addressBlock: null,
      addressBlockAddress_list: []
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { addressBlock_list: [], addressBlock: null } );
      this.update( this.props );
    }
  }

  update( props )
  {
    if( props.id !== undefined )
    {
      props.detailGet( props.id )
       .then( ( result ) =>
        {
          var data = result.data;
          data.site = CInP.extractIds( data.site )[0];
          this.setState( { addressBlock: data } );
        } );

      props.addressListGetter( props.id )
        .then( ( result ) =>
        {
          var addressBlockAddress_list = [];
          for( var id in result )
          {
            var address = result[ id ];
            addressBlockAddress_list.push( { id: id,
                                             type: address.type,
                                             ip_address: address.ip_address,
                                             offset: address.offset,
                                             reason: address.reason, // ReservedAddress
                                             networked: address.networked, // Address
                                             created: address.created,
                                             updated: address.updated
                                           } );
          }
          this.setState( { addressBlockAddress_list: addressBlockAddress_list } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var addressBlock_list = [];
          for ( var id in result.data )
          {
            var addressBlock = result.data[ id ];
            id = CInP.extractIds( id )[0];
            addressBlock_list.push( { id: id,
                                    name: addressBlock.name,
                                    subnet: addressBlock.subnet,
                                    prefix: addressBlock.prefix,
                                    created: addressBlock.created,
                                    updated: addressBlock.updated
                                  } );
          }

          this.setState( { addressBlock_list: addressBlock_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var addressBlock = this.state.addressBlock;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Address Block Detail</Typography>
          { addressBlock !== null &&
            <Box>
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ addressBlock.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + addressBlock.site }>{ addressBlock.site }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Subnet</TableCell><TableCell>{ addressBlock.subnet }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Prefix</TableCell><TableCell>{ addressBlock.prefix }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Gateway</TableCell><TableCell>{ addressBlock.gateway }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Netmask</TableCell><TableCell>{ addressBlock.netmask }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Size (Number of Ips)</TableCell><TableCell>{ addressBlock.size }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">IsIPv4</TableCell><TableCell>{ addressBlock.isIpV4 }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Max Address</TableCell><TableCell>{ addressBlock._max_address }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ addressBlock.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ addressBlock.updated }</TableCell></TableRow>
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
                  { this.state.addressBlockAddress_list.map( ( item ) => (
                    <TableRow key={ item.id }>
                      <TableCell align="right">{ item.id }</TableCell>
                      <TableCell>{ item.type }</TableCell>
                      <TableCell>{ item.ip_address }</TableCell>
                      <TableCell>{ item.offset }</TableCell>
                      <TableCell>{ item.reason } { item.networked }</TableCell>
                      <TableCell>{ item.created }</TableCell>
                      <TableCell>{ item.updated }</TableCell>
                    </TableRow>
                  ) ) }
                </TableBody>
              </Table>
            </Box>
          }
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
          { this.state.addressBlock_list.map( ( item ) => (
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

export default AddressBlock;
