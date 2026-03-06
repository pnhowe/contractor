import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

class ConfigDialog extends React.Component
{
  state = {
      active: false,
      item_list: [],
  };

  show = () =>
  {
    this.props.getConfig( this.props.uri )
    .then( ( result ) =>
      {
        var item_list = [];

        for( var name in result.data )
        {
          item_list.push( { name: name, value: JSON.stringify( result.data[ name ] ) } );
        }
        this.setState( { active: true, item_list: item_list } );
      } );
  };

  close = () =>
  {
    this.setState( { active: false } );
  };

  render()
  {
    return (
      <Box>
        <Dialog open={ this.state.active } onClose={ this.close } maxWidth="lg">
          <DialogTitle>Full Config</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                { this.state.item_list.map( ( item, index ) => (
                  <TableRow key={ index }>
                    <TableCell>{ item.name }</TableCell>
                    <TableCell>{ item.value }</TableCell>
                  </TableRow>
                ) ) }
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={ this.close }>Close</Button>
          </DialogActions>
        </Dialog>
        <Button onClick={ this.show }>Display Full Config</Button>
      </Box>
);
  }
};

export default ConfigDialog;
