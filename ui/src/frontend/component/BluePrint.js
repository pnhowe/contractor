import React from 'react';
import CInP from './cinp';
import ConfigDialog from './ConfigDialog';
import ScriptDialog from './ScriptDialog';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class BluePrint extends React.Component
{
  state = {
      blueprintF_list: [],
      blueprintS_list: [],
      blueprint: null
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id )
    {
      this.setState( { blueprintF_list: [], blueprintS_list: [], blueprint: null } );
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
          data.parent_list = data.parent_list.map( ( parent ) =>
          {
            if ( parent.startsWith( '/api/v1/BluePrint/StructureBluePrint' ) )
            {
              return 's/' + CInP.extractIds( parent )[0];
            }
            else if ( parent.startsWith( '/api/v1/BluePrint/FoundationBluePrint' ) )
            {
              return 'f/' + CInP.extractIds( parent )[0];
            }
          } );
          data.script_map = Object.keys( data.script_map ).map( ( key ) => ( [ key, CInP.extractIds( data.script_map[ key ] )[0] ] ) );
          data.config_values = Object.keys( data.config_values ).map( ( key ) => ( [ key, JSON.stringify( data.config_values[ key ] ) ] ) );
          this.setState( { blueprint: data } );
        } );
    }
    else
    {
      props.listGetF()
        .then( ( result ) =>
        {
          var blueprint_list = [];
          for ( var name in result.data )
          {
            var blueprint = result.data[ name ];
            name = CInP.extractIds( name )[0];
            blueprint_list.push( { name: name,
                              description: blueprint.description,
                              created: blueprint.created,
                              updated: blueprint.updated,
                            } );
          }

          this.setState( { blueprintF_list: blueprint_list } );
        } );
        props.listGetS()
          .then( ( result ) =>
          {
            var blueprint_list = [];
            for ( var name in result.data )
            {
              var blueprint = result.data[ name ];
              name = CInP.extractIds( name )[0];
              blueprint_list.push( { name: name,
                                description: blueprint.description,
                                created: blueprint.created,
                                updated: blueprint.updated,
                              } );
            }

            this.setState( { blueprintS_list: blueprint_list } );
          } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var blueprint = this.state.blueprint;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>BluePrint Detail</Typography>
          { blueprint !== null &&
            <Box>
              <ConfigDialog getConfig={ this.props.getConfig } uri={ '/api/v1/BluePrint/BluePrint:' + this.props.id + ':' } />
              <Table size="small" sx={{ mt: 1 }}>
                <TableBody>
                  <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ blueprint.name }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Parents</TableCell><TableCell><ul>{ blueprint.parent_list.map( ( parent, index ) => ( <li key={ index }><Link component={ RouterLink } to={ '/blueprint/' + parent }>{ parent }</Link></li> ) ) }</ul></TableCell></TableRow>
                  <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ blueprint.description }</TableCell></TableRow>
                  <TableRow>
                    <TableCell variant="head">Config Values</TableCell>
                    <TableCell>
                      <Table size="small">
                        <TableBody>
                          { blueprint.config_values.map( ( value ) => (
                            <TableRow key={ value[0] }>
                              <TableCell variant="head">{ value[0] }</TableCell>
                              <TableCell>{ value[1] }</TableCell>
                            </TableRow>
                          ) ) }
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell variant="head">Scripts</TableCell><TableCell><ul>{ blueprint.script_map.map( ( value ) => ( <li key={ value[0] } >{ value[0] } <ScriptDialog getScript={ this.props.getScript } id={ value[1] }/></li> ) ) }</ul></TableCell></TableRow>
                  { blueprint.foundation_blueprint_list !== undefined &&
                    <TableRow>
                      <TableCell variant="head">Foundation Blueprint</TableCell>
                      <TableCell><ul>
                        { blueprint.foundation_blueprint_list.map( ( item, index ) => ( <li key={ index }><Link component={ RouterLink } to={ '/blueprint/f/' + CInP.extractIds( item )[0] }>{ CInP.extractIds( item )[0] }</Link></li> ) ) }
                      </ul></TableCell>
                    </TableRow>
                  }
                  { blueprint.foundation_type_list !== undefined &&
                    <TableRow><TableCell variant="head">Type List</TableCell><TableCell>{ blueprint.foundation_type_list }</TableCell></TableRow>
                  }
                  { blueprint.template !== undefined &&
                    <TableRow><TableCell variant="head">Template</TableCell><TableCell>{ JSON.stringify( blueprint.template ) }</TableCell></TableRow>
                  }
                  { blueprint.physical_interface_names !== undefined &&
                    <TableRow><TableCell variant="head">Physical Interface Names</TableCell><TableCell>{ blueprint.physical_interface_names }</TableCell></TableRow>
                  }
                  <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ blueprint.created }</TableCell></TableRow>
                  <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ blueprint.updated }</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
          }
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h5" gutterBottom>Foundation BluePrints</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.blueprintF_list.map( ( item ) => (
              <TableRow key={ item.name }>
                <TableCell><Link component={ RouterLink } to={ '/blueprint/f/' + item.name }>{ item.name }</Link></TableCell>
                <TableCell>{ item.description }</TableCell>
                <TableCell>{ item.created }</TableCell>
                <TableCell>{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Structure BluePrints</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { this.state.blueprintS_list.map( ( item ) => (
              <TableRow key={ item.name }>
                <TableCell><Link component={ RouterLink } to={ '/blueprint/s/' + item.name }>{ item.name }</Link></TableCell>
                <TableCell>{ item.description }</TableCell>
                <TableCell>{ item.created }</TableCell>
                <TableCell>{ item.updated }</TableCell>
              </TableRow>
            ) ) }
          </TableBody>
        </Table>
      </Box>
    );

  }
};

export default BluePrint;
