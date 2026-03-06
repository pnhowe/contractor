import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Dependency extends React.Component
{
  state = {
      dependency_list: [],
      dependency: null,
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { dependency_list: [], dependency: null } );
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
          data.structure = CInP.extractIds( data.structure )[0];
          data.dependency = CInP.extractIds( data.dependency )[0];
          data.foundation = CInP.extractIds( data.foundation )[0];
          data.script_structure = CInP.extractIds( data.script_structure )[0];
          this.setState( { dependency: data } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var dependency_list = [];
          for ( var id in result.data )
          {
            var dependency = result.data[ id ];
            id = CInP.extractIds( id )[0];
            dependency_list.push( { id: id,
                                    foundation: dependency.foundation,
                                    structure: dependency.structure,
                                    script_name: dependency.script_name,
                                    state: dependency.state,
                                    created: dependency.created,
                                    updated: dependency.updated,
                                  } );
          }

          this.setState( { dependency_list: dependency_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var dependency = this.state.dependency;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Dependency Detail</Typography>
          { dependency !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + dependency.structure }>{ dependency.structure }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Dependency</TableCell><TableCell><Link component={ RouterLink } to={ '/dependency/' + dependency.dependency }>{ dependency.dependency }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Foundation</TableCell><TableCell><Link component={ RouterLink } to={ '/foundation/' + dependency.foundation }>{ dependency.foundation }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Script Structure</TableCell><TableCell><Link component={ RouterLink } to={ '/structure/' + dependency.script_structure }>{ dependency.script_structure }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Create Script Name</TableCell><TableCell>{ dependency.create_script_name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Destroy Script Name</TableCell><TableCell>{ dependency.destroy_script_name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">State</TableCell><TableCell>{ dependency.state }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Link</TableCell><TableCell>{ dependency.link }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ dependency.created }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ dependency.updated }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Built At</TableCell><TableCell>{ dependency.built_at }</TableCell></TableRow>
              </TableBody>
            </Table>
          }
        </Box>
      );
    }

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="right">Id</TableCell>
            <TableCell>Foundation</TableCell>
            <TableCell>Structure</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.dependency_list.map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/dependency/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.foundation }</TableCell>
              <TableCell>{ item.structure }</TableCell>
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

export default Dependency;
