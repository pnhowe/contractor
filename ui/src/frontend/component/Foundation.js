import React from 'react';
import CInP from './cinp';
import ConfigDialog from './ConfigDialog';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Foundation extends React.Component
{
  state = {
      foundation_list: [],
      foundation: null,
      interface_list: [],
      foundationDependency_list: []
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { foundation_list: [], foundation: null, interface_list: [], foundationDependency_list: [] } );
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
          this.setState( { foundation: data } );
        } );
      props.getFoundationInterfaces( props.id )
       .then( ( result ) =>
        {
          this.setState( { interface_list: result.data } );
        } );
      props.detailGetDependancies( props.id )
        .then( ( result ) =>
        {
          var dependency_list = [];
          for ( var id in result.data )
          {
            var dependency = result.data[ id ];
            dependency_list.push( { id: CInP.extractIds( id )[0],
                                    foundation: CInP.extractIds( dependency.foundation )[0],
                                    structure: CInP.extractIds( dependency.structure )[0],
                                    state: dependency.state,
                                  } );
          }
          this.setState( { foundationDependency_list: dependency_list } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var foundation_list = [];
          for ( var id in result.data )
          {
            var foundation = result.data[ id ];
            id = CInP.extractIds( id )[0];
            foundation_list.push( { id: id,
                                    locator: foundation.locator,
                                    type: foundation.type,
                                    state: foundation.state,
                                    created: foundation.created,
                                    updated: foundation.updated,
                                  } );
          }

          this.setState( { foundation_list: foundation_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var foundation = this.state.foundation;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Foundation Detail</Typography>
          { foundation !== null &&
            <Box>
              <ConfigDialog getConfig={ this.props.getConfig } uri={ '/api/v1/Building/Foundation:' + this.props.id + ':' } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + foundation.site }>{ foundation.site }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Locator</TableCell><TableCell>{ foundation.locator }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">State</TableCell><TableCell>{ foundation.state }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ foundation.type }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Plot</TableCell><TableCell>{ foundation.plot }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Blueprint</TableCell><TableCell><Link component={ RouterLink } to={ '/blueprint/f/' + foundation.blueprint }>{ foundation.blueprint }</Link></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Id Map</TableCell><TableCell>{ JSON.stringify( foundation.id_map ) }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Interfaces</TableCell><TableCell><ul>{ this.state.interface_list.map( ( item, index ) => (
                    <li key={ index }>{ JSON.stringify( item ) }</li>
                  ) ) }</ul></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Class List</TableCell><TableCell>{ foundation.class_list }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ foundation.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ foundation.updated }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Located At</TableCell><TableCell>{ foundation.located_at }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ foundation.built_at }</TableCell></TableRow>
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
                  { this.state.foundationDependency_list.map( ( item ) => (
                    <TableRow key={ item.id }>
                      <TableCell><Link component={ RouterLink } to={ '/dependency/' + item.id }>{ item.id }</Link></TableCell>
                      <TableCell>{ item.foundation }</TableCell>
                      <TableCell>{ item.structure }</TableCell>
                      <TableCell>{ item.state }</TableCell>
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
            <TableCell>Locator</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.foundation_list.map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/foundation/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.locator }</TableCell>
              <TableCell>{ item.type }</TableCell>
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

export default Foundation;
