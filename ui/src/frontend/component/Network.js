import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Network extends React.Component
{
  state = {
      network_list: [],
      network: null,
      network_address_block_list: []
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { network_list: [], network: null } );
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
          data.address_block_list = data.address_block_list.map( ( item ) => { return CInP.extractIds( item )[0] } );
          this.setState( { network: data } );

          props.getNetworkAddressBlockList( props.id )
            .then( ( result ) =>
            {
              var network_address_block_list = [];
              for ( var id in result.data )
              {
                var nab = result.data[ id ];
                network_address_block_list.push( {
                                                  address_block: CInP.extractIds( nab.address_block )[0],
                                                  vlan: nab.vlan,
                                                  created: nab.created,
                                                  updated: nab.updated,
                                                } );
              }

              this.setState( { network_address_block_list: network_address_block_list } );
            } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var network_list = [];
          for ( var id in result.data )
          {
            var network = result.data[ id ];
            id = CInP.extractIds( id )[0];
            network_list.push( {  id: id,
                              name: network.name,
                              created: network.created,
                              updated: network.updated,
                            } );
          }

          this.setState( { network_list: network_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var network = this.state.network;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Network Detail</Typography>
          { network !== null &&
            <Box>
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + network.site }>{ network.site }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ network.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">MTU</TableCell><TableCell>{ network.mtu }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Address Blocks</TableCell><TableCell>{ network.address_block_list.map( ( id ) => ( <Link key={ id } component={ RouterLink } to={ '/addressblock/' + id }>{ id }</Link> ) ) }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ network.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ network.updated }</TableCell></TableRow>
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
                  { this.state.network_address_block_list.map( ( item ) => (
                    <TableRow key={ item.address_block }>
                      <TableCell><Link component={ RouterLink } to={ '/addressblock/' + item.address_block }>{ item.address_block }</Link></TableCell>
                      <TableCell>{ item.vlan }</TableCell>
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
            <TableCell>Id</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.network_list.map( ( item ) => (
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

export default Network;
