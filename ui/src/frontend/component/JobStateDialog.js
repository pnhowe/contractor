import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

class JobStateDialog extends React.Component
{
  state = {
      active: false,
      variable_list: [],
  };

  show = () =>
  {
    this.props.getState( this.props.uri )
    .then( ( result ) =>
      {
        var variable_list = [];

        for( var name in result[0].data )
        {
          variable_list.push( { name: name, value: JSON.stringify( result[0].data[ name ] ) } );
        }

        var state = result[1].data;

        this.setState( { active: true, variable_list: variable_list, cur_line: state.cur_line, stack: JSON.stringify( state.state ), script: state.script } );
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
        <Dialog open={ this.state.active } onClose={ this.close }>
          <DialogTitle>Job State</DialogTitle>
          <DialogContent>
            <Box>
              <pre>{ this.state.script }</pre>
              <Typography>on line: <strong>{ this.state.cur_line }</strong></Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  { this.state.variable_list.map( ( item, index ) => (
                    <TableRow key={ index }>
                      <TableCell>{ item.name }</TableCell>
                      <TableCell>{ item.value }</TableCell>
                    </TableRow>
                  ) ) }
                </TableBody>
              </Table>
              <Typography>{ this.state.stack }</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={ this.close }>Close</Button>
          </DialogActions>
        </Dialog>
        <Button onClick={ this.show }>Display Internal Job Info</Button>
      </Box>
);
  }
};

export default JobStateDialog;
