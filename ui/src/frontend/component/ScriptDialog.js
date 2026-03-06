import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableRow } from '@mui/material';

class ScriptDialog extends React.Component
{
  state = {
      active: false,
      script: { name: '', description: '', script_lines: [] },
  };

  show = () =>
  {
    this.props.getScript( this.props.id )
    .then( ( result ) =>
      {
        var script = {};

        script.name = result.data.name;
        script.description = result.data.description;
        script.script_lines = result.data.script.split( /[\r\n]/ );

        this.setState( { active: true, script: script } );
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
          <DialogTitle>Script</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableBody>
                <TableRow><TableCell variant="head">Name</TableCell><TableCell>{ this.state.script.name }</TableCell></TableRow>
                <TableRow><TableCell variant="head">Description</TableCell><TableCell>{ this.state.script.description }</TableCell></TableRow>
                { this.state.script.script_lines.map( ( item, index ) => (
                  <TableRow key={ index }><TableCell>{ index }</TableCell><TableCell><pre>{ item }</pre></TableCell></TableRow>
                ) ) }
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={ this.close }>Close</Button>
          </DialogActions>
        </Dialog>
        <Button onClick={ this.show }>Display</Button>
      </Box>
);
  }
};

export default ScriptDialog;
