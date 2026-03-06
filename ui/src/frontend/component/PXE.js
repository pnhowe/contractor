import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class PXE extends React.Component
{
  state = {
      pxe_list: [],
      pxe: null
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id )
    {
      this.setState( { pxe_list: [], pxe: null } );
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
          this.setState( { pxe: data } );
        } );
    }
    else
    {
      props.listGet()
        .then( ( result ) =>
        {
          var pxe_list = [];
          for ( var name in result.data )
          {
            var pxe = result.data[ name ];
            name = CInP.extractIds( name )[0];
            pxe_list.push( { name: name,
                              created: pxe.created,
                              updated: pxe.updated,
                            } );
          }

          this.setState( { pxe_list: pxe_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var pxe = this.state.pxe;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>PXE Detail</Typography>
          { pxe !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ pxe.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Boot Script</TableCell><TableCell><pre>{ pxe.boot_script }</pre></TableCell></TableRow>
                <TableRow><TableCell variant="head">Template</TableCell><TableCell><pre>{ pxe.template }</pre></TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ pxe.created }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ pxe.updated }</TableCell></TableRow>
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
            <TableCell>Name</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.pxe_list.map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/pxe/' + item.name }>{ item.name }</Link></TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

export default PXE;
