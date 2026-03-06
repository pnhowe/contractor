import React from 'react';
import CInP from './cinp';
import { Link, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

class Cartographer extends React.Component
{
  state = {
      cartographer_list: []
  };

  componentDidMount()
  {
    this.update( this.props );
  }

  update( props )
  {
    props.listGet()
      .then( ( result ) =>
      {
        var cartographer_list = [];
        for ( var id in result.data )
        {
          var cartographer = result.data[ id ];
          id = CInP.extractIds( id )[0];
          cartographer_list.push( { id: id,
                            identifier: cartographer.identifier,
                            message: cartographer.message,
                            foundation: CInP.extractIds( cartographer.foundation )[0],
                            last_checkin: cartographer.last_checkin,
                            created: cartographer.created,
                            updated: cartographer.updated
                          } );
        }

        this.setState( { cartographer_list: cartographer_list } );
      } );
  }

  render()
  {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Identifier</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Foundation</TableCell>
            <TableCell>Last Checkin</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { this.state.cartographer_list.map( ( item ) => (
            <TableRow key={ item.id } >
              <TableCell>{ item.identifier }</TableCell>
              <TableCell>{ item.message }</TableCell>
              <TableCell><Link component={ RouterLink } to={ '/plot/' + item.foundation }>{ item.foundation }</Link></TableCell>
              <TableCell>{ item.last_checkin }</TableCell>
              <TableCell>{ item.created }</TableCell>
              <TableCell>{ item.updated }</TableCell>
            </TableRow>
          ) ) }
        </TableBody>
      </Table>
    );

  }
};

export default Cartographer;
