import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Complex extends React.Component
{
  state = {
      complex_list: [],
      complex: null
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id || prevProps.site !== this.props.site )
    {
      this.setState( { complex_list: [], complex: null } );
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
          this.setState( { complex: data } );
        } );
    }
    else
    {
      props.listGet( props.site )
        .then( ( result ) =>
        {
          var complex_list = [];
          for ( var id in result.data )
          {
            var complex = result.data[ id ];
            id = CInP.extractIds( id )[0];
            complex_list.push( { id: id,
                                    description: complex.description,
                                    type: complex.type,
                                    state: complex.state,
                                    created: complex.created,
                                    updated: complex.updated,
                                  } );
          }

          this.setState( { complex_list: complex_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var complex = this.state.complex;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Complex Detail</Typography>
          { complex !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Site</TableCell><TableCell><Link component={ RouterLink } to={ '/site/' + complex.site }>{ complex.site }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ complex.description }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ complex.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">State</TableCell><TableCell>{ complex.state }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Type</TableCell><TableCell>{ complex.type }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Members</TableCell><TableCell><ul>{ complex.members.map( ( item, index ) => (
                  <li key={ index }>{ item }</li>
                ) ) }</ul></TableCell></TableRow>
                <TableRow><TableCell variant="head">Built at Percentage</TableCell><TableCell>{ complex.built_percentage }%</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ complex.created }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ complex.updated }</TableCell></TableRow>
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
            <TableCell>Description</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>State</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.complex_list.map( ( item ) => (
            <TableRow key={ item.id }>
              <TableCell align="right"><Link component={ RouterLink } to={ '/complex/' + item.id }>{ item.id }</Link></TableCell>
              <TableCell>{ item.description }</TableCell>
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

export default Complex;
