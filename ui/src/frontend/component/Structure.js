import React from 'react';
import CInP from './cinp';
import ConfigDialog from './ConfigDialog';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Structure extends React.Component
{
  state = {
      structure_list: [],
      structure: null,
      address_list: []
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { structure_list: [], structure: null } );
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
          data.blueprint = CInP.extractIds( data.blueprint )[0];
          data.foundation = CInP.extractIds( data.foundation )[0];
          data.config_values = Object.keys( data.config_values ).map( ( key ) => ( [ key, JSON.stringify( data.config_values[ key ] ) ] ) );
          this.setState( { structure: data } );

          props.getAddressList( props.id )
            .then( ( result ) =>
            {
              var address_list = [];
              for ( var id in result.data )
              {
                var address = result.data[ id ];
                id = CInP.extractIds( id )[0];
                address_list.push( { id: id,
                                        offset: address.offset,
                                        ip_address: address.ip_address,
                                        interface_name: address.interface_name,
                                        created: address.created,
                                        updated: address.updated,
                                      } );
              }

              this.setState( { address_list: address_list } );
            } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var structure_list = [];
          for ( var id in result.data )
          {
            var structure = result.data[ id ];
            id = CInP.extractIds( id )[0];
            structure_list.push( { id: id,
                                    hostname: structure.hostname,
                                    state: structure.state,
                                    created: structure.created,
                                    updated: structure.updated,
                                  } );
          }

          this.setState( { structure_list: structure_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var structure = this.state.structure;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Structure Detail</Typography>
          { structure !== null &&
            <Box>
              <ConfigDialog getConfig={ this.props.getConfig } uri={ '/api/v1/Building/Structure:' + this.props.id + ':' } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + structure.site }>{ structure.site }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + structure.foundation }>{ structure.foundation }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Hostname</TableCell><TableCell>{ structure.hostname }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">State</TableCell><TableCell>{ structure.state }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ structure.type }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Blueprint</TableCell><TableCell><Link component={ RouterLink } to={ '/blueprint/s/' + structure.blueprint }>{ structure.blueprint }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Config UUID</TableCell><TableCell>{ structure.config_uuid }</TableCell></TableRow>
                  <TableRow>
                    <TableCell variant="head">Config Values</TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          { structure.config_values.map( ( item, index ) => (
                            <TableRow key={ index }>
                              <TableCell variant="head">{ item[0] }</TableCell>
                              <TableCell>{ item[1] }</TableCell>
                            </TableRow>
                          ) ) }
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ structure.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ structure.updated }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ structure.built_at }</TableCell></TableRow>
                </TableBody>
              </Table>
              <Typography variant="h6" sx={{ mt: 2 }}>IP Addresses</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Offset</TableCell>
                    <TableCell>Ip Address</TableCell>
                    <TableCell>Interface</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  { this.state.address_list.map( ( item ) => (
                    <TableRow key={ item.id }>
                      <TableCell>{ item.offset }</TableCell>
                      <TableCell>{ item.ip_address }</TableCell>
                      <TableCell>{ item.interface_name }</TableCell>
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
            <TableCell>Hostname</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.structure_list.map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/structure/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.hostname }</TableCell>
              <TableCell>{ item.state }</TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

export default Structure;
