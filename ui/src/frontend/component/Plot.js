import React from 'react';
import CInP from './cinp';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';


class Plot extends React.Component
{
  state = {
      plot_list: [],
      plot: null
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  componentDidUpdate( prevProps )
  {
    if ( prevProps.id !== this.props.id )
    {
      this.setState( { plot_list: [], plot: null } );
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
          data.parent = CInP.extractIds( data.parent )[0];
          this.setState( { plot: data } );
        } );
    }
    else
    {
      props.listGet()
        .then( ( result ) =>
        {
          var plot_list = [];
          for ( var name in result.data )
          {
            var plot = result.data[ name ];
            name = CInP.extractIds( name )[0];
            plot_list.push( { name: name,
                              created: plot.created,
                              updated: plot.updated,
                            } );
          }

          this.setState( { plot_list: plot_list } );
        } );
    }
  }

  render()
  {
    if( this.props.id !== undefined )
    {
      var plot = this.state.plot;
      return (
        <Box>
          <Typography variant="h5" gutterBottom>Plot Detail</Typography>
          { plot !== null &&
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ plot.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Parent</TableCell><TableCell><Link component={ RouterLink } to={ '/plot/' + plot.parent }>{ plot.parent }</Link></TableCell></TableRow>
                <TableRow><TableCell variant="head">Corners</TableCell><TableCell>{ plot.corners }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Created</TableCell><TableCell>{ plot.created }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Updated</TableCell><TableCell>{ plot.updated }</TableCell></TableRow>
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
          { this.state.plot_list.map( ( item ) => (
            <TableRow key={ item.name } >
              <TableCell><Link component={ RouterLink } to={ '/plot/' + item.name }>{ item.name }</Link></TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

export default Plot;
